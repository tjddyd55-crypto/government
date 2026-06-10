import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormDialog, useConfirmDialog } from '../../../../components/dialog'
import { EmptyState, LoadingState, StatusMessage } from '../../../../components/feedback'
import { FieldWrapper, FormButton, FormInput, FormSelect, FormTextarea } from '../../../../components/form'
import { useAuth } from '../../../auth/AuthProvider'
import {
  archiveGovernmentNotice,
  createGovernmentNotice,
  fetchGovernmentNotices,
  updateGovernmentNotice,
  type GovernmentNoticeRow,
} from '../../api/governmentOperationsApi'
import { fetchGovAgencies } from '../../api/governmentProfilesApi'
import {
  GOVERNMENT_NOTICE_CATEGORIES,
  GOVERNMENT_NOTICE_STATUSES,
  formatOpsDate,
  labelForNoticeCategory,
  labelForStatus,
} from '../../constants/governmentOperations'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'
import { canManageGovernmentNotices } from '../../lib/governmentHome'
import { canManageGovernmentUsers } from '../../lib/governmentAccess'
import GovernmentAdminPageShell from '../../components/GovernmentAdminPageShell'
import type { GovAgencyRow } from '../../types/governmentProfile.types'

type NoticeForm = {
  title: string
  content: string
  category: string
  status: string
  scopeType: string
  tenantId: string
  isPinned: boolean
}

const EMPTY_FORM: NoticeForm = {
  title: '',
  content: '',
  category: 'general',
  status: 'draft',
  scopeType: 'agency',
  tenantId: '',
  isPinned: false,
}

export default function GovernmentAdminNoticesPage() {
  const { token } = useAuth()
  const { summary } = useGovernmentAccess(token)
  const { confirm, confirmDialog } = useConfirmDialog()
  const isAgencyAdmin = canManageGovernmentUsers(summary)
  const defaultTenantId =
    summary?.governmentAgencyAdminTenantIds[0] ??
    summary?.governmentStaffTenantIds[0] ??
    ''

  const [agencies, setAgencies] = useState<GovAgencyRow[]>([])
  const [rows, setRows] = useState<GovernmentNoticeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterQ, setFilterQ] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<NoticeForm>({ ...EMPTY_FORM, tenantId: defaultTenantId })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const agencyOptions = useMemo(
    () => agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.agencyCode})` })),
    [agencies],
  )

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setRows(
        await fetchGovernmentNotices(token, {
          managerView: true,
          status: filterStatus || undefined,
          category: filterCategory || undefined,
          q: filterQ.trim() || undefined,
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '공지 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [token, filterStatus, filterCategory, filterQ])

  useEffect(() => {
    if (!token || !isAgencyAdmin) return
    void fetchGovAgencies(token).then(setAgencies).catch(() => setAgencies([]))
  }, [token, isAgencyAdmin])

  useEffect(() => {
    void load()
  }, [load])

  if (!canManageGovernmentNotices(summary)) {
    return (
      <GovernmentAdminPageShell
        title="접근할 수 없습니다"
        description="공지/전달사항은 대행사 운영 계정만 이용할 수 있습니다."
      >
        <EmptyState message="권한이 없습니다." />
      </GovernmentAdminPageShell>
    )
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, tenantId: defaultTenantId })
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (row: GovernmentNoticeRow) => {
    setEditingId(row.id)
    setForm({
      title: row.title,
      content: row.content,
      category: row.category,
      status: row.status,
      scopeType: row.scopeType,
      tenantId: row.tenantId ?? defaultTenantId,
      isPinned: row.isPinned,
    })
    setFormError(null)
    setEditorOpen(true)
  }

  const submit = async () => {
    if (!token) return
    setSaving(true)
    setFormError(null)
    try {
      const body = {
        title: form.title.trim(),
        content: form.content,
        category: form.category,
        status: form.status,
        scopeType: 'agency',
        tenantId: form.tenantId || defaultTenantId,
        isPinned: form.isPinned,
      }
      if (editingId) {
        await updateGovernmentNotice(token, editingId, body)
      } else {
        await createGovernmentNotice(token, body)
      }
      setEditorOpen(false)
      await load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (row: GovernmentNoticeRow) => {
    if (!token) return
    const ok = await confirm({
      title: '공지 보관',
      message: `「${row.title}」 공지를 보관 처리하시겠습니까?`,
      tone: 'danger',
    })
    if (!ok) return
    await archiveGovernmentNotice(token, row.id)
    await load()
  }

  return (
    <GovernmentAdminPageShell
      title="공지/전달사항"
      description="소속 대행사 이용자에게 전달할 공지·안내를 관리합니다."
      toolbar={
        <>
          <FormButton htmlType="button" variant="primary" className="button button--primary" onClick={openCreate}>
            공지 작성
          </FormButton>
          <FieldWrapper label="검색">
            <FormInput value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="제목·내용" />
          </FieldWrapper>
          <FieldWrapper label="구분">
            <FormSelect
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              options={[{ value: '', label: '전체' }, ...GOVERNMENT_NOTICE_CATEGORIES]}
            />
          </FieldWrapper>
          <FieldWrapper label="상태">
            <FormSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[{ value: '', label: '전체' }, ...GOVERNMENT_NOTICE_STATUSES]}
            />
          </FieldWrapper>
        </>
      }
    >
      {error ? <StatusMessage message={error} tone="error" className="m-0 mb-3" /> : null}
      {loading ? <LoadingState message="불러오는 중…" /> : null}
      {!loading && rows.length === 0 ? <EmptyState message="등록된 공지가 없습니다." /> : null}

      {!loading && rows.length > 0 ? (
        <>
          <div className="table-container table-container--desktop table-wrap">
            <table className="admin-data-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>구분</th>
                <th>상태</th>
                <th>대행사</th>
                <th>작성자</th>
                <th>등록일</th>
                <th className="admin-table-cell--actions">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={row.isPinned ? 'government-ops-row--pinned' : undefined}>
                  <td>
                    {row.isPinned ? <span className="government-ops-badge">중요</span> : null} {row.title}
                  </td>
                  <td>{labelForNoticeCategory(row.category)}</td>
                  <td>{labelForStatus(row.status)}</td>
                  <td>{row.tenantName || '—'}</td>
                  <td>{row.createdByDisplayName || '—'}</td>
                  <td>{formatOpsDate(row.publishedAt ?? row.createdAt)}</td>
                  <td className="admin-table-cell--actions">
                    <div className="admin-table-actions">
                      <FormButton htmlType="button" variant="secondary" className="button button--secondary" onClick={() => openEdit(row)}>
                        수정
                      </FormButton>
                      {row.status !== 'archived' ? (
                        <FormButton htmlType="button" variant="secondary" className="button button--secondary" onClick={() => void handleArchive(row)}>
                          보관
                        </FormButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

          <div className="admin-responsive-card-list">
            {rows.map((row) => (
              <article key={row.id} className="admin-user-card">
                <div className="admin-user-card__row">
                  <span className="admin-user-card__label">제목</span>
                  <span className="admin-user-card__value">
                    {row.isPinned ? <span className="government-ops-badge">중요</span> : null} {row.title}
                  </span>
                </div>
                <div className="admin-user-card__row">
                  <span className="admin-user-card__label">구분</span>
                  <span className="admin-user-card__value">{labelForNoticeCategory(row.category)}</span>
                </div>
                <div className="admin-user-card__row">
                  <span className="admin-user-card__label">상태</span>
                  <span className="admin-user-card__value">{labelForStatus(row.status)}</span>
                </div>
                <div className="admin-user-card__row">
                  <span className="admin-user-card__label">등록일</span>
                  <span className="admin-user-card__value">{formatOpsDate(row.publishedAt ?? row.createdAt)}</span>
                </div>
                <div className="admin-user-card__actions">
                  <FormButton htmlType="button" variant="secondary" className="button button--secondary" onClick={() => openEdit(row)}>
                    수정
                  </FormButton>
                  {row.status !== 'archived' ? (
                    <FormButton htmlType="button" variant="secondary" className="button button--secondary" onClick={() => void handleArchive(row)}>
                      보관
                    </FormButton>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      <FormDialog
        open={editorOpen}
        onClose={() => !saving && setEditorOpen(false)}
        title={editingId ? '공지 수정' : '공지 작성'}
        closeOnBackdrop={false}
        closeOnEsc={!saving}
        panelPreset="largeForm"
      >
        <StatusMessage message={formError} tone="error" className="m-0 mb-3" />
        <div className="government-ops-form-grid">
          <FieldWrapper label="제목">
            <FormInput
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="공지 제목"
            />
          </FieldWrapper>
          <FieldWrapper label="구분">
            <FormSelect
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              options={[...GOVERNMENT_NOTICE_CATEGORIES]}
            />
          </FieldWrapper>
          <FieldWrapper label="상태">
            <FormSelect
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              options={[...GOVERNMENT_NOTICE_STATUSES]}
            />
          </FieldWrapper>
          {isAgencyAdmin && agencyOptions.length > 1 ? (
            <FieldWrapper label="대행사">
              <FormSelect
                value={form.tenantId}
                onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
                options={agencyOptions}
              />
            </FieldWrapper>
          ) : null}
          <FieldWrapper label="중요 공지">
            <FormSelect
              value={form.isPinned ? 'yes' : 'no'}
              onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.value === 'yes' }))}
              options={[
                { value: 'no', label: '아니오' },
                { value: 'yes', label: '예 (상단 고정)' },
              ]}
            />
          </FieldWrapper>
          <FieldWrapper label="내용" className="government-ops-form-grid__full">
            <FormTextarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={8}
              placeholder="이용자에게 전달할 공지 내용을 입력하세요."
            />
          </FieldWrapper>
        </div>
        <div className="government-admin-users-page__dialog-actions">
          <FormButton htmlType="button" variant="secondary" onClick={() => setEditorOpen(false)} disabled={saving}>
            취소
          </FormButton>
          <FormButton htmlType="button" variant="primary" onClick={() => void submit()} disabled={saving}>
            저장
          </FormButton>
        </div>
      </FormDialog>
      {confirmDialog}
    </GovernmentAdminPageShell>
  )
}
