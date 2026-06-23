/**
 * PDF 템플릿 생성 scope 파싱·검증 (multipart JSON 공통).
 */
import { canAccessGovernmentTenant, isGovernmentSupportTenant } from '../governmentSupport/governmentAccess.js'
import { getGovernmentSignaturePlatformContext, resolveGovernmentSignatureAccessScope } from './access.js'

/**
 * @param {import('express').Request} req
 * @returns {{ scopeType: 'global' | 'agency', tenantId: string | null }}
 */
export function parseGovSignatureScopeInput(req) {
  const scopeTypeRaw = String(
    req.body?.scopeType ?? req.body?.scope_type ?? req.query?.scopeType ?? req.query?.scope_type ?? 'agency',
  ).trim()
  const scopeType = scopeTypeRaw === 'global' ? 'global' : 'agency'
  const raw =
    req.body?.tenantId ??
    req.body?.tenant_id ??
    req.body?.govTenantId ??
    req.body?.gov_tenant_id ??
    req.query?.tenantId ??
    req.query?.tenant_id
  const tenantId = raw != null && String(raw).trim() ? String(raw).trim() : null
  return { scopeType, tenantId }
}

/**
 * @param {import('express').Request} req
 * @param {import('pg').Pool} pool
 * @returns {Promise<{ ok: true, scopeType: 'global' | 'agency', tenantId: string | null } | { ok: false, status: number, message: string }>}
 */
export async function validateGovSignaturePdfTemplateScope(req, pool) {
  const accessScope = resolveGovernmentSignatureAccessScope(req)
  if (!accessScope) {
    return { ok: false, status: 403, message: '전자서명 권한이 필요합니다.' }
  }
  if (accessScope.mode === 'program') {
    return { ok: false, status: 403, message: 'PDF 템플릿 생성 권한이 없습니다.' }
  }

  const rawScopeType = req.body?.scopeType ?? req.body?.scope_type
  if (rawScopeType != null && String(rawScopeType).trim() === '') {
    return { ok: false, status: 400, message: '공개 범위를 선택해 주세요.' }
  }

  const { scopeType, tenantId } = parseGovSignatureScopeInput(req)
  const ctx = getGovernmentSignaturePlatformContext(req)

  if (accessScope.mode === 'operational') {
    if (scopeType === 'global') {
      return { ok: false, status: 403, message: '전체 범위 생성 권한이 없습니다.' }
    }
    if (tenantId && !accessScope.tenantIds.includes(tenantId)) {
      return { ok: false, status: 403, message: '선택한 대행사에 대한 권한이 없습니다.' }
    }
    const resolvedTenantId =
      tenantId && accessScope.tenantIds.includes(tenantId)
        ? tenantId
        : accessScope.tenantIds[0] ?? null
    if (!resolvedTenantId) {
      return { ok: false, status: 400, message: '대행사 tenant 정보가 없습니다.' }
    }
    return { ok: true, scopeType: 'agency', tenantId: resolvedTenantId }
  }

  if (scopeType === 'global') {
    return { ok: true, scopeType: 'global', tenantId: null }
  }

  if (!tenantId) {
    return { ok: false, status: 400, message: '대행사를 선택해 주세요.' }
  }
  if (!canAccessGovernmentTenant(ctx, tenantId)) {
    return { ok: false, status: 403, message: '선택한 대행사에 대한 권한이 없습니다.' }
  }
  const exists = await isGovernmentSupportTenant(pool, tenantId)
  if (!exists) {
    return { ok: false, status: 400, message: '선택한 대행사를 찾을 수 없습니다.' }
  }
  return { ok: true, scopeType: 'agency', tenantId }
}
