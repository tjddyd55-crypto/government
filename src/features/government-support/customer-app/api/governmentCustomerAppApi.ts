import { apiRequest } from '../../../../lib/apiClient'

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

export type GovCustomerDocumentRequestListItem = {
  id: string
  profileId: string
  title: string
  message: string
  status: string
  itemCount: number
  submittedCount: number
  createdAt: string
}

export type GovCustomerDocumentRequestFile = {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string
}

export type GovCustomerDocumentRequestItem = {
  id: string
  docType: string
  label: string
  status: string
  fileCount: number
  files: GovCustomerDocumentRequestFile[]
}

export type GovCustomerDocumentRequestDetail = GovCustomerDocumentRequestListItem & {
  items: GovCustomerDocumentRequestItem[]
}

export type GovCustomerProgressEvent = {
  id: string
  profileId: string
  status: string
  title: string
  content: string
  eventDate: string | null
  createdAt: string
}

export type GovCustomerSignatureItem = {
  id: string
  profileDisplayName: string
  templateNames: string
  status: string
  displayStatus: string
  sentAt: string | null
  openedAt: string | null
  completedAt: string | null
  expiredAt: string | null
  hasSignedPdf: boolean
  firstCompletedDocumentId: string | null
}

export async function fetchGovCustomerDocumentRequests(token: string): Promise<GovCustomerDocumentRequestListItem[]> {
  const raw = await apiRequest<unknown>('/api/government-support/my/document-requests', { method: 'GET', token })
  return unwrapList<GovCustomerDocumentRequestListItem>(raw)
}

export async function fetchGovCustomerDocumentRequestDetail(
  token: string,
  requestId: string,
): Promise<GovCustomerDocumentRequestDetail> {
  const raw = await apiRequest<unknown>(`/api/government-support/my/document-requests/${requestId}`, {
    method: 'GET',
    token,
  })
  const row = unwrapData<GovCustomerDocumentRequestDetail>(raw)
  if (!row) throw new Error('요청서류를 불러오지 못했습니다.')
  return row
}

export async function presignGovCustomerDocumentFile(
  token: string,
  requestId: string,
  itemId: string,
  payload: { fileName: string; contentType: string; sizeBytes: number },
): Promise<{ fileId: string; objectKey: string; uploadUrl: string; putHeaders?: Record<string, string> }> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/my/document-requests/${requestId}/items/${itemId}/files/presign`,
    { method: 'POST', token, body: JSON.stringify(payload) },
  )
  const row = unwrapData<{
    fileId: string
    objectKey: string
    uploadUrl: string
    putHeaders?: Record<string, string>
  }>(raw)
  if (!row?.uploadUrl) throw new Error('업로드 URL을 받지 못했습니다.')
  return row
}

export async function confirmGovCustomerDocumentFile(
  token: string,
  requestId: string,
  itemId: string,
  fileId: string,
): Promise<void> {
  await apiRequest<unknown>(`/api/government-support/my/document-requests/${requestId}/items/${itemId}/files`, {
    method: 'POST',
    token,
    body: JSON.stringify({ fileId }),
  })
}

export async function deleteGovCustomerDocumentFile(
  token: string,
  requestId: string,
  itemId: string,
  fileId: string,
): Promise<void> {
  await apiRequest<unknown>(
    `/api/government-support/my/document-requests/${requestId}/items/${itemId}/files/${fileId}`,
    { method: 'DELETE', token },
  )
}

export async function downloadGovCustomerDocumentFile(
  token: string,
  requestId: string,
  itemId: string,
  fileId: string,
): Promise<{ downloadUrl: string; fileName: string }> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/my/document-requests/${requestId}/items/${itemId}/files/${fileId}/download`,
    { method: 'GET', token },
  )
  const row = unwrapData<{ downloadUrl: string; fileName: string }>(raw)
  if (!row?.downloadUrl) throw new Error('다운로드 URL을 받지 못했습니다.')
  return row
}

export async function fetchGovCustomerProgress(token: string): Promise<GovCustomerProgressEvent[]> {
  const raw = await apiRequest<unknown>('/api/government-support/my/progress', { method: 'GET', token })
  return unwrapList<GovCustomerProgressEvent>(raw)
}

export async function fetchGovCustomerSignatures(token: string): Promise<GovCustomerSignatureItem[]> {
  const raw = await apiRequest<unknown>('/api/government-support/my/signatures', { method: 'GET', token })
  return unwrapList<GovCustomerSignatureItem>(raw)
}

export async function downloadGovCustomerSignaturePdf(
  token: string,
  sessionId: string,
  documentInstanceId?: string,
): Promise<{ downloadUrl: string; fileName: string }> {
  const q = documentInstanceId ? `?documentId=${encodeURIComponent(documentInstanceId)}` : ''
  const raw = await apiRequest<unknown>(`/api/government-support/my/signatures/${sessionId}/download${q}`, {
    method: 'GET',
    token,
  })
  const row = unwrapData<{ downloadUrl: string; fileName: string }>(raw)
  if (!row?.downloadUrl) throw new Error('다운로드 URL을 받지 못했습니다.')
  return row
}

export type GovCustomerInquiryListItem = {
  id: string
  title: string
  content: string
  status: string
  messageCount: number
  fileCount: number
  lastRepliedAt: string | null
  createdAt: string
  updatedAt: string
}

export type GovCustomerInquiryMessage = {
  id: string
  inquiryId: string
  senderUserId: string
  senderRole: string
  senderUsername: string | null
  message: string
  createdAt: string
}

export type GovCustomerInquiryFile = {
  id: string
  inquiryId: string
  messageId: string | null
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string
}

export type GovCustomerInquiryDetail = GovCustomerInquiryListItem & {
  messages: GovCustomerInquiryMessage[]
  files: GovCustomerInquiryFile[]
}

export async function fetchGovCustomerInquiries(token: string): Promise<GovCustomerInquiryListItem[]> {
  const raw = await apiRequest<unknown>('/api/government-support/my/inquiries', { method: 'GET', token })
  return unwrapList<GovCustomerInquiryListItem>(raw)
}

export async function createGovCustomerInquiry(
  token: string,
  payload: { title?: string; content: string },
): Promise<GovCustomerInquiryListItem> {
  const raw = await apiRequest<unknown>('/api/government-support/my/inquiries', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
  const row = unwrapData<GovCustomerInquiryListItem>(raw)
  if (!row) throw new Error('문의 등록에 실패했습니다.')
  return row
}

export async function fetchGovCustomerInquiryDetail(
  token: string,
  inquiryId: string,
): Promise<GovCustomerInquiryDetail> {
  const raw = await apiRequest<unknown>(`/api/government-support/my/inquiries/${inquiryId}`, {
    method: 'GET',
    token,
  })
  const row = unwrapData<GovCustomerInquiryDetail>(raw)
  if (!row) throw new Error('문의를 불러오지 못했습니다.')
  return row
}

export async function postGovCustomerInquiryMessage(
  token: string,
  inquiryId: string,
  message: string,
): Promise<GovCustomerInquiryMessage> {
  const raw = await apiRequest<unknown>(`/api/government-support/my/inquiries/${inquiryId}/messages`, {
    method: 'POST',
    token,
    body: JSON.stringify({ message }),
  })
  const row = unwrapData<GovCustomerInquiryMessage>(raw)
  if (!row) throw new Error('메시지 전송에 실패했습니다.')
  return row
}

export async function presignGovCustomerInquiryFile(
  token: string,
  inquiryId: string,
  payload: { fileName: string; contentType: string; fileSize: number; messageId?: string },
): Promise<{ fileId: string; objectKey: string; uploadUrl: string; putHeaders?: Record<string, string> }> {
  const raw = await apiRequest<unknown>(`/api/government-support/my/inquiries/${inquiryId}/files/presign`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
  const row = unwrapData<{
    fileId: string
    objectKey: string
    uploadUrl: string
    putHeaders?: Record<string, string>
  }>(raw)
  if (!row?.uploadUrl) throw new Error('업로드 URL을 받지 못했습니다.')
  return row
}

export async function confirmGovCustomerInquiryFile(
  token: string,
  inquiryId: string,
  fileId: string,
): Promise<void> {
  await apiRequest<unknown>(`/api/government-support/my/inquiries/${inquiryId}/files`, {
    method: 'POST',
    token,
    body: JSON.stringify({ fileId }),
  })
}
