import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { FormButton, FormInput } from '../../../../components/form'
import { StatusMessage } from '../../../../components/feedback'
import { useAuth } from '../../../auth/AuthProvider'
import {
  archiveGovCustomerStatusOption,
  createGovCustomerStatusOption,
  fetchGovCustomerStatusOptions,
  patchGovCustomerStatusOption,
} from '../../api/governmentCustomerStatusApi'
import { fetchGovAgencies } from '../../api/governmentProfilesApi'
import { useGovernmentAccessContext } from '../../context/GovernmentAccessContext'
import { canListGovernmentAdminCustomers } from '../../lib/governmentAccess'
import { mapGovernmentAdminApiError } from '../../lib/mapGovernmentAdminApiError'
import type { GovCustomerStatusOption } from '../../types/governmentProfile.types'

type Draft = {
  label: string
  color: string
  sortOrder: string
}

const EMPTY_DRAFT: Draft = { label: '', color: '#94A3B8', sortOrder: '100' }

export default function GovernmentAdminCustomerStatusSettings() {
  const { token } = useAuth()
  const { summary } = useGovernmentAccessContext()
  const allowed = canListGovernmentAdminCustomers(summary)
  const isIndustryScope =
    summary?.isSuperAdmin === true || summary?.isGovernmentIndustryAdmin === true

  const defaultTenantId = useMemo(() => {
    if (!summary) return ''
    if (isIndustryScope) return ''
    return summary.governmentAgencyAdminTenantIds?.[0] ?? ''
  }, [summary, isIndustryScope])

  const [tenantId, setTenantId] = useState('')
  const [tenantOptions, setTenantOptions] = useState<Array<{ id: string; name: string }>>([])
  const [rows, setRows] = useState<GovCustomerStatusOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)

  const effectiveTenantId = tenantId || defaultTenantId

  useEffect(() => {
    if (defaultTenantId && !tenantId) setTenantId(defaultTenantId)
  }, [defaultTenantId, tenantId])

  const loadTenants = useCallback(async () => {
    if (!token || !isIndustryScope) return
    try {
      const agencies = await fetchGovAgencies(token)
      const options = agencies.map((row) => ({ id: row.id, name: row.name }))
      setTenantOptions(options)
      if (options.length > 0 && !tenantId) setTenantId(options[0].id)
    } catch {
      setTenantOptions([])
    }
  }, [token, isIndustryScope, tenantId])

  const loadOptions = useCallback(async () => {
    if (!token || !allowed || !effectiveTenantId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setRows(
        await fetchGovCustomerStatusOptions(token, effectiveTenantId, { includeInactive: true }),
      )
    } catch (e) {
      setError(mapGovernmentAdminApiError(e, '고객상태 옵션을 불러오지 못했습니다.'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token, allowed, effectiveTenantId])

  useEffect(() => {
    void loadTenants()
  }, [loadTenants])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !effectiveTenantId || !draft.label.trim()) return
    setFeedback(null)
    setError(null)
    try {
      await createGovCustomerStatusOption(token, {
        tenantId: effectiveTenantId,
        label: draft.label.trim(),
        color: draft.color.trim() || '#94A3B8',
        sortOrder: Number(draft.sortOrder) || 100,
      })
      setDraft(EMPTY_DRAFT)
      setFeedback('고객상태를 추가했습니다.')
      await loadOptions()
    } catch (e) {
      setError(mapGovernmentAdminApiError(e, '고객상태 추가에 실패했습니다.'))
    }
  }

  const startEdit = (row: GovCustomerStatusOption) => {
    setEditingId(row.id)
    setEditDraft({
      label: row.label,
      color: row.color,
      sortOrder: String(row.sortOrder),
    })
  }

  const saveEdit = async () => {
    if (!token || !editingId || !editDraft.label.trim()) return
    setFeedback(null)
    setError(null)
    try {
      await patchGovCustomerStatusOption(token, editingId, {
        label: editDraft.label.trim(),
        color: editDraft.color.trim() || '#94A3B8',
        sortOrder: Number(editDraft.sortOrder) || 0,
      })
      setEditingId(null)
      setFeedback('고객상태를 저장했습니다.')
      await loadOptions()
    } catch (e) {
      setError(mapGovernmentAdminApiError(e, '고객상태 저장에 실패했습니다.'))
    }
  }

  const toggleActive = async (row: GovCustomerStatusOption) => {
    if (!token) return
    setFeedback(null)
    setError(null)
    try {
      await patchGovCustomerStatusOption(token, row.id, { isActive: !row.isActive })
      await loadOptions()
    } catch (e) {
      setError(mapGovernmentAdminApiError(e, '상태 변경에 실패했습니다.'))
    }
  }

  const removeOption = async (row: GovCustomerStatusOption) => {
    if (!token) return
    if (!window.confirm(`"${row.label}" 고객상태를 삭제(보관)하시겠습니까?`)) return
    setFeedback(null)
    setError(null)
    try {
      const result = await archiveGovCustomerStatusOption(token, row.id)
      setFeedback(result.soft ? '사용 중인 옵션은 비활성 처리했습니다.' : '고객상태를 삭제했습니다.')
      await loadOptions()
    } catch (e) {
      setError(mapGovernmentAdminApiError(e, '고객상태 삭제에 실패했습니다.'))
    }
  }

  if (!allowed) {
    return (
      <section className="government-admin-settings-section">
        <h2 className="government-admin-settings-section__title">고객상태 관리</h2>
        <p className="government-page__muted">대행사 관리자·업종 관리자만 이용할 수 있습니다.</p>
      </section>
    )
  }

  return (
    <section className="government-admin-settings-section">
      <h2 className="government-admin-settings-section__title">고객상태 관리</h2>
      <p className="government-page__muted">
        고객 목록 카드에 표시되는 상태 옵션입니다. 진행상황·서류상태와 별도로 관리합니다.
      </p>

      {isIndustryScope ? (
        <div className="government-admin-settings-section__field">
          <label className="dark-label" htmlFor="gov-customer-status-tenant">
            대행사
          </label>
          <select
            id="gov-customer-status-tenant"
            className="gov-form-control"
            value={effectiveTenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            {tenantOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {feedback ? <StatusMessage message={feedback} className="m-0 mb-3" /> : null}
      {error ? <StatusMessage message={error} tone="error" className="m-0 mb-3" /> : null}

      {loading ? <p className="government-page__muted">불러오는 중…</p> : null}

      {!loading ? (
        <div className="government-admin-table-wrap government-admin-settings-section__table">
          <table className="government-admin-table">
            <thead>
              <tr>
                <th>라벨</th>
                <th>색상</th>
                <th>순서</th>
                <th>사용</th>
                <th>활성</th>
                <th aria-label="작업" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) =>
                editingId === row.id ? (
                  <tr key={row.id}>
                    <td>
                      <FormInput
                        value={editDraft.label}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, label: e.target.value }))}
                        aria-label="라벨"
                      />
                    </td>
                    <td>
                      <FormInput
                        type="color"
                        value={editDraft.color}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, color: e.target.value }))}
                        aria-label="색상"
                      />
                    </td>
                    <td>
                      <FormInput
                        value={editDraft.sortOrder}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, sortOrder: e.target.value }))
                        }
                        aria-label="정렬 순서"
                      />
                    </td>
                    <td>{row.usageCount ?? 0}</td>
                    <td>{row.isActive ? 'Y' : 'N'}</td>
                    <td>
                      <FormButton type="button" onClick={() => void saveEdit()}>
                        저장
                      </FormButton>
                      <FormButton type="button" variant="secondary" onClick={() => setEditingId(null)}>
                        취소
                      </FormButton>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id}>
                    <td>
                      <span
                        className="government-customer-card__status-dot"
                        style={{ backgroundColor: row.color }}
                        aria-hidden
                      />{' '}
                      {row.label}
                    </td>
                    <td>{row.color}</td>
                    <td>{row.sortOrder}</td>
                    <td>{row.usageCount ?? 0}</td>
                    <td>{row.isActive ? '활성' : '비활성'}</td>
                    <td className="government-admin-settings-section__actions">
                      <FormButton type="button" variant="secondary" onClick={() => startEdit(row)}>
                        수정
                      </FormButton>
                      <FormButton type="button" variant="secondary" onClick={() => void toggleActive(row)}>
                        {row.isActive ? '비활성' : '활성'}
                      </FormButton>
                      <FormButton type="button" variant="secondary" onClick={() => void removeOption(row)}>
                        삭제
                      </FormButton>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <form className="government-admin-settings-section__form" onSubmit={(e) => void handleCreate(e)}>
        <h3 className="government-admin-settings-section__subtitle">옵션 추가</h3>
        <div className="government-admin-settings-section__form-grid">
          <FormInput
            value={draft.label}
            onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="라벨 (예: 상담중)"
            aria-label="새 고객상태 라벨"
            required
          />
          <FormInput
            type="color"
            value={draft.color}
            onChange={(e) => setDraft((prev) => ({ ...prev, color: e.target.value }))}
            aria-label="새 고객상태 색상"
          />
          <FormInput
            value={draft.sortOrder}
            onChange={(e) => setDraft((prev) => ({ ...prev, sortOrder: e.target.value }))}
            placeholder="정렬 순서"
            aria-label="새 고객상태 정렬 순서"
          />
          <FormButton type="submit">추가</FormButton>
        </div>
      </form>
    </section>
  )
}
