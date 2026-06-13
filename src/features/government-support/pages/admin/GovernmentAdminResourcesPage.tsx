import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormDialog, useConfirmDialog } from '../../../../components/dialog'
import { EmptyState, LoadingState, StatusMessage } from '../../../../components/feedback'
import { FieldWrapper, FormButton, FormInput, FormSelect, FormTextarea } from '../../../../components/form'
import { useAuth } from '../../../auth/AuthProvider'
import {
  archiveGovernmentResource,
  fetchGovernmentResources,
  presignGovernmentResource,
  saveGovernmentResource,
  updateGovernmentResource,
  downloadGovernmentResource,
  type GovernmentResourceRow,
} from '../../api/governmentOperationsApi'
import { fetchGovAgencies } from '../../api/governmentProfilesApi'
import {
  GOVERNMENT_RESOURCE_CATEGORIES,
  GOVERNMENT_RESOURCE_STATUSES,
  formatFileSize,
  formatOpsDate,
  labelForResourceCategory,
  labelForStatus,
} from '../../constants/governmentOperations'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'
import { useGovernmentAdminTextSearch } from '../../hooks/useGovernmentAdminTextSearch'
import GovernmentAdminPageShell from '../../components/GovernmentAdminPageShell'
import GovernmentAdminSearchField from '../../components/GovernmentAdminSearchField'
import GovernmentAdminOperationalScopeFields from '../../components/GovernmentAdminOperationalScopeFields'
import GovernmentAdminModalFooter from '../../components/GovernmentAdminModalFooter'
import { mapGovernmentAdminApiError } from '../../lib/mapGovernmentAdminApiError'
import { labelForOperationalScope, resolveOperationalScopePayload } from '../../lib/governmentOperationalScope'
import { canManageGovernmentUsers } from '../../lib/governmentAccess'
import type { GovAgencyRow } from '../../types/governmentProfile.types'

type ResourceForm = {
  title: string
  description: string
  category: string
  status: string
  scopeType: string
  tenantId: string
  file: File | null
}

const EMPTY_FORM: ResourceForm = {
  title: '',
  description: '',
  category: 'form',
  status: 'draft',
  scopeType: 'agency',
  tenantId: '',
  file: null,
}

export default function GovernmentAdminResourcesPage() {
  const { token } = useAuth()
  const { summary } = useGovernmentAccess(token)
  const { confirm, confirmDialog } = useConfirmDialog()
  const isIndustryAdmin = Boolean(summary?.isSuperAdmin || summary?.isGovernmentIndustryAdmin)
  const canPickScope = isIndustryAdmin
  const isAgencyAdmin = canManageGovernmentUsers(summary)
  const defaultTenantId =
    summary?.governmentAgencyAdminTenantIds[0] ??
    summary?.governmentStaffTenantIds[0] ??
    ''

  const [agencies, setAgencies] = useState<GovAgencyRow[]>([])
  const [rows, setRows] = useState<GovernmentResourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const textSearch = useGovernmentAdminTextSearch()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<GovernmentResourceRow | null>(null)
  const [form, setForm] = useState<ResourceForm>({ ...EMPTY_FORM, tenantId: defaultTenantId })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const agencyFormOptions = useMemo(() => {
    const base = agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.agencyCode})` }))
    if (canPickScope) {
      return [{ value: '', label: '대행사 선택' }, ...base]
    }
    return base
  }, [agencies, canPickScope])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setRows(
        await fetchGovernmentResources(token, {
          managerView: true,
          status: filterStatus || undefined,
          category: filterCategory || undefined,
          q: textSearch.query.trim() || undefined,
        }),
      )
    } catch (e) {
      setError(mapGovernmentAdminApiError(e, '자료 목록을 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }, [token, filterStatus, filterCategory, textSearch.query])

  useEffect(() => {
    if (!token || (!isIndustryAdmin && !isAgencyAdmin)) return
    void fetchGovAgencies(token).then(setAgencies).catch(() => setAgencies([]))
  }, [token, isIndustryAdmin, isAgencyAdmin])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      scopeType: canPickScope ? 'global' : 'agency',
      tenantId: defaultTenantId,
    })
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (row: GovernmentResourceRow) => {
    setEditing(row)
    setForm({
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      scopeType: row.scopeType,
      tenantId: row.tenantId ?? defaultTenantId,
      file: null,
    })
    setFormError(null)
    setEditorOpen(true)
  }

  const submit = async () => {
    if (!token) return
    setSaving(true)
    setFormError(null)
    try {
      const scope = resolveOperationalScopePayload(form, { canPickScope, defaultTenantId })
      const meta = {
        title: form.title.trim(),
        description: form.description,
        category: form.category,
        status: form.status,
        scopeType: scope.scopeType,
        tenantId: scope.tenantId,
      }
      if (editing && !form.file) {
        await updateGovernmentResource(token, editing.id, meta)
      } else {
        if (!form.file && !editing) {
          setFormError('파일을 선택하세요.')
          return
        }
        const presign = await presignGovernmentResource(token, {
          ...meta,
          fileName: form.file!.name,
          contentType: form.file!.type || 'application/octet-stream',
          sizeBytes: form.file!.size,
          resourceId: editing?.id,
        })
        await fetch(presign.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': form.file!.type || 'application/octet-stream',
            ...presign.putHeaders,
          },
          body: form.file!,
        })
        await saveGovernmentResource(token, {
          ...meta,
          resourceId: presign.resourceId,
          fileKey: presign.objectKey,
          fileName: form.file!.name,
          fileSize: form.file!.size,
          mimeType: form.file!.type || 'application/octet-stream',
        })
      }
      setEditorOpen(false)
      await load()
    } catch (e) {
      setFormError(mapGovernmentAdminApiError(e, '저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async (row: GovernmentResourceRow) => {
    if (!token) return
    const ok = await confirm({
      title: '자료 보관',
      message: `「${row.title}」 자료를 보관 처리하시겠습니까?`,
      tone: 'danger',
    })
    if (!ok) return
    await archiveGovernmentResource(token, row.id)
    await load()
  }

  const resetFilters = () => {
    textSearch.reset()
    setFilterCategory('')
    setFilterStatus('')
  }

  return (
    <GovernmentAdminPageShell
      title="자료실/서식함"
      description={
        isIndustryAdmin
          ? '전체 이용자용 신청 서식·안내문 등을 관리합니다.'
          : '소속 대행사 이용자용 신청 서식·안내문 등을 관리합니다.'
      }
      testId="government-admin-resources-page"
      toolbar={
        <div className="government-admin-toolbar">
          <div className="government-admin-toolbar__actions">
            <FormButton htmlType="button" variant="primary" className="gov-btn gov-btn--primary" onClick={openCreate}>
              자료 등록
            </FormButton>
          </div>
          <div className="government-admin-toolbar__filters">
            <GovernmentAdminSearchField
              draft={textSearch.draft}
              onDraftChange={textSearch.setDraft}
              onApply={textSearch.apply}
              onReset={textSearch.reset}
              onKeyDown={textSearch.onKeyDown}
              placeholder="제목·설명"
              disabled={loading}
            />
            <FieldWrapper label="카테고리" className="government-admin-toolbar__field">
              <FormSelect
                className="gov-form-control"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                options={[{ value: '', label: '전체' }, ...GOVERNMENT_RESOURCE_CATEGORIES]}
                disabled={loading}
              />
            </FieldWrapper>
            <FieldWrapper label="상태" className="government-admin-toolbar__field">
              <FormSelect
                className="gov-form-control"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[{ value: '', label: '전체' }, ...GOVERNMENT_RESOURCE_STATUSES]}
                disabled={loading}
              />
            </FieldWrapper>
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary"
              onClick={resetFilters}
              disabled={loading}
            >
              초기화
            </FormButton>
          </div>
        </div>
      }
    >
      {error ? (
        <div className="admin-user-management__error-card gov-status-error-card" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? <LoadingState message="불러오는 중…" /> : null}
      {!loading && rows.length === 0 ? <EmptyState message="등록된 자료가 없습니다." /> : null}

      {!loading && rows.length > 0 ? (
        <>
          <div className="table-container table-container--desktop table-wrap">
            <table className="admin-data-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>범위</th>
                <th>카테고리</th>
                <th>파일</th>
                <th>상태</th>
                <th>등록일</th>
                <th className="admin-table-cell--actions">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{labelForOperationalScope(row)}</td>
                  <td>{labelForResourceCategory(row.category)}</td>
                  <td>
                    {row.fileName} ({formatFileSize(row.fileSize)})
                  </td>
                  <td>{labelForStatus(row.status)}</td>
                  <td>{formatOpsDate(row.publishedAt ?? row.createdAt)}</td>
                  <td className="admin-table-cell--actions">
                    <div className="admin-table-actions">
                      {row.status === 'published' ? (
                        <FormButton
                          htmlType="button"
                          variant="secondary"
                          className="gov-btn gov-btn--secondary gov-btn--sm"
                          onClick={() => void downloadGovernmentResource(token!, row.id)}
                        >
                          다운로드
                        </FormButton>
                      ) : null}
                      <FormButton htmlType="button" variant="secondary" className="gov-btn gov-btn--secondary gov-btn--sm" onClick={() => openEdit(row)}>
                        수정
                      </FormButton>
                      {row.status !== 'archived' ? (
                        <FormButton htmlType="button" variant="danger" className="gov-btn gov-btn--danger gov-btn--sm" onClick={() => void handleArchive(row)}>
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
                  <span className="admin-user-card__value">{row.title}</span>
                </div>
                <div className="admin-user-card__row">
                  <span className="admin-user-card__label">범위</span>
                  <span className="admin-user-card__value">{labelForOperationalScope(row)}</span>
                </div>
                <div className="admin-user-card__row">
                  <span className="admin-user-card__label">카테고리</span>
                  <span className="admin-user-card__value">{labelForResourceCategory(row.category)}</span>
                </div>
                <div className="admin-user-card__row">
                  <span className="admin-user-card__label">파일</span>
                  <span className="admin-user-card__value">
                    {row.fileName} ({formatFileSize(row.fileSize)})
                  </span>
                </div>
                <div className="admin-user-card__row">
                  <span className="admin-user-card__label">상태</span>
                  <span className="admin-user-card__value">{labelForStatus(row.status)}</span>
                </div>
                <div className="admin-user-card__actions">
                  {row.status === 'published' ? (
                    <FormButton
                      htmlType="button"
                      variant="secondary"
                      className="gov-btn gov-btn--secondary gov-btn--sm"
                      onClick={() => void downloadGovernmentResource(token!, row.id)}
                    >
                      다운로드
                    </FormButton>
                  ) : null}
                  <FormButton htmlType="button" variant="secondary" className="gov-btn gov-btn--secondary gov-btn--sm" onClick={() => openEdit(row)}>
                    수정
                  </FormButton>
                  {row.status !== 'archived' ? (
                    <FormButton htmlType="button" variant="danger" className="gov-btn gov-btn--danger gov-btn--sm" onClick={() => void handleArchive(row)}>
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
        title={editing ? '자료 수정' : '자료 등록'}
        closeOnBackdrop={false}
        closeOnEsc={!saving}
        panelPreset="largeForm"
        panelClassName="government-admin-modal-panel"
        overlayClassName="government-admin-modal-backdrop"
      >
        <StatusMessage message={formError} tone="error" className="m-0 mb-3" />
        <div className="government-ops-form-grid government-admin-modal-body">
          <FieldWrapper label="제목">
            <FormInput
              className="gov-form-control"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="자료 제목"
            />
          </FieldWrapper>
          <GovernmentAdminOperationalScopeFields
            canPickScope={canPickScope}
            scopeType={form.scopeType}
            tenantId={form.tenantId}
            agencyOptions={agencyFormOptions}
            onScopeTypeChange={(value) => setForm((f) => ({ ...f, scopeType: value, tenantId: value === 'global' ? '' : f.tenantId }))}
            onTenantIdChange={(value) => setForm((f) => ({ ...f, tenantId: value }))}
            disabled={saving}
          />
          <FieldWrapper label="카테고리">
            <FormSelect
              className="gov-form-control"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              options={[...GOVERNMENT_RESOURCE_CATEGORIES]}
            />
          </FieldWrapper>
          <FieldWrapper label="상태">
            <FormSelect
              className="gov-form-control"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              options={[...GOVERNMENT_RESOURCE_STATUSES]}
            />
          </FieldWrapper>
          <FieldWrapper label="파일" className="government-ops-form-grid__full">
            <input
              className="gov-form-control"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.hwp,.zip,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
              aria-label="자료 파일"
            />
            {editing?.fileName ? (
              <p className="government-admin-page__muted">현재 파일: {editing.fileName}</p>
            ) : null}
          </FieldWrapper>
          <FieldWrapper label="설명" className="government-ops-form-grid__full">
            <FormTextarea
              className="gov-form-control"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              placeholder="자료 설명·이용 안내"
            />
          </FieldWrapper>
        </div>
        <GovernmentAdminModalFooter>
          <FormButton htmlType="button" variant="secondary" className="gov-btn gov-btn--secondary" onClick={() => setEditorOpen(false)} disabled={saving}>
            취소
          </FormButton>
          <FormButton htmlType="button" variant="primary" className="gov-btn gov-btn--primary" onClick={() => void submit()} disabled={saving} loading={saving} loadingText="저장 중…">
            저장
          </FormButton>
        </GovernmentAdminModalFooter>
      </FormDialog>
      {confirmDialog}
    </GovernmentAdminPageShell>
  )
}
