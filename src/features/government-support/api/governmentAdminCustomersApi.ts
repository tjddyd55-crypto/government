import { apiRequest } from '../../../lib/apiClient'
import type {
  GovAdminCustomerSummary,
  GovProfileListQuery,
  GovSupportProfile,
} from '../types/governmentProfile.types'

function unwrapData<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (Array.isArray(o.data)) return o.data as T
  if (o.data && typeof o.data === 'object') return o.data as T
  return raw as T
}

function unwrapList<T>(raw: unknown): T[] {
  const d = unwrapData<T[]>(raw)
  return Array.isArray(d) ? d : Array.isArray(raw) ? (raw as T[]) : []
}

function buildQueryString(query?: GovProfileListQuery): string {
  if (!query) return ''
  const params = new URLSearchParams()
  if (query.q?.trim()) params.set('q', query.q.trim())
  if (query.customerStatusOptionId?.trim()) {
    params.set('customerStatusOptionId', query.customerStatusOptionId.trim())
  }
  if (query.businessType?.trim()) params.set('businessType', query.businessType.trim())
  if (query.ownerUserId?.trim()) params.set('ownerUserId', query.ownerUserId.trim())
  if (query.tenantId?.trim()) params.set('tenantId', query.tenantId.trim())
  const s = params.toString()
  return s ? `?${s}` : ''
}

export async function fetchGovAdminCustomers(
  token: string,
  query?: GovProfileListQuery & { tenantId?: string },
): Promise<{ rows: GovSupportProfile[]; summary: GovAdminCustomerSummary }> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/admin/customers${buildQueryString(query)}`,
    { method: 'GET', token },
  )
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const rows = unwrapList<GovSupportProfile>(raw)
  const summary =
    o.summary && typeof o.summary === 'object'
      ? (o.summary as GovAdminCustomerSummary)
      : { totalCount: rows.length, byStatus: [], byOwner: [] }
  return { rows, summary }
}
