import { apiRequest } from '../../../lib/apiClient'
import type { GovCustomerStatusOption } from '../types/governmentProfile.types'

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

export async function fetchGovCustomerStatusOptions(
  token: string,
  tenantId: string,
  options?: { includeInactive?: boolean },
): Promise<GovCustomerStatusOption[]> {
  const params = new URLSearchParams({ tenantId })
  if (options?.includeInactive) params.set('includeInactive', 'true')
  const raw = await apiRequest<unknown>(
    `/api/government-support/customer-status-options?${params.toString()}`,
    { method: 'GET', token },
  )
  return unwrapList<GovCustomerStatusOption>(raw)
}

export async function createGovCustomerStatusOption(
  token: string,
  body: { tenantId: string; label: string; color?: string; sortOrder?: number },
): Promise<GovCustomerStatusOption> {
  const raw = await apiRequest<unknown>('/api/government-support/admin/customer-status-options', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  })
  const row = unwrapData<GovCustomerStatusOption>(raw)
  if (!row) throw new Error('고객상태 추가에 실패했습니다.')
  return row
}

export async function patchGovCustomerStatusOption(
  token: string,
  optionId: string,
  body: Partial<Pick<GovCustomerStatusOption, 'label' | 'color' | 'sortOrder' | 'isActive'>>,
): Promise<GovCustomerStatusOption> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/admin/customer-status-options/${optionId}`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    },
  )
  const row = unwrapData<GovCustomerStatusOption>(raw)
  if (!row) throw new Error('고객상태 수정에 실패했습니다.')
  return row
}

export async function archiveGovCustomerStatusOption(
  token: string,
  optionId: string,
): Promise<{ soft: boolean }> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/admin/customer-status-options/${optionId}`,
    { method: 'DELETE', token },
  )
  const data = unwrapData<{ soft?: boolean }>(raw)
  return { soft: data?.soft === true }
}
