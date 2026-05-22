import { apiRequest } from '../../../lib/apiClient'
import type {
  GovCustomerDocumentRequestDetail,
  GovCustomerDocumentRequestFile,
  GovCustomerDocumentRequestListItem,
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

export type GovAdminDocumentRequestListItem = GovCustomerDocumentRequestListItem & {
  profileDisplayName?: string
}

export type GovAdminDocumentRequestFile = GovCustomerDocumentRequestFile & {
  downloadUrl?: string
}

export type GovAdminDocumentRequestDetail = GovCustomerDocumentRequestDetail & {
  profileDisplayName?: string
}

export async function fetchGovAdminDocumentRequests(
  token: string,
  status?: string,
): Promise<GovAdminDocumentRequestListItem[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  const raw = await apiRequest<unknown>(`/api/government-support/admin/document-requests${q}`, {
    method: 'GET',
    token,
  })
  return unwrapList<GovAdminDocumentRequestListItem>(raw)
}

export async function fetchGovAdminDocumentRequestDetail(
  token: string,
  requestId: string,
): Promise<GovAdminDocumentRequestDetail> {
  const raw = await apiRequest<unknown>(`/api/government-support/admin/document-requests/${requestId}`, {
    method: 'GET',
    token,
  })
  const row = unwrapData<GovAdminDocumentRequestDetail>(raw)
  if (!row) throw new Error('요청서류를 불러오지 못했습니다.')
  return row
}

export async function createGovAdminDocumentRequest(
  token: string,
  profileId: string,
  payload: {
    title?: string
    message?: string
    items: Array<{ label: string; docType?: string }>
  },
): Promise<GovAdminDocumentRequestListItem> {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/document-requests`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
  const row = unwrapData<GovAdminDocumentRequestListItem>(raw)
  if (!row) throw new Error('요청서류 발송에 실패했습니다.')
  return row
}

export async function downloadGovAdminDocumentRequestFile(
  token: string,
  requestId: string,
  itemId: string,
  fileId: string,
): Promise<{ downloadUrl: string; fileName: string }> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/admin/document-requests/${requestId}/items/${itemId}/files/${fileId}/download`,
    { method: 'GET', token },
  )
  const row = unwrapData<{ downloadUrl: string; fileName: string }>(raw)
  if (!row?.downloadUrl) throw new Error('다운로드 URL을 받지 못했습니다.')
  return row
}
