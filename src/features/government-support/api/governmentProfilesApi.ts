import { apiRequest } from '../../../lib/apiClient'
import type {
  GovAgencyRow,
  GovApplicationCase,
  GovDocumentItem,
  GovEdocLinkRow,
  GovPriorLoan,
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

export async function fetchGovAgencies(
  token: string,
  options?: { includeArchived?: boolean },
): Promise<GovAgencyRow[]> {
  const query = options?.includeArchived ? '?includeArchived=true' : ''
  const raw = await apiRequest<unknown>(`/api/government-support/admin/agencies${query}`, {
    method: 'GET',
    token,
  })
  return unwrapList<GovAgencyRow>(raw)
}

export type GovAgencyPatchBody = {
  name?: string
  status?: string
  representativeName?: string
  contactPhone?: string
  businessNumber?: string
  address?: string
  memo?: string
  registrationCodeEnabled?: boolean
}

export async function patchGovAgency(
  token: string,
  agencyId: string,
  body: GovAgencyPatchBody,
): Promise<GovAgencyRow> {
  const raw = await apiRequest<unknown>(`/api/government-support/admin/agencies/${agencyId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(body),
  })
  const row = unwrapData<GovAgencyRow>(raw)
  if (!row) throw new Error('대행사 수정에 실패했습니다.')
  return row
}

export async function archiveGovAgency(token: string, agencyId: string): Promise<GovAgencyRow> {
  const raw = await apiRequest<unknown>(`/api/government-support/admin/agencies/${agencyId}`, {
    method: 'DELETE',
    token,
  })
  const row = unwrapData<GovAgencyRow>(raw)
  if (!row) throw new Error('대행사 보관에 실패했습니다.')
  return row
}

export async function createGovAgency(
  token: string,
  body: { name: string; agencyCode: string; status?: string },
): Promise<GovAgencyRow> {
  const raw = await apiRequest<unknown>('/api/government-support/admin/agencies', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  })
  const row = unwrapData<GovAgencyRow>(raw)
  if (!row) throw new Error('대행사 등록에 실패했습니다.')
  return row
}

export async function fetchGovProfiles(
  token: string,
  query?: GovProfileListQuery,
): Promise<GovSupportProfile[]> {
  const params = new URLSearchParams()
  if (query?.q?.trim()) params.set('q', query.q.trim())
  if (query?.customerStatusOptionId?.trim()) {
    params.set('customerStatusOptionId', query.customerStatusOptionId.trim())
  }
  if (query?.businessType?.trim()) params.set('businessType', query.businessType.trim())
  const qs = params.toString()
  const raw = await apiRequest<unknown>(
    `/api/government-support/profiles${qs ? `?${qs}` : ''}`,
    { method: 'GET', token },
  )
  return unwrapList<GovSupportProfile>(raw)
}

export async function patchGovProfileCustomerStatus(
  token: string,
  profileId: string,
  customerStatusOptionId: string | null,
): Promise<GovSupportProfile> {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/customer-status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ customerStatusOptionId }),
  })
  const row = unwrapData<GovSupportProfile>(raw)
  if (!row) throw new Error('고객상태 저장에 실패했습니다.')
  return row
}

export async function createGovProfile(
  token: string,
  tenantId: string | null | undefined,
  partial?: Partial<GovSupportProfile>,
) {
  const raw = await apiRequest<unknown>('/api/government-support/profiles', {
    method: 'POST',
    token,
    body: JSON.stringify({
      ...(tenantId ? { tenantId } : {}),
      customerName: '신규 고객',
      ...partial,
    }),
  })
  const row = unwrapData<GovSupportProfile>(raw)
  if (!row) throw new Error('고객 생성에 실패했습니다.')
  return row
}

export async function patchGovProfile(token: string, profileId: string, patch: Partial<GovSupportProfile>) {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(patch),
  })
  const row = unwrapData<GovSupportProfile>(raw)
  if (!row) throw new Error('저장에 실패했습니다.')
  return row
}

export async function deleteGovProfile(token: string, profileId: string): Promise<{ ok: boolean }> {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}`, {
    method: 'DELETE',
    token,
  })
  const data = unwrapData<{ ok?: boolean }>(raw)
  return { ok: data?.ok ?? true }
}

export async function fetchGovPriorLoans(token: string, profileId: string): Promise<GovPriorLoan[]> {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/prior-loans`, {
    method: 'GET',
    token,
  })
  return unwrapList<GovPriorLoan>(raw)
}

export async function createGovPriorLoan(token: string, profileId: string, body: Partial<GovPriorLoan>) {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/prior-loans`, {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  })
  return unwrapData<{ id: string }>(raw)
}

export async function patchGovPriorLoan(token: string, loanId: string, body: Partial<GovPriorLoan>) {
  const raw = await apiRequest<unknown>(`/api/government-support/prior-loans/${loanId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(body),
  })
  return unwrapData<{ id: string }>(raw)
}

export async function deleteGovPriorLoan(token: string, loanId: string) {
  await apiRequest(`/api/government-support/prior-loans/${loanId}`, { method: 'DELETE', token })
}

export async function fetchGovApplicationCases(token: string, profileId: string): Promise<GovApplicationCase[]> {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/application-cases`, {
    method: 'GET',
    token,
  })
  return unwrapList<GovApplicationCase>(raw)
}

export async function createGovApplicationCase(token: string, profileId: string, body: Partial<GovApplicationCase>) {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/application-cases`, {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  })
  return unwrapData<{ id: string; progressStatus: string }>(raw)
}

export async function patchGovApplicationCase(token: string, caseId: string, body: Partial<GovApplicationCase>) {
  const raw = await apiRequest<unknown>(`/api/government-support/application-cases/${caseId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(body),
  })
  return unwrapData<{ id: string; progressStatus: string }>(raw)
}

export async function fetchGovDocuments(token: string, profileId: string): Promise<GovDocumentItem[]> {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/documents`, {
    method: 'GET',
    token,
  })
  return unwrapList<GovDocumentItem>(raw)
}

export async function patchGovDocument(
  token: string,
  docId: string,
  body: { status?: string; storageKey?: string | null },
) {
  const raw = await apiRequest<unknown>(`/api/government-support/documents/${docId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(body),
  })
  return unwrapData<{ id: string; status: string }>(raw)
}

export async function presignGovDocument(
  token: string,
  docId: string,
  body: { fileName: string; contentType: string; sizeBytes: number },
) {
  const raw = await apiRequest<unknown>(`/api/government-support/documents/${docId}/presign`, {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  })
  const row = unwrapData<{ uploadUrl: string; objectKey: string; storageKey: string }>(raw)
  if (!row?.uploadUrl) throw new Error('업로드 URL을 받지 못했습니다.')
  return row
}

export async function fetchGovEdocLinks(token: string, profileId: string): Promise<GovEdocLinkRow[]> {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/edoc-links`, {
    method: 'GET',
    token,
  })
  return unwrapList<GovEdocLinkRow>(raw)
}

export async function createGovEdocLink(
  token: string,
  profileId: string,
  body: { documentName: string; recipient: string; applicationCaseId?: string | null },
) {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/edoc-links`, {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  })
  return unwrapData<{ id: string }>(raw)
}
