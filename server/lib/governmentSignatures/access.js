/**
 * 정부지원 전자서명 접근 제어.
 * - program user: 본인 사업장·본인 템플릿
 * - 대행사 관리자/직원: tenant 범위 사업장 발송·내역, 본인이 만든 템플릿/PDF
 * @module governmentSignatures/access
 */

import {
  canAccessGovernmentTenant,
  isGovernmentProgramUser,
  isGovernmentSuperAdmin,
} from '../governmentSupport/governmentAccess.js'
import { canManageGovernmentOperations, getOperationalTenantIds } from '../governmentSupport/governmentOperationsAccess.js'

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
    return { mode: 'program', userId }
  }
  const tenantIds = getOperationalTenantIds(ctx)
  if (tenantIds.length === 0) {
    return null
  }
  return { mode: 'operational', userId, tenantIds }
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
export async function assertGovSignatureTemplateAccess(pool, templateId, ownerUserId, allowDraft = true) {
  const tid = String(templateId ?? '').trim()
  const uid = String(ownerUserId ?? '').trim()
  if (!tid || !uid) {
    return { row: null, error: '템플릿을 찾을 수 없습니다.', status: 404 }
  }
  const r = await pool.query(
    `SELECT * FROM gov_signature_templates WHERE id = $1 AND owner_user_id = $2 LIMIT 1`,
    [tid, uid],
  )
  const row = r.rows[0]
  if (!row) {
    return { row: null, error: '템플릿을 찾을 수 없습니다.', status: 404 }
  }
  if (!allowDraft && String(row.status) !== 'active') {
    return { row: null, error: '활성 템플릿만 사용할 수 있습니다.', status: 403 }
  }
  return { row, error: null, status: 200 }
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
