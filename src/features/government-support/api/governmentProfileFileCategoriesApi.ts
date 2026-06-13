import { apiRequest } from '../../../lib/apiClient'
import type { GovProfileFileCategory } from '../types/governmentProfile.types'

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

export async function fetchGovProfileFileCategories(
  token: string,
  profileId: string,
): Promise<GovProfileFileCategory[]> {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/file-categories`, {
    method: 'GET',
    token,
  })
  return unwrapList<GovProfileFileCategory>(raw)
}

export async function createGovProfileFileCategory(
  token: string,
  profileId: string,
  name: string,
  sortOrder?: number,
): Promise<GovProfileFileCategory> {
  const raw = await apiRequest<unknown>(`/api/government-support/profiles/${profileId}/file-categories`, {
    method: 'POST',
    token,
    body: JSON.stringify({ name, sortOrder }),
  })
  const row = unwrapData<GovProfileFileCategory>(raw)
  if (!row?.id) throw new Error('문서 분류 추가에 실패했습니다.')
  return row
}

export async function patchGovProfileFileCategory(
  token: string,
  profileId: string,
  categoryId: string,
  patch: { name?: string; sortOrder?: number },
): Promise<GovProfileFileCategory> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/profiles/${profileId}/file-categories/${categoryId}`,
    {
      method: 'PATCH',
      token,
      body: JSON.stringify(patch),
    },
  )
  const row = unwrapData<GovProfileFileCategory>(raw)
  if (!row?.id) throw new Error('문서 분류 수정에 실패했습니다.')
  return row
}

export async function deleteGovProfileFileCategory(
  token: string,
  profileId: string,
  categoryId: string,
): Promise<{ ok: boolean }> {
  const raw = await apiRequest<unknown>(
    `/api/government-support/profiles/${profileId}/file-categories/${categoryId}`,
    {
      method: 'DELETE',
      token,
    },
  )
  const data = unwrapData<{ ok?: boolean }>(raw)
  return { ok: data?.ok ?? true }
}
