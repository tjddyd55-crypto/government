/**
 * 공지/자료실 운영 접근 제어 (유저 사업장 데이터와 분리).
 * - 업종 관리자·super: global 범위 CRUD
 * - 대행사 관리자·직원: 소속 tenant agency 범위 CRUD
 * @module governmentOperationsAccess
 */
import {
  isGovernmentIndustryAdmin,
  isGovernmentProgramUser,
  isGovernmentSuperAdmin,
} from './governmentAccess.js'
import { GOVERNMENT_SCOPE_AGENCY, GOVERNMENT_SCOPE_GLOBAL } from './governmentOperationsConstants.js'

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export function canManageGovernmentOperations(ctx) {
  if (!ctx || isGovernmentProgramUser(ctx)) {
    return false
  }
  if (isGovernmentSuperAdmin(ctx) || isGovernmentIndustryAdmin(ctx)) {
    return true
  }
  return (
    (ctx.governmentAgencyAdminTenantIds?.length ?? 0) > 0 ||
    (ctx.governmentStaffTenantIds?.length ?? 0) > 0
  )
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export function isGovernmentAgencyAdmin(ctx) {
  return (ctx.governmentAgencyAdminTenantIds?.length ?? 0) > 0
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export function canCreateGlobalScope(ctx) {
  return isGovernmentSuperAdmin(ctx) || isGovernmentIndustryAdmin(ctx)
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @returns {string[]}
 */
export function getOperationalTenantIds(ctx) {
  const ids = new Set([
    ...(ctx.governmentAgencyAdminTenantIds ?? []),
    ...(ctx.governmentStaffTenantIds ?? []),
  ])
  return [...ids]
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {{ tenant_id?: string|number|null, scope_type?: string|null, created_by_user_id?: string|null }} row
 */
export function canDeleteOperationalRecord(ctx, row) {
  const scopeType = String(row?.scope_type ?? GOVERNMENT_SCOPE_AGENCY)
  const tenantId = row?.tenant_id != null ? String(row.tenant_id) : null
  if (scopeType === GOVERNMENT_SCOPE_GLOBAL) {
    return canCreateGlobalScope(ctx)
  }
  if ((ctx.governmentAgencyAdminTenantIds ?? []).includes(tenantId ?? '')) {
    return true
  }
  return String(row?.created_by_user_id ?? '') === String(ctx.userId)
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {string|null|undefined} tenantId
 * @param {string} scopeType
 */
export function canWriteOperationalScope(ctx, tenantId, scopeType) {
  const scope = String(scopeType ?? GOVERNMENT_SCOPE_AGENCY)
  if (scope === GOVERNMENT_SCOPE_GLOBAL) {
    return canCreateGlobalScope(ctx)
  }
  const tid = tenantId != null ? String(tenantId).trim() : ''
  if (!tid) {
    return false
  }
  const ids = getOperationalTenantIds(ctx)
  return ids.includes(tid)
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {{ tenant_id?: string|number|null, scope_type?: string|null, status?: string|null, created_by_user_id?: string|null }} row
 * @param {{ managerView?: boolean }} opts
 */
export function canReadOperationalRecord(ctx, row, opts = {}) {
  const managerView = Boolean(opts.managerView)
  const status = String(row?.status ?? 'draft')
  const scopeType = String(row?.scope_type ?? GOVERNMENT_SCOPE_AGENCY)
  const tenantId = row?.tenant_id != null ? String(row.tenant_id) : null

  if (scopeType === GOVERNMENT_SCOPE_GLOBAL) {
    if (managerView && canCreateGlobalScope(ctx)) {
      return true
    }
    if (status !== 'published') {
      return false
    }
    if (isGovernmentProgramUser(ctx)) {
      return true
    }
    return canCreateGlobalScope(ctx)
  }

  if (managerView && canManageGovernmentOperations(ctx)) {
    const ids = getOperationalTenantIds(ctx)
    return tenantId != null && ids.includes(tenantId)
  }

  if (status !== 'published') {
    return false
  }

  if (isGovernmentProgramUser(ctx)) {
    return tenantId != null && getProgramUserTenantIds(ctx).includes(tenantId)
  }

  if (canManageGovernmentOperations(ctx)) {
    const ids = getOperationalTenantIds(ctx)
    return tenantId != null && ids.includes(tenantId)
  }

  return false
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export function getProgramUserTenantIds(ctx) {
  return (ctx.governmentProgramUserTenantIds ?? []).map(String)
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {{ managerView?: boolean, status?: string|null, category?: string|null, q?: string|null, tenantId?: string|null }} filters
 * @param {'notice'|'resource'} kind
 */
export function buildOperationalListQuery(ctx, filters = {}, kind = 'notice', alias = 'n') {
  const managerView = Boolean(filters.managerView)
  const params = []
  const where = []
  const col = (name) => `${alias}.${name}`
  const bodyCol = kind === 'notice' ? col('content') : col('description')

  if (managerView && canManageGovernmentOperations(ctx)) {
    if (canCreateGlobalScope(ctx)) {
      if (filters.status) {
        params.push(String(filters.status))
        where.push(`${col('status')} = $${params.length}`)
      }
    } else {
      const ids = getOperationalTenantIds(ctx)
      if (ids.length === 0) {
        return { ok: false, status: 403, message: '조회 권한이 없습니다.' }
      }
      params.push(ids)
      where.push(`${col('tenant_id')}::text = ANY($${params.length}::text[])`)
      if (filters.status) {
        params.push(String(filters.status))
        where.push(`${col('status')} = $${params.length}`)
      }
    }
  } else {
    params.push('published')
    where.push(`${col('status')} = $${params.length}`)
    if (isGovernmentProgramUser(ctx)) {
      const ids = getProgramUserTenantIds(ctx)
      if (ids.length === 0) {
        return { ok: false, status: 403, message: '조회 권한이 없습니다.' }
      }
      params.push(ids)
      where.push(`(${col('scope_type')} = '${GOVERNMENT_SCOPE_GLOBAL}' OR ${col('tenant_id')}::text = ANY($${params.length}::text[]))`)
    } else {
      return { ok: false, status: 403, message: '조회 권한이 없습니다.' }
    }
  }

  if (filters.category) {
    params.push(String(filters.category))
    where.push(`${col('category')} = $${params.length}`)
  }
  if (filters.q) {
    params.push(`%${String(filters.q).trim()}%`)
    where.push(`(${col('title')} ILIKE $${params.length} OR ${bodyCol} ILIKE $${params.length})`)
  }

  return {
    ok: true,
    whereSql: where.length > 0 ? where.join(' AND ') : 'TRUE',
    params,
  }
}
