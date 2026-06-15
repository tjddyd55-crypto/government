import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { FormDialog } from '../../../../components/dialog'
import { EmptyState, LoadingState, StatusMessage } from '../../../../components/feedback'
import { FieldWrapper, FormButton, FormInput, FormSelect, FormTextarea } from '../../../../components/form'
import { copyTextToClipboard } from '../../../../lib/clipboard'
import { useAuth } from '../../../auth/AuthProvider'
import GovernmentAdminModalFooter from '../../components/GovernmentAdminModalFooter'
import GovernmentAdminPageShell from '../../components/GovernmentAdminPageShell'
import {
  archiveGovAgency,
  createGovAgency,
  fetchGovAgencies,
  patchGovAgency,
} from '../../api/governmentProfilesApi'
import {
  buildGovernmentAgencyJoinPath,
  buildGovernmentAgencyJoinUrl,
} from '../../lib/governmentAgencyJoinUrl'
import { mapGovernmentAdminApiError } from '../../lib/mapGovernmentAdminApiError'
import type { GovAgencyRow } from '../../types/governmentProfile.types'
import '../../government-support.css'

type AgencyStatus = 'active' | 'blocked' | 'inactive'

const STATUS_LABEL: Record<AgencyStatus, string> = {
  active: '정상',
  blocked: '접근금지',
  inactive: '비활성',
}

const STATUS_OPTIONS: { value: AgencyStatus; label: string }[] = [
  { value: 'active', label: '정상' },
  { value: 'blocked', label: '접근금지' },
  { value: 'inactive', label: '비활성' },
]

function normalizeAgencyStatus(raw: string | undefined): AgencyStatus {
  const v = String(raw ?? '').toLowerCase()
  if (v === 'blocked' || v === 'inactive') {
    return v
  }
  return 'active'
}

function isSesungAgency(row: GovAgencyRow): boolean {
  return /세승/.test(row.name) || /세승/.test(row.agencyCode)
}

function AgencyStatusBadge({ status }: { status: AgencyStatus }) {
  return (
    <span className={`admin-entity-status-badge admin-entity-status-badge--${status}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function openEditFormFromRow(row: GovAgencyRow) {
  return {
    id: row.id,
    agencyCode: row.agencyCode,
    name: row.name,
    status: normalizeAgencyStatus(row.status),
    representativeName: row.representativeName ?? '',
    contactPhone: row.contactPhone ?? '',
    businessNumber: row.businessNumber ?? '',
    address: row.address ?? '',
    memo: row.memo ?? '',
    registrationCodeEnabled: row.registrationCodeEnabled !== false,
  }
}

type EditFormState = ReturnType<typeof openEditFormFromRow>

export default function GovernmentAdminAgenciesPage() {
  const { token } = useAuth()
  const [rows, setRows] = useState<GovAgencyRow[]>([])
  const [includeArchived, setIncludeArchived] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createCode, setCreateCode] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createErr, setCreateErr] = useState('')

  const [editing, setEditing] = useState<EditFormState | null>(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState('')

  const [archiveTarget, setArchiveTarget] = useState<GovAgencyRow | null>(null)
  const [archiveConfirmName, setArchiveConfirmName] = useState('')
  const [archiveBusy, setArchiveBusy] = useState(false)
  const [archiveErr, setArchiveErr] = useState('')

  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [copyErr, setCopyErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token?.trim()) {
      return
    }
    setLoadError('')
    setLoading(true)
    try {
      setRows(await fetchGovAgencies(token, { includeArchived }))
    } catch (e) {
      setLoadError(mapGovernmentAdminApiError(e, '목록을 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }, [includeArchived, token])

  useEffect(() => {
    void load()
  }, [load])

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!token?.trim()) {
      return
    }
    setCreateErr('')
    setCreateBusy(true)
    try {
      await createGovAgency(token, {
        name: createName.trim(),
        agencyCode: createCode.trim().toUpperCase(),
      })
      setCreateName('')
      setCreateCode('')
      setCreateOpen(false)
      await load()
    } catch (err) {
      setCreateErr(mapGovernmentAdminApiError(err, '저장에 실패했습니다.'))
    } finally {
      setCreateBusy(false)
    }
  }

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token?.trim() || !editing) {
      return
    }
    setEditErr('')
    setEditBusy(true)
    try {
      await patchGovAgency(token, editing.id, {
        name: editing.name.trim(),
        status: editing.status,
        representativeName: editing.representativeName.trim(),
        contactPhone: editing.contactPhone.trim(),
        businessNumber: editing.businessNumber.trim(),
        address: editing.address.trim(),
        memo: editing.memo.trim(),
        registrationCodeEnabled: editing.registrationCodeEnabled,
      })
      setEditing(null)
      await load()
    } catch (err) {
      setEditErr(mapGovernmentAdminApiError(err, '저장에 실패했습니다.'))
    } finally {
      setEditBusy(false)
    }
  }

  const submitArchive = async (e: FormEvent) => {
    e.preventDefault()
    if (!token?.trim() || !archiveTarget) {
      return
    }
    if (archiveConfirmName.trim() !== archiveTarget.name.trim()) {
      setArchiveErr('대행사명이 일치하지 않습니다.')
      return
    }
    setArchiveErr('')
    setArchiveBusy(true)
    try {
      await archiveGovAgency(token, archiveTarget.id)
      setArchiveTarget(null)
      setArchiveConfirmName('')
      await load()
    } catch (err) {
      setArchiveErr(mapGovernmentAdminApiError(err, '보관에 실패했습니다.'))
    } finally {
      setArchiveBusy(false)
    }
  }

  const onCopyJoinLink = async (agencyCode: string) => {
    setCopyMsg(null)
    setCopyErr(null)
    try {
      await copyTextToClipboard(buildGovernmentAgencyJoinUrl(agencyCode))
      setCopyMsg('가입 링크를 복사했습니다.')
    } catch {
      setCopyErr('링크 복사에 실패했습니다.')
    }
  }

  const canArchiveRow = (row: GovAgencyRow) =>
    normalizeAgencyStatus(row.status) !== 'inactive' && !isSesungAgency(row)

  const renderAgencyRow = (r: GovAgencyRow) => {
    const st = normalizeAgencyStatus(r.status)
    return (
      <tr key={r.id}>
        <td>{r.name}</td>
        <td>{r.agencyCode}</td>
        <td>
          <AgencyStatusBadge status={st} />
        </td>
        <td className="admin-table-cell--actions">
          <div className="admin-table-actions government-agency-join-cell">
            <span className="government-agency-join-cell__path">{buildGovernmentAgencyJoinPath(r.agencyCode)}</span>
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary gov-btn--sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void onCopyJoinLink(r.agencyCode)
              }}
              disabled={loading}
            >
              링크 복사
            </FormButton>
          </div>
        </td>
        <td className="admin-table-cell--actions">
          <div className="admin-table-actions">
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary gov-btn--sm"
              onClick={() => {
                setEditErr('')
                setEditing(openEditFormFromRow(r))
              }}
              disabled={loading}
            >
              수정
            </FormButton>
            {canArchiveRow(r) ? (
              <FormButton
                htmlType="button"
                variant="danger"
                className="gov-btn gov-btn--danger gov-btn--sm"
                onClick={() => {
                  setArchiveErr('')
                  setArchiveConfirmName('')
                  setArchiveTarget(r)
                }}
                disabled={loading}
              >
                삭제
              </FormButton>
            ) : null}
          </div>
        </td>
      </tr>
    )
  }

  const renderAgencyCard = (r: GovAgencyRow) => {
    const st = normalizeAgencyStatus(r.status)
    return (
      <article key={r.id} className="admin-ga-card">
        <div className="admin-ga-card__row">
          <span className="admin-ga-card__label">대행사명</span>
          <span className="admin-ga-card__value">{r.name}</span>
        </div>
        <div className="admin-ga-card__row">
          <span className="admin-ga-card__label">기관 코드</span>
          <span className="admin-ga-card__value">{r.agencyCode}</span>
        </div>
        <div className="admin-ga-card__row">
          <span className="admin-ga-card__label">상태</span>
          <span className="admin-ga-card__value">
            <AgencyStatusBadge status={st} />
          </span>
        </div>
        <div className="admin-ga-card__row">
          <span className="admin-ga-card__label">가입 경로</span>
          <span className="admin-ga-card__value government-agency-join-cell__path">
            {buildGovernmentAgencyJoinPath(r.agencyCode)}
          </span>
        </div>
        <p className="government-agency-join-card__hint">가입 링크를 복사해 이용자에게 전달하세요.</p>
        <div className="admin-ga-card__actions">
          <FormButton
            htmlType="button"
            variant="secondary"
            className="gov-btn gov-btn--secondary gov-btn--sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void onCopyJoinLink(r.agencyCode)
            }}
            disabled={loading}
          >
            링크 복사
          </FormButton>
          <FormButton
            htmlType="button"
            variant="secondary"
            className="gov-btn gov-btn--secondary gov-btn--sm"
            onClick={() => {
              setEditErr('')
              setEditing(openEditFormFromRow(r))
            }}
            disabled={loading}
          >
            수정
          </FormButton>
          {canArchiveRow(r) ? (
            <FormButton
              htmlType="button"
              variant="danger"
              className="gov-btn gov-btn--danger gov-btn--sm"
              onClick={() => {
                setArchiveErr('')
                setArchiveConfirmName('')
                setArchiveTarget(r)
              }}
              disabled={loading}
            >
              삭제
            </FormButton>
          ) : null}
        </div>
      </article>
    )
  }

  return (
    <GovernmentAdminPageShell
      title="대행사 관리"
      description="대행사(수행기관)를 등록하고 가입 링크를 발급할 수 있습니다."
      toolbar={
        <div className="government-admin-toolbar">
          <div className="government-admin-toolbar__filters">
            <label className="government-admin-toolbar__field government-admin-checkbox-field">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                disabled={loading}
              />
              <span>보관 포함</span>
            </label>
          </div>
          <div className="government-admin-toolbar__actions">
            <FormButton
              htmlType="button"
              variant="primary"
              className="gov-btn gov-btn--primary"
              onClick={() => {
                setCreateErr('')
                setCreateOpen(true)
              }}
              disabled={loading}
            >
              대행사 등록
            </FormButton>
          </div>
        </div>
      }
    >
      {loadError ? (
        <div className="gov-status-error-card admin-user-management__error-card" role="alert">
          {loadError}
        </div>
      ) : null}
      {copyErr || copyMsg ? (
        <div className="admin-ga-management__alerts">
          {copyErr ? (
            <div className="gov-status-error-card" role="alert">
              {copyErr}
            </div>
          ) : null}
          {copyMsg ? <p className="status admin-ga-management__status-success m-0">{copyMsg}</p> : null}
        </div>
      ) : null}

      {loading ? <LoadingState message="불러오는 중…" className="gov-status-loading" /> : null}

      {!loading ? (
        <>
          <div className="government-admin-table-wrap table-container table-container--desktop">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>대행사명</th>
                  <th>기관 코드</th>
                  <th>상태</th>
                  <th className="admin-table-cell--actions">가입 링크</th>
                  <th className="admin-table-cell--actions">관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-data-table__empty-cell">
                      등록된 대행사가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => renderAgencyRow(r))
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-responsive-card-list">
            {rows.length === 0 ? (
              <EmptyState message="등록된 대행사가 없습니다." className="gov-status-empty m-0" />
            ) : (
              rows.map((r) => renderAgencyCard(r))
            )}
          </div>
        </>
      ) : null}

      {createOpen ? (
        <FormDialog
          open={createOpen}
          onClose={() => {
            if (!createBusy) {
              setCreateOpen(false)
            }
          }}
          title="대행사 등록"
          panelClassName="government-admin-modal-panel"
          overlayClassName="government-admin-modal-backdrop"
          closeOnBackdrop={false}
          closeOnEsc={!createBusy}
        >
          <form className="government-admin-modal-body" onSubmit={submitCreate}>
            <StatusMessage message={createErr} tone="error" className="m-0 mb-3" />
            <FieldWrapper label="대행사명" className="admin-modal-field">
              <FormInput
                className="gov-form-control"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="예) 서울 정부지원센터"
                required
                disabled={createBusy}
                autoComplete="organization"
              />
            </FieldWrapper>
            <FieldWrapper label="기관 코드" className="admin-modal-field">
              <FormInput
                className="gov-form-control"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                placeholder="영문 대문자·숫자 3자 이상"
                required
                disabled={createBusy}
                autoComplete="off"
              />
            </FieldWrapper>
            <GovernmentAdminModalFooter>
              <FormButton
                htmlType="button"
                variant="secondary"
                className="gov-btn gov-btn--secondary"
                disabled={createBusy}
                onClick={() => setCreateOpen(false)}
              >
                취소
              </FormButton>
              <FormButton
                htmlType="submit"
                variant="primary"
                className="gov-btn gov-btn--primary"
                loading={createBusy}
                loadingText="저장 중…"
              >
                저장
              </FormButton>
            </GovernmentAdminModalFooter>
          </form>
        </FormDialog>
      ) : null}

      {editing ? (
        <FormDialog
          open
          onClose={() => {
            if (!editBusy) {
              setEditing(null)
            }
          }}
          title="대행사 수정"
          panelClassName="government-admin-modal-panel"
          overlayClassName="government-admin-modal-backdrop"
          closeOnBackdrop={false}
          closeOnEsc={!editBusy}
        >
          <form className="government-admin-modal-body" onSubmit={submitEdit}>
            <p className="admin-user-management__edit-context m-0 mb-3">
              기관 코드: <strong>{editing.agencyCode}</strong> (변경 불가)
            </p>
            <StatusMessage message={editErr} tone="error" className="m-0 mb-3" />
            <FieldWrapper label="대행사명" className="admin-modal-field">
              <FormInput
                className="gov-form-control"
                value={editing.name}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                required
                disabled={editBusy}
              />
            </FieldWrapper>
            <FieldWrapper label="대표자/담당자명" className="admin-modal-field">
              <FormInput
                className="gov-form-control"
                value={editing.representativeName}
                onChange={(e) =>
                  setEditing((prev) => (prev ? { ...prev, representativeName: e.target.value } : prev))
                }
                disabled={editBusy}
              />
            </FieldWrapper>
            <FieldWrapper label="연락처" className="admin-modal-field">
              <FormInput
                className="gov-form-control"
                value={editing.contactPhone}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, contactPhone: e.target.value } : prev))}
                disabled={editBusy}
              />
            </FieldWrapper>
            <FieldWrapper label="사업자등록번호" className="admin-modal-field">
              <FormInput
                className="gov-form-control"
                value={editing.businessNumber}
                onChange={(e) =>
                  setEditing((prev) => (prev ? { ...prev, businessNumber: e.target.value } : prev))
                }
                disabled={editBusy}
              />
            </FieldWrapper>
            <FieldWrapper label="주소" className="admin-modal-field">
              <FormInput
                className="gov-form-control"
                value={editing.address}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, address: e.target.value } : prev))}
                disabled={editBusy}
              />
            </FieldWrapper>
            <FieldWrapper label="메모" className="admin-modal-field">
              <FormTextarea
                className="gov-form-control"
                value={editing.memo}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, memo: e.target.value } : prev))}
                rows={3}
                disabled={editBusy}
              />
            </FieldWrapper>
            <FieldWrapper label="상태" className="admin-modal-field">
              <FormSelect
                className="gov-form-control"
                value={editing.status}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, status: normalizeAgencyStatus(e.target.value) } : prev,
                  )
                }
                disabled={editBusy}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FormSelect>
            </FieldWrapper>
            <FieldWrapper label="가입 코드" className="admin-modal-field">
              <label className="government-admin-checkbox-field">
                <input
                  type="checkbox"
                  checked={editing.registrationCodeEnabled}
                  onChange={(e) =>
                    setEditing((prev) =>
                      prev ? { ...prev, registrationCodeEnabled: e.target.checked } : prev,
                    )
                  }
                  disabled={editBusy}
                />
                <span>가입 코드 사용</span>
              </label>
            </FieldWrapper>
            <GovernmentAdminModalFooter>
              <FormButton
                htmlType="button"
                variant="secondary"
                className="gov-btn gov-btn--secondary"
                disabled={editBusy}
                onClick={() => setEditing(null)}
              >
                취소
              </FormButton>
              <FormButton
                htmlType="submit"
                variant="primary"
                className="gov-btn gov-btn--primary"
                loading={editBusy}
                loadingText="저장 중…"
              >
                저장
              </FormButton>
            </GovernmentAdminModalFooter>
          </form>
        </FormDialog>
      ) : null}

      {archiveTarget ? (
        <FormDialog
          open
          onClose={() => {
            if (!archiveBusy) {
              setArchiveTarget(null)
              setArchiveConfirmName('')
            }
          }}
          title="대행사 삭제"
          panelClassName="government-admin-modal-panel"
          overlayClassName="government-admin-modal-backdrop"
          closeOnBackdrop={false}
          closeOnEsc={!archiveBusy}
        >
          <form className="government-admin-modal-body" onSubmit={submitArchive}>
            <StatusMessage message={archiveErr} tone="error" className="m-0 mb-3" />
            <p className="m-0 mb-3">
              삭제하면 목록에서 숨겨지고 새 가입·운영에 사용할 수 없습니다. 기존 고객·신청·파일 데이터는
              보존됩니다.
            </p>
            <p className="admin-user-management__edit-context m-0 mb-3">
              대행사: <strong>{archiveTarget.name}</strong>
            </p>
            <FieldWrapper
              label="확인을 위해 대행사명을 입력하세요"
              className="admin-modal-field"
            >
              <FormInput
                className="gov-form-control"
                value={archiveConfirmName}
                onChange={(e) => setArchiveConfirmName(e.target.value)}
                placeholder={archiveTarget.name}
                disabled={archiveBusy}
                autoComplete="off"
              />
            </FieldWrapper>
            <GovernmentAdminModalFooter>
              <FormButton
                htmlType="button"
                variant="secondary"
                className="gov-btn gov-btn--secondary"
                disabled={archiveBusy}
                onClick={() => {
                  setArchiveTarget(null)
                  setArchiveConfirmName('')
                }}
              >
                취소
              </FormButton>
              <FormButton
                htmlType="submit"
                variant="danger"
                className="gov-btn gov-btn--danger"
                loading={archiveBusy}
                loadingText="삭제 중…"
                disabled={archiveConfirmName.trim() !== archiveTarget.name.trim()}
              >
                삭제
              </FormButton>
            </GovernmentAdminModalFooter>
          </form>
        </FormDialog>
      ) : null}
    </GovernmentAdminPageShell>
  )
}
