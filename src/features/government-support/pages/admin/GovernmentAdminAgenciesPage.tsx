import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { FormDialog } from '../../../../components/dialog'
import { EmptyState, LoadingState, StatusMessage } from '../../../../components/feedback'
import { FieldWrapper, FormButton, FormInput } from '../../../../components/form'
import { copyTextToClipboard } from '../../../../lib/clipboard'
import { useAuth } from '../../../auth/AuthProvider'
import GovernmentAdminPageShell from '../../components/GovernmentAdminPageShell'
import { createGovAgency, fetchGovAgencies } from '../../api/governmentProfilesApi'
import {
  buildGovernmentAgencyJoinPath,
  buildGovernmentAgencyJoinUrl,
} from '../../lib/governmentAgencyJoinUrl'
import type { GovAgencyRow } from '../../types/governmentProfile.types'
import '../../government-support.css'

type AgencyStatus = 'active' | 'blocked' | 'inactive'

const STATUS_LABEL: Record<AgencyStatus, string> = {
  active: '정상',
  blocked: '접근금지',
  inactive: '비활성',
}

function normalizeAgencyStatus(raw: string | undefined): AgencyStatus {
  const v = String(raw ?? '').toLowerCase()
  if (v === 'blocked' || v === 'inactive') {
    return v
  }
  return 'active'
}

function AgencyStatusBadge({ status }: { status: AgencyStatus }) {
  return (
    <span className={`admin-entity-status-badge admin-entity-status-badge--${status}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export default function GovernmentAdminAgenciesPage() {
  const { token } = useAuth()
  const [rows, setRows] = useState<GovAgencyRow[]>([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createCode, setCreateCode] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createErr, setCreateErr] = useState('')

  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [copyErr, setCopyErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token?.trim()) {
      return
    }
    setLoadError('')
    setLoading(true)
    try {
      setRows(await fetchGovAgencies(token))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [token])

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
      setCreateErr(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setCreateBusy(false)
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
              className="button button--secondary"
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
            className="button button--secondary"
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
      </article>
    )
  }

  return (
    <GovernmentAdminPageShell
      title="대행사 관리"
      description={loadError || '대행사(수행기관)를 등록하고 가입 링크를 발급할 수 있습니다.'}
      toolbar={
        <>
          <FormButton
            htmlType="button"
            variant="primary"
            className="button button--primary"
            onClick={() => {
              setCreateErr('')
              setCreateOpen(true)
            }}
            disabled={loading}
          >
            대행사 등록
          </FormButton>
          {loading ? <LoadingState message="불러오는 중…" className="m-0 text-sm text-[var(--text-sub)]" /> : null}
        </>
      }
    >
      {copyErr || copyMsg ? (
        <div className="admin-ga-management__alerts">
          <StatusMessage message={copyErr} tone="error" className="m-0" />
          {copyMsg ? <p className="status admin-ga-management__status-success m-0">{copyMsg}</p> : null}
        </div>
      ) : null}

      <div className="table-container table-container--desktop">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>대행사명</th>
              <th>기관 코드</th>
              <th>상태</th>
              <th className="admin-table-cell--actions">가입 링크</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="admin-data-table__empty-cell">
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
        {rows.length === 0 && !loading ? (
          <EmptyState message="등록된 대행사가 없습니다." className="m-0 px-1 py-2 text-[var(--text-sub)]" />
        ) : (
          rows.map((r) => renderAgencyCard(r))
        )}
      </div>

      {createOpen ? (
        <FormDialog
          open={createOpen}
          onClose={() => {
            if (!createBusy) {
              setCreateOpen(false)
            }
          }}
          title="대행사 등록"
          panelClassName="admin-modal-panel"
          overlayClassName="admin-modal-backdrop"
          closeOnBackdrop={!createBusy}
          closeOnEsc={!createBusy}
        >
          <form className="admin-modal-content" onSubmit={submitCreate}>
            <StatusMessage message={createErr} tone="error" className="m-0" />
            <FieldWrapper label="대행사명" className="admin-modal-field">
              <FormInput
                className="admin-form-input"
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
                className="admin-form-input"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                placeholder="영문 대문자·숫자 3자 이상"
                required
                disabled={createBusy}
                autoComplete="off"
              />
            </FieldWrapper>
            <div className="admin-modal-actions">
              <FormButton
                htmlType="button"
                variant="secondary"
                className="button button--secondary"
                disabled={createBusy}
                onClick={() => setCreateOpen(false)}
              >
                취소
              </FormButton>
              <FormButton
                htmlType="submit"
                variant="primary"
                className="button button--primary"
                loading={createBusy}
                loadingText="저장 중…"
              >
                저장
              </FormButton>
            </div>
          </form>
        </FormDialog>
      ) : null}
    </GovernmentAdminPageShell>
  )
}
