import { apiRequest } from '../../../lib/apiClient'
import type { GovProfileApplication } from '../types/governmentProfile.types'

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

export async function fetchGovProfileApplications(
  token: string,
  profileId: string,
  opts?: { limit?: number; offset?: number },
): Promise<GovProfileApplication[]> {
  const q = new URLSearchParams()
  if (opts?.limit != null) q.set('limit', String(opts.limit))
  if (opts?.offset != null) q.set('offset', String(opts.offset))
  const suffix = q.toString() ? `?${q.toString()}` : ''
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/applications${suffix}`, {
    method: 'GET',
    token,
  })
  return unwrapList<GovProfileApplication>(raw)
}

export async function fetchGovProfileApplication(
  token: string,
  profileId: string,
  applicationId: string,
): Promise<GovProfileApplication> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/profiles/${profileId}/applications/${applicationId}`,
    { method: 'GET', token },
  )
  const row = unwrapData<GovProfileApplication>(raw)
  if (!row) throw new Error('신청을 불러오지 못했습니다.')
  return row
}

export async function createGovProfileApplication(
  token: string,
  profileId: string,
  payload: {
    title: string
    content: string
    applicationType?: string
    status?: string
  },
): Promise<GovProfileApplication> {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/applications`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
  const row = unwrapData<GovProfileApplication>(raw)
  if (!row) throw new Error('신청 저장에 실패했습니다.')
  return row
}

export async function patchGovProfileApplication(
  token: string,
  profileId: string,
  applicationId: string,
  patch: {
    title?: string
    content?: string
    applicationType?: string
    status?: string
  },
): Promise<GovProfileApplication> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/profiles/${profileId}/applications/${applicationId}`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify(patch),
    },
  )
  const row = unwrapData<GovProfileApplication>(raw)
  if (!row) throw new Error('신청 수정에 실패했습니다.')
  return row
}

export async function deleteGovProfileApplication(
  token: string,
  profileId: string,
  applicationId: string,
): Promise<{ ok: boolean }> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/profiles/${profileId}/applications/${applicationId}`,
    { method: 'DELETE', token },
  )
  const data = unwrapData<{ ok?: boolean }>(raw)
  return { ok: data?.ok !== false }
}
