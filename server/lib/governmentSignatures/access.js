/**
 * 정부지원 전자서명 접근 제어.
 * - program user: 본인 사업장·본인 템플릿(owner_user_id)
 * - 대행사 관리자/직원: tenant 범위 공용 템플릿·PDF·발송·내역
 * @module governmentSignatures/access
 */

import {
  canAccessGovernmentTenant,
  isGovernmentProgramUser,
  isGovernmentSuperAdmin,
} from '../governmentSupport/governmentAccess.js'
import {
  canManageGovernmentOperations,
  getOperationalTenantIds,
  getProgramUserTenantIds,
} from '../governmentSupport/governmentOperationsAccess.js'

/**
 * @param {import('express').Request} req
 * @returns {string | null}
 */
export function getAuthUserId(req) {
  const id = req.user?.id ?? req.user?.userId
  return id != null && String(id).trim() ? String(id).trim() : null
}

/**
 * @param {import('express').Request} req
 * @returns {import('../platformRbac.js').EffectivePlatformContext | undefined}
 */
export function getGovernmentSignaturePlatformContext(req) {
  return /** @type {import('express').Request & { platformContext?: import('../platformRbac.js').EffectivePlatformContext }} */ (
    req
  ).platformContext
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext | undefined} ctx
 */
export function canAccessGovernmentSignatureAccount(ctx) {
  if (!ctx) {
    return false
  }
  if (isGovernmentProgramUser(ctx)) {
    return true
  }
  if (isGovernmentSuperAdmin(ctx)) {
    return true
  }
  return canManageGovernmentOperations(ctx)
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext | undefined} ctx
 */
export function isGovernmentSignatureOperationalActor(ctx) {
  if (!ctx || isGovernmentProgramUser(ctx)) {
    return false
  }
  if (isGovernmentSuperAdmin(ctx)) {
    return true
  }
  return canManageGovernmentOperations(ctx)
}

/**
 * @param {import('express').Request} req
 * @returns {{ mode: 'program'; userId: string } | { mode: 'operational'; userId: string; tenantIds: string[] } | null}
 */
export function resolveGovernmentSignatureAccessScope(req) {
  const ctx = getGovernmentSignaturePlatformContext(req)
  const userId = getAuthUserId(req)
  if (!ctx || !userId || !canAccessGovernmentSignatureAccount(ctx)) {
    return null
  }
  if (isGovernmentProgramUser(ctx)) {
    const tenantIds = getProgramUserTenantIds(ctx)
    return { mode: 'program', userId, tenantIds }
  }
  const tenantIds = getOperationalTenantIds(ctx)
  if (tenantIds.length === 0) {
    return null
  }
  return { mode: 'operational', userId, tenantIds }
}

/**
 * 템플릿/PDF 생성 시 저장할 tenant_id (operational·program 공통).
 * @param {import('express').Request} req
 * @returns {string | null}
 */
export function resolveGovSignatureTemplateTenantId(req) {
  const scope = resolveGovernmentSignatureAccessScope(req)
  if (!scope) {
    return null
  }
  if (scope.mode === 'operational') {
    if (scope.tenantIds.length === 1) {
      return scope.tenantIds[0]
    }
    const raw = req.body?.tenantId ?? req.body?.tenant_id ?? req.query?.tenantId ?? req.query?.tenant_id
    if (raw != null && String(raw).trim()) {
      const tid = String(raw).trim()
      if (scope.tenantIds.includes(tid)) {
        return tid
      }
    }
    return scope.tenantIds[0] ?? null
  }
  const ctx = getGovernmentSignaturePlatformContext(req)
  const programTenants = getProgramUserTenantIds(ctx)
  return programTenants[0] ?? null
}

/**
 * @param {{ mode: 'program'; userId: string } | { mode: 'operational'; userId: string; tenantIds: string[] }} scope
 * @param {string} [alias]
 */
export function buildGovSignatureTemplateListWhere(scope, alias = 't') {
  if (!scope) {
    return { sql: 'FALSE', params: [] }
  }
  if (scope.mode === 'program') {
    const tenantIds = scope.tenantIds ?? []
    if (tenantIds.length === 0) {
      return { sql: `${alias}.owner_user_id = $1`, params: [scope.userId] }
    }
    return {
      sql: `(${alias}.owner_user_id = $1 OR ${alias}.tenant_id::text = ANY($2::text[]))`,
      params: [scope.userId, tenantIds],
    }
  }
  if (scope.tenantIds.length === 0) {
    return { sql: 'FALSE', params: [] }
  }
  return { sql: `${alias}.tenant_id::text = ANY($1::text[])`, params: [scope.tenantIds] }
}

/**
 * @param {import('express').Request} req
 * @param {{ owner_user_id?: unknown, tenant_id?: unknown }} row
 */
export function canAccessGovSignatureTemplateRow(req, row) {
  const scope = resolveGovernmentSignatureAccessScope(req)
  if (!scope || !row) {
    return false
  }
  if (scope.mode === 'program') {
    if (String(row.owner_user_id ?? '') === scope.userId) {
      return true
    }
    const tid = row.tenant_id != null ? String(row.tenant_id) : ''
    const tenantIds = scope.tenantIds ?? getProgramUserTenantIds(getGovernmentSignaturePlatformContext(req) ?? {})
    return Boolean(tid && tenantIds.includes(tid))
  }
  const tid = row.tenant_id != null ? String(row.tenant_id) : ''
  if (tid && scope.tenantIds.includes(tid)) {
    return true
  }
  return String(row.owner_user_id ?? '') === scope.userId
}

/**
 * @param {import('express').Request} req
 * @param {{ gov_owner_user_id?: unknown, gov_tenant_id?: unknown }} row
 */
export function canAccessGovPdfTemplateRow(req, row) {
  const scope = resolveGovernmentSignatureAccessScope(req)
  if (!scope || !row) {
    return false
  }
  if (row.gov_owner_user_id == null && row.gov_tenant_id == null) {
    return false
  }
  if (scope.mode === 'program') {
    return String(row.gov_owner_user_id ?? '') === scope.userId
  }
  const tid = row.gov_tenant_id != null ? String(row.gov_tenant_id) : ''
  if (tid && scope.tenantIds.includes(tid)) {
    return true
  }
  return String(row.gov_owner_user_id ?? '') === scope.userId
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} executor
 * @param {number|string} pdfTemplateId
 */
export async function loadGovPdfTemplateRow(executor, pdfTemplateId) {
  const id = Number(pdfTemplateId)
  if (!Number.isInteger(id) || id < 1) {
    return null
  }
  const r = await executor.query(
    `
    SELECT id, title, storage_key, page_count, is_active, gov_owner_user_id, gov_tenant_id
    FROM pdf_templates
    WHERE id = $1
    LIMIT 1
    `,
    [id],
  )
  return r.rows[0] ?? null
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} executor
 * @param {string} templateId
 * @param {import('express').Request} req
 * @param {{ allowDraft?: boolean }} [opts]
 */
export async function assertGovernmentSignatureTemplateAccess(executor, templateId, req, opts = {}) {
  const scope = resolveGovernmentSignatureAccessScope(req)
  if (!scope) {
    return { row: null, error: '전자서명 권한이 없습니다.', status: 403 }
  }
  const tid = String(templateId ?? '').trim()
  if (!tid) {
    return { row: null, error: '템플릿을 찾을 수 없습니다.', status: 404 }
  }
  const r = await executor.query(`SELECT * FROM gov_signature_templates WHERE id = $1 LIMIT 1`, [tid])
  const row = r.rows[0]
  if (!row) {
    return { row: null, error: '템플릿을 찾을 수 없습니다.', status: 404 }
  }
  if (!canAccessGovSignatureTemplateRow(req, row)) {
    return { row: null, error: '템플릿에 접근할 수 없습니다.', status: 403 }
  }
  const allowDraft = opts.allowDraft !== false
  if (!allowDraft && String(row.status) !== 'active') {
    return { row: null, error: '활성 템플릿만 사용할 수 있습니다.', status: 403 }
  }
  return { row, error: null, status: 200 }
}

/**
 * @param {{ mode: 'program'; userId: string } | { mode: 'operational'; userId: string; tenantIds: string[] }} scope
 * @param {string} [aliasS]
 * @param {string} [aliasP]
 */
export function buildSignatureSendSessionListWhere(scope, aliasS = 's', aliasP = 'p') {
  if (scope.mode === 'program') {
    return {
      sql: `${aliasS}.sent_by_user_id = $1 AND ${aliasP}.owner_user_id = $1`,
      params: [scope.userId],
    }
  }
  return {
    sql: `${aliasP}.tenant_id::text = ANY($1::text[])`,
    params: [scope.tenantIds],
  }
}

/**
 * @param {{ mode: 'program'; userId: string } | { mode: 'operational'; userId: string; tenantIds: string[] }} scope
 * @param {string} [aliasS]
 * @param {string} [aliasP]
 */
export function buildSignatureSendSessionAccessWhere(scope, aliasS = 's', aliasP = 'p') {
  if (scope.mode === 'program') {
    return {
      sql: `${aliasS}.id = $1 AND ${aliasS}.sent_by_user_id = $2 AND ${aliasP}.owner_user_id = $2`,
      params: (sessionId) => [sessionId, scope.userId],
    }
  }
  return {
    sql: `${aliasS}.id = $1 AND ${aliasP}.tenant_id::text = ANY($2::text[])`,
    params: (sessionId) => [sessionId, scope.tenantIds],
  }
}

/**
 * @param {unknown} _raw
 * @returns {null}
 */
export function parseGovOwnerUserId(_raw) {
  return null
}

/**
 * @param {import('express').Request} req
 * @returns {Promise<string | null>}
 */
export async function resolveGovSignatureOwnerUserId(_pool, req) {
  return getAuthUserId(req)
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} pool
 * @param {string} templateId
 * @param {string} ownerUserId
 * @param {boolean} allowDraft
 */
export async function assertGovSignatureTemplateAccess(pool, templateId, req, allowDraft = true) {
  const acc = await assertGovernmentSignatureTemplateAccess(pool, templateId, req, { allowDraft })
  if (acc.error) {
    return { row: null, error: acc.error, status: acc.status ?? 404 }
  }
  return { row: acc.row, error: null, status: 200 }
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} client
 * @param {number|string} profileId
 * @param {import('express').Request} req
 */
export async function assertGovProfileForSignatureSend(client, profileId, req) {
  const scope = resolveGovernmentSignatureAccessScope(req)
  const uid = getAuthUserId(req)
  if (!uid) {
    return { error: '로그인이 필요합니다.', status: 401 }
  }
  if (!scope) {
    return { error: '전자서명 권한이 없습니다.', status: 403 }
  }
  const pid = Number(profileId)
  if (!Number.isInteger(pid) || pid < 1) {
    return { error: '사업장을 찾을 수 없습니다.', status: 404 }
  }

  let r
  if (scope.mode === 'program') {
    r = await client.query(
      `
      SELECT id, phone, owner_user_id, tenant_id, customer_name, business_name
      FROM gov_support_profiles
      WHERE id = $1::bigint AND owner_user_id = $2
      LIMIT 1
      `,
      [pid, scope.userId],
    )
  } else {
    r = await client.query(
      `
      SELECT id, phone, owner_user_id, tenant_id, customer_name, business_name
      FROM gov_support_profiles
      WHERE id = $1::bigint AND tenant_id::text = ANY($2::text[])
      LIMIT 1
      `,
      [pid, scope.tenantIds],
    )
  }

  const row = r.rows[0]
  if (!row) {
    return { error: '사업장을 찾을 수 없습니다.', status: 404 }
  }
  if (scope.mode === 'operational') {
    const tenantId = row.tenant_id != null ? String(row.tenant_id) : ''
    if (!tenantId || !canAccessGovernmentTenant(getGovernmentSignaturePlatformContext(req), tenantId)) {
      return { error: '사업장을 찾을 수 없습니다.', status: 404 }
    }
  }
  return { row }
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} sendSessionId
 * @param {string} ownerUserId
 */
export async function assertGovSignatureSendSessionAccess(pool, sendSessionId, ownerUserId) {
  const r = await pool.query(
    `SELECT * FROM gov_signature_send_sessions WHERE id = $1 AND owner_user_id = $2 LIMIT 1`,
    [sendSessionId, ownerUserId],
  )
  return r.rows[0] ?? null
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} profileId
 * @param {string} ownerUserId
 */
export async function assertGovProfileOwnedByUser(pool, profileId, ownerUserId) {
  const r = await pool.query(
    `SELECT id, tenant_id, owner_user_id, customer_name, business_name, phone
     FROM gov_support_profiles WHERE id = $1::bigint AND owner_user_id = $2 LIMIT 1`,
    [profileId, ownerUserId],
  )
  return r.rows[0] ?? null
}

/**
 * program user 또는 대행사 운영(관리자/직원) 계정.
 */
export function requireGovernmentSignatureAccount(req, res, next) {
  const uid = getAuthUserId(req)
  if (!uid) {
    res.status(401).json({ ok: false, message: '로그인이 필요합니다.' })
    return
  }
  const ctx = getGovernmentSignaturePlatformContext(req)
  if (!canAccessGovernmentSignatureAccount(ctx)) {
    res.status(403).json({ ok: false, message: '전자서명 기능을 사용할 권한이 없습니다.' })
    return
  }
  next()
}

/** @deprecated requireGovernmentSignatureAccount 사용 */
export function requireGovernmentProgramUserSignature(req, res, next) {
  requireGovernmentSignatureAccount(req, res, next)
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function attachGovernmentSignatureContext(req, _res, next) {
  req.governmentSignatureOwnerUserId = getAuthUserId(req)
  next()
}
