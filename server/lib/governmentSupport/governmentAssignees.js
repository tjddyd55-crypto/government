/**
 * 정부지원 CRM — 문의·요청서류 담당자(assigned_to_user_id) 공통 로직.
 * @module governmentAssignees
 */
import {
  isGovernmentIndustryAdmin,
  isGovernmentProgramUser,
  isGovernmentSuperAdmin,
} from './governmentAccess.js'

const OPERATIONAL_ROLES = Object.freeze(['government_staff', 'government_agency_admin'])

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export function canManageGovernmentAssignee(ctx) {
  if (isGovernmentProgramUser(ctx)) {
    return false
  }
  if (isGovernmentIndustryAdmin(ctx) && !isGovernmentSuperAdmin(ctx)) {
    return false
  }
  return (
    isGovernmentSuperAdmin(ctx) ||
    (ctx.governmentAgencyAdminTenantIds?.length ?? 0) > 0 ||
    (ctx.governmentStaffTenantIds?.length ?? 0) > 0
  )
}

/**
 * @param {unknown} raw
 * @param {string} currentUserId
 */
export function parseGovernmentAssigneeQuery(raw, currentUserId) {
  const v = String(raw ?? '').trim()
  if (!v) {
    return { kind: 'all' }
  }
  if (v.toLowerCase() === 'me') {
    return { kind: 'me', userId: String(currentUserId ?? '').trim() }
  }
  if (v.toLowerCase() === 'unassigned') {
    return { kind: 'unassigned' }
  }
  return { kind: 'user', userId: v }
}

/**
 * @param {{
 *   filter: ReturnType<typeof parseGovernmentAssigneeQuery>,
 *   tableAlias: string,
 *   params: unknown[],
 *   currentUserId: string,
 * }} opts
 */
export function appendGovernmentAssigneeFilterSql(opts) {
  const { filter, tableAlias, params, currentUserId } = opts
  const col = `${tableAlias}.assigned_to_user_id`
  if (filter.kind === 'me') {
    const uid = filter.userId || currentUserId
    if (!uid) {
      return ''
    }
    params.push(uid)
    return ` AND ${col} = $${params.length}`
  }
  if (filter.kind === 'unassigned') {
    return ` AND ${col} IS NULL`
  }
  if (filter.kind === 'user' && filter.userId) {
    params.push(filter.userId)
    return ` AND ${col} = $${params.length}`
  }
  return ''
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} pool
 * @param {string|number} tenantId
 * @param {string|null|undefined} assigneeUserId
 */
export async function validateGovernmentOperationalAssignee(pool, tenantId, assigneeUserId) {
  const tid = String(tenantId ?? '').trim()
  if (!tid) {
    return { ok: false, status: 400, message: '테넌트 정보가 없습니다.' }
  }
  const uid = assigneeUserId != null ? String(assigneeUserId).trim() : ''
  if (!uid) {
    return { ok: true, assigneeUserId: null }
  }
  const r = await pool.query(
    `
    SELECT 1
    FROM user_memberships m
    WHERE m.user_id = $1
      AND m.tenant_id = $2::bigint
      AND m.role = ANY($3::text[])
      AND COALESCE(m.status, 'active') = 'active'
    LIMIT 1
    `,
    [uid, tid, OPERATIONAL_ROLES],
  )
  if ((r.rowCount ?? 0) === 0) {
    return { ok: false, status: 400, message: '해당 대행사의 운영 직원만 담당자로 지정할 수 있습니다.' }
  }
  return { ok: true, assigneeUserId: uid }
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapAssigneeDisplayFields(row) {
  return {
    assignedToUserId: row.assigned_to_user_id != null ? String(row.assigned_to_user_id) : null,
    assignedToDisplayName:
      row.assigned_to_user_id != null
        ? String(row.assigned_to_display_name ?? row.assigned_to_username ?? '').trim() || null
        : null,
  }
}
