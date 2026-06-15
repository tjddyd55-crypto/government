import { ApiError, apiRequest, resolveApiUrl } from '../../../lib/apiClient'
import type { PdfFieldSpec, PdfTemplateDetail, PdfTemplateSummary } from '../../pdf-engine/types'
import type { GovernmentSignatureScopePayload } from '../hooks/useGovernmentSignatureScopeFields'

export type GovSignaturePdfTemplateListItem = PdfTemplateSummary & {
  govTenantId?: number | null
  tenantName?: string | null
  fieldCount?: number
  linkedTemplateCount?: number
}

const BASE = '/api/government-support/signature-templates/pdf'

function scopeFields(scope?: GovernmentSignatureScopePayload): Record<string, string> {
  if (!scope) {
    return {}
  }
  const out: Record<string, string> = { scopeType: scope.scopeType }
  if (scope.scopeType === 'agency' && scope.tenantId) {
    out.tenantId = scope.tenantId
  }
  return out
}

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export async function listGovSignaturePdfTemplates(
  token: string,
): Promise<{ templates: GovSignaturePdfTemplateListItem[] }> {
  const body = await apiRequest<{ templates?: GovSignaturePdfTemplateListItem[] }>(BASE, { method: 'GET', token })
  const raw = body as { templates?: GovSignaturePdfTemplateListItem[] }
  if (!raw?.templates || !Array.isArray(raw.templates)) {
    throw new ApiError('PDF 템플릿 목록 응답 형식이 올바르지 않습니다.', 500)
  }
  return { templates: raw.templates }
}

export async function getGovSignaturePdfTemplate(token: string, id: number): Promise<PdfTemplateDetail> {
  const body = await apiRequest<{ template?: PdfTemplateSummary; fields?: PdfFieldSpec[] }>(
    `${BASE}/${id}`,
    { method: 'GET', token },
  )
  const raw = body as { template?: PdfTemplateSummary; fields?: PdfFieldSpec[] }
  if (!raw?.template?.id) {
    throw new ApiError('PDF 템플릿을 찾을 수 없습니다.', 404)
  }
  return {
    template: raw.template,
    fields: Array.isArray(raw.fields) ? raw.fields : [],
  }
}

export async function uploadGovSignaturePdfTemplateFile(
  token: string,
  file: File,
  scope?: GovernmentSignatureScopePayload,
): Promise<{ storageKey: string; pageCount: number; code: string }> {
  const fd = new FormData()
  fd.append('pdf', file)
  for (const [key, value] of Object.entries(scopeFields(scope))) {
    fd.append(key, value)
  }
  const body = await apiRequest<{ storageKey?: string; pageCount?: number; code?: string }>(
    `${BASE}/upload`,
    { method: 'POST', token, body: fd },
  )
  const raw = body as { storageKey?: string; pageCount?: number; code?: string }
  if (!raw?.storageKey) {
    throw new ApiError('PDF 업로드 응답이 올바르지 않습니다.', 500)
  }
  return {
    storageKey: raw.storageKey,
    pageCount: Number(raw.pageCount) || 1,
    code: String(raw.code ?? ''),
  }
}

export async function createGovSignaturePdfTemplate(
  token: string,
  payload: {
    title: string
    description?: string
    storageKey: string
    pageCount: number
    scope?: GovernmentSignatureScopePayload
  },
): Promise<{ template: PdfTemplateSummary }> {
  const body = await apiRequest<{ template?: PdfTemplateSummary }>(BASE, {
    method: 'POST',
    token,
    body: JSON.stringify({
      title: payload.title,
      description: payload.description ?? '',
      storageKey: payload.storageKey,
      pageCount: payload.pageCount,
      ...scopeFields(payload.scope),
    }),
  })
  const raw = body as { template?: PdfTemplateSummary }
  if (!raw?.template?.id) {
    throw new ApiError('PDF 템플릿 생성 응답이 올바르지 않습니다.', 500)
  }
  return { template: raw.template }
}

export async function saveGovSignaturePdfTemplateFields(
  token: string,
  id: number,
  fields: PdfFieldSpec[],
): Promise<{ fields: PdfFieldSpec[] }> {
  const body = await apiRequest<{ fields?: PdfFieldSpec[] }>(`${BASE}/${id}/fields`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ fields }),
  })
  const raw = body as { fields?: PdfFieldSpec[] }
  return { fields: Array.isArray(raw.fields) ? raw.fields : [] }
}

export async function fetchGovSignaturePdfTemplateFile(token: string, id: number): Promise<ArrayBuffer> {
  const url = resolveApiUrl(`${BASE}/${id}/file`)
  const res = await fetch(url, { method: 'GET', headers: authHeader(token) })
  if (!res.ok) {
    throw new ApiError('PDF 파일을 불러오지 못했습니다.', res.status)
  }
  return res.arrayBuffer()
}
