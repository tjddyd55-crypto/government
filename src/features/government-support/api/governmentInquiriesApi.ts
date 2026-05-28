import { apiRequest } from '../../../lib/apiClient'
import type {
  GovCustomerInquiryDetail,
  GovCustomerInquiryListItem,
  GovCustomerInquiryMessage,
} from '../customer-app/api/governmentCustomerAppApi'

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

export type GovAdminInquiryListItem = GovCustomerInquiryListItem & {
  ownerDisplayName?: string
  assignedToDisplayName?: string | null
}

export type GovAdminInquiriesQuery = {
  status?: string
  assignee?: string
}

export async function fetchGovAdminInquiries(
  token: string,
  query?: GovAdminInquiriesQuery | string,
): Promise<GovAdminInquiryListItem[]> {
  const q =
    typeof query === 'string'
      ? { status: query }
      : query ?? {}
  const params = new URLSearchParams()
  if (q.status) params.set('status', q.status)
  if (q.assignee) params.set('assignee', q.assignee)
  const qs = params.toString()
  const raw = await apiRequest<unknown>(`/api/government-support/admin/inquiries${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    token,
  })
  return unwrapList<GovAdminInquiryListItem>(raw)
}

export async function fetchGovAdminInquiryDetail(
  token: string,
  inquiryId: string,
): Promise<GovCustomerInquiryDetail & { files: Array<{ downloadUrl?: string }> }> {
  const raw = await apiRequest<unknown>(`/api/government-support/admin/inquiries/${inquiryId}`, {
    method: 'GET',
    token,
  })
  const row = unwrapData<GovCustomerInquiryDetail & { files: Array<{ downloadUrl?: string }> }>(raw)
  if (!row) throw new Error('문의를 불러오지 못했습니다.')
  return row
}

export async function postGovAdminInquiryMessage(
  token: string,
  inquiryId: string,
  message: string,
): Promise<GovCustomerInquiryMessage> {
  const raw = await apiRequest<unknown>(`/api/government-support/admin/inquiries/${inquiryId}/messages`, {
    method: 'POST',
    token,
    body: JSON.stringify({ message }),
  })
  const row = unwrapData<GovCustomerInquiryMessage>(raw)
  if (!row) throw new Error('답변 전송에 실패했습니다.')
  return row
}

export async function patchGovAdminInquiry(
  token: string,
  inquiryId: string,
  payload: { status?: string; assignedToUserId?: string | null },
): Promise<GovCustomerInquiryListItem> {
  const raw = await apiRequest<unknown>(`/api/government-support/admin/inquiries/${inquiryId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  })
  const row = unwrapData<GovCustomerInquiryListItem>(raw)
  if (!row) throw new Error('문의 상태 변경에 실패했습니다.')
  return row
}

export async function patchGovAdminInquiryAssignee(
  token: string,
  inquiryId: string,
  assignedToUserId: string | null,
): Promise<GovCustomerInquiryListItem> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/admin/inquiries/${encodeURIComponent(inquiryId)}/assignee`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify({ assignedToUserId }),
    },
  )
  const row = unwrapData<GovCustomerInquiryListItem>(raw)
  if (!row) throw new Error('담당자 지정에 실패했습니다.')
  return row
}
