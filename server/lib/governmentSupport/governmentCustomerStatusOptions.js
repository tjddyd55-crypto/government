/**
 * 대행사별 고객상태 드롭다운 옵션 CRUD.
 * @module governmentCustomerStatusOptions
 */
import {
  canAccessGovernmentTenant,
  isGovernmentAgencyCustomerManager,
  isGovernmentIndustryAdmin,
  isGovernmentProgramUser,
  isGovernmentSuperAdmin,
} from './governmentAccess.js'

export const DEFAULT_CUSTOMER_STATUS_OPTIONS = Object.freeze([
  { label: '신규', color: '#94A3B8', sortOrder: 10 },
  { label: '상담중', color: '#60A5FA', sortOrder: 20 },
  { label: '서류준비', color: '#FBBF24', sortOrder: 30 },
  { label: '접수완료', color: '#34D399', sortOrder: 40 },
  { label: '보류', color: '#FB923C', sortOrder: 50 },
  { label: '완료', color: '#A78BFA', sortOrder: 60 },
])

/**
 * @param {Record<string, unknown>} row
 */
export function mapCustomerStatusOptionRow(row) {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    label: String(row.label ?? ''),
    color: String(row.color ?? '#94A3B8'),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: row.is_active !== false,
    createdByUserId: row.created_by_user_id != null ? String(row.created_by_user_id) : null,
    createdAt: row.created_at != null ? String(row.created_at) : null,
    updatedAt: row.updated_at != null ? String(row.updated_at) : null,
    archivedAt: row.archived_at != null ? String(row.archived_at) : null,
    usageCount: row.usage_count != null ? Number(row.usage_count) : undefined,
  }
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {string} tenantId
 */
export function canManageCustomerStatusOptions(ctx, tenantId) {
  if (isGovernmentSuperAdmin(ctx) || isGovernmentIndustryAdmin(ctx)) {
    return canAccessGovernmentTenant(ctx, tenantId)
  }
  return (ctx.governmentAgencyAdminTenantIds ?? []).map(String).includes(String(tenantId))
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export function canReadCustomerStatusOptions(ctx) {
  return isGovernmentProgramUser(ctx) || isGovernmentAgencyCustomerManager(ctx)
}

/**
 * @param {import('pg').Pool | { query: Function }} pool
 * @param {string} tenantId
 * @param {string|null} actorUserId
 */
export async function ensureDefaultCustomerStatusOptions(pool, tenantId, actorUserId = null) {
  const existing = await pool.query(
    `SELECT COUNT(*)::int AS c FROM gov_customer_status_options WHERE tenant_id = $1::bigint AND archived_at IS NULL`,
    [tenantId],
  )
  if (Number(existing.rows[0]?.c ?? 0) > 0) {
    return { seeded: false, count: Number(existing.rows[0].c) }
  }

  for (const opt of DEFAULT_CUSTOMER_STATUS_OPTIONS) {
    await pool.query(
      `
      INSERT INTO gov_customer_status_options (
        tenant_id, label, color, sort_order, is_active, created_by_user_id
      )
      SELECT $1::bigint, $2, $3, $4, true, $5
      WHERE NOT EXISTS (
        SELECT 1 FROM gov_customer_status_options
        WHERE tenant_id = $1::bigint
          AND LOWER(TRIM(label)) = LOWER(TRIM($2))
          AND archived_at IS NULL
      )
      `,
      [tenantId, opt.label, opt.color, opt.sortOrder, actorUserId],
    )
  }
  return { seeded: true, count: DEFAULT_CUSTOMER_STATUS_OPTIONS.length }
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {{ tenantId?: string, includeInactive?: boolean }} [filters]
 */
export async function listCustomerStatusOptions(pool, ctx, filters = {}) {
  const tenantId = String(filters.tenantId ?? '').trim()
  if (!tenantId) {
    return { ok: false, status: 400, message: 'tenantId 가 필요합니다.' }
  }
  if (!canReadCustomerStatusOptions(ctx) || !canAccessGovernmentTenant(ctx, tenantId)) {
    return { ok: false, status: 403, message: '고객상태 옵션 조회 권한이 없습니다.' }
  }

  await ensureDefaultCustomerStatusOptions(pool, tenantId, ctx.userId ?? null)

  const includeInactive = filters.includeInactive === true
  const r = await pool.query(
    `
    SELECT o.*,
      (
        SELECT COUNT(*)::int
        FROM gov_support_profiles p
        WHERE p.customer_status_option_id = o.id
          AND p.archived_at IS NULL
      ) AS usage_count
    FROM gov_customer_status_options o
    WHERE o.tenant_id = $1::bigint
      AND o.archived_at IS NULL
      AND ($2::boolean OR o.is_active = true)
    ORDER BY o.sort_order ASC, o.id ASC
    `,
    [tenantId, includeInactive],
  )
  return { ok: true, data: r.rows.map(mapCustomerStatusOptionRow) }
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {object} body
 */
export async function createCustomerStatusOption(pool, ctx, body) {
  const tenantId = String(body.tenantId ?? body.tenant_id ?? '').trim()
  const label = String(body.label ?? '').trim()
  if (!tenantId || !label) {
    return { ok: false, status: 400, message: 'tenantId 와 label 이 필요합니다.' }
  }
  if (!canManageCustomerStatusOptions(ctx, tenantId)) {
    return { ok: false, status: 403, message: '고객상태 옵션 관리 권한이 없습니다.' }
  }

  const dup = await pool.query(
    `
    SELECT id FROM gov_customer_status_options
    WHERE tenant_id = $1::bigint
      AND LOWER(TRIM(label)) = LOWER(TRIM($2))
      AND archived_at IS NULL
    LIMIT 1
    `,
    [tenantId, label],
  )
  if ((dup.rowCount ?? 0) > 0) {
    return { ok: false, status: 409, message: '같은 이름의 고객상태가 이미 있습니다.' }
  }

  const sortOrder = Number(body.sortOrder ?? body.sort_order ?? 0)
  const color = String(body.color ?? '#94A3B8').trim() || '#94A3B8'
  const r = await pool.query(
    `
    INSERT INTO gov_customer_status_options (
      tenant_id, label, color, sort_order, is_active, created_by_user_id
    ) VALUES ($1::bigint, $2, $3, $4, true, $5)
    RETURNING *
    `,
    [tenantId, label, color, Number.isFinite(sortOrder) ? sortOrder : 0, ctx.userId ?? null],
  )
  return { ok: true, data: mapCustomerStatusOptionRow(r.rows[0]) }
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {string} optionId
 * @param {object} body
 */
export async function patchCustomerStatusOption(pool, ctx, optionId, body) {
  const existing = await pool.query(
    `SELECT * FROM gov_customer_status_options WHERE id = $1::bigint AND archived_at IS NULL`,
    [optionId],
  )
  if ((existing.rowCount ?? 0) === 0) {
    return { ok: false, status: 404, message: '고객상태 옵션을 찾을 수 없습니다.' }
  }
  const row = existing.rows[0]
  const tenantId = String(row.tenant_id)
  if (!canManageCustomerStatusOptions(ctx, tenantId)) {
    return { ok: false, status: 403, message: '고객상태 옵션 관리 권한이 없습니다.' }
  }

  const sets = []
  const vals = [optionId]
  let n = 2

  if (body.label !== undefined) {
    const label = String(body.label ?? '').trim()
    if (!label) return { ok: false, status: 400, message: 'label 이 비어 있습니다.' }
    sets.push(`label = $${n}`)
    vals.push(label)
    n += 1
  }
  if (body.color !== undefined) {
    sets.push(`color = $${n}`)
    vals.push(String(body.color ?? '#94A3B8'))
    n += 1
  }
  if (body.sortOrder !== undefined || body.sort_order !== undefined) {
    sets.push(`sort_order = $${n}`)
    vals.push(Number(body.sortOrder ?? body.sort_order ?? 0))
    n += 1
  }
  if (body.isActive !== undefined || body.is_active !== undefined) {
    sets.push(`is_active = $${n}`)
    vals.push(Boolean(body.isActive ?? body.is_active))
    n += 1
  }

  if (sets.length === 0) {
    return { ok: false, status: 400, message: '수정할 필드가 없습니다.' }
  }

  sets.push('updated_at = NOW()')
  const r = await pool.query(
    `UPDATE gov_customer_status_options SET ${sets.join(', ')} WHERE id = $1::bigint RETURNING *`,
    vals,
  )
  return { ok: true, data: mapCustomerStatusOptionRow(r.rows[0]) }
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {string} optionId
 */
export async function archiveCustomerStatusOption(pool, ctx, optionId) {
  const existing = await pool.query(
    `SELECT * FROM gov_customer_status_options WHERE id = $1::bigint AND archived_at IS NULL`,
    [optionId],
  )
  if ((existing.rowCount ?? 0) === 0) {
    return { ok: false, status: 404, message: '고객상태 옵션을 찾을 수 없습니다.' }
  }
  const tenantId = String(existing.rows[0].tenant_id)
  if (!canManageCustomerStatusOptions(ctx, tenantId)) {
    return { ok: false, status: 403, message: '고객상태 옵션 관리 권한이 없습니다.' }
  }

  const usage = await pool.query(
    `
    SELECT COUNT(*)::int AS c
    FROM gov_support_profiles
    WHERE customer_status_option_id = $1::bigint AND archived_at IS NULL
    `,
    [optionId],
  )
  const used = Number(usage.rows[0]?.c ?? 0) > 0

  if (used) {
    const r = await pool.query(
      `
      UPDATE gov_customer_status_options
      SET is_active = false, updated_at = NOW()
      WHERE id = $1::bigint
      RETURNING *
      `,
      [optionId],
    )
    return { ok: true, data: mapCustomerStatusOptionRow(r.rows[0]), soft: true }
  }

  const r = await pool.query(
    `
    UPDATE gov_customer_status_options
    SET archived_at = NOW(), is_active = false, updated_at = NOW()
    WHERE id = $1::bigint
    RETURNING *
    `,
    [optionId],
  )
  return { ok: true, data: mapCustomerStatusOptionRow(r.rows[0]), soft: false }
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} tenantId
 * @param {string|null|undefined} optionId
 */
export async function assertCustomerStatusOptionForTenant(pool, tenantId, optionId) {
  const oid = optionId != null ? String(optionId).trim() : ''
  if (!oid) return { ok: true, optionId: null }
  const r = await pool.query(
    `
    SELECT id FROM gov_customer_status_options
    WHERE id = $1::bigint
      AND tenant_id = $2::bigint
      AND archived_at IS NULL
      AND is_active = true
    LIMIT 1
    `,
    [oid, tenantId],
  )
  if ((r.rowCount ?? 0) === 0) {
    return { ok: false, status: 400, message: '유효하지 않은 고객상태입니다.' }
  }
  return { ok: true, optionId: oid }
}
