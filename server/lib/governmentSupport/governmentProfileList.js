/**
 * gov_support_profiles 목록 조회 (검색·필터 공통).
 */
import { mapGovSupportProfileRow } from './profileMapper.js'

const PROFILE_LIST_SELECT = `
  SELECT
    p.*,
    o.label AS customer_status_label,
    o.color AS customer_status_color,
    u.username AS owner_username,
    COALESCE(u.display_name, '') AS owner_display_name,
    (
      SELECT COUNT(*)::int
      FROM gov_support_profile_progress_events e
      WHERE e.profile_id = p.id AND e.archived_at IS NULL
    ) AS progress_event_count,
    (
      SELECT MAX(e.created_at)
      FROM gov_support_profile_progress_events e
      WHERE e.profile_id = p.id AND e.archived_at IS NULL
    ) AS latest_progress_at
  FROM gov_support_profiles p
  LEFT JOIN gov_customer_status_options o
    ON o.id = p.customer_status_option_id AND o.archived_at IS NULL
  LEFT JOIN users u ON u.id = p.owner_user_id
`

/**
 * @param {Record<string, unknown>} query
 */
export function parseProfileListFilters(query = {}) {
  return {
    q: String(query.q ?? query.search ?? '').trim(),
    customerStatusOptionId:
      query.customerStatusOptionId != null
        ? String(query.customerStatusOptionId).trim()
        : query.customer_status_option_id != null
          ? String(query.customer_status_option_id).trim()
          : '',
    businessType:
      query.businessType != null
        ? String(query.businessType).trim()
        : query.business_type != null
          ? String(query.business_type).trim()
          : '',
    ownerUserId:
      query.ownerUserId != null
        ? String(query.ownerUserId).trim()
        : query.owner_user_id != null
          ? String(query.owner_user_id).trim()
          : '',
  }
}

/**
 * @param {ReturnType<typeof parseProfileListFilters>} filters
 * @param {number} startIndex
 */
export function buildProfileListFilterClauses(filters, startIndex = 3) {
  const clauses = []
  const params = []
  let n = startIndex

  if (filters.q) {
    const like = `%${filters.q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`
    clauses.push(`(
      p.customer_name ILIKE $${n}
      OR p.phone ILIKE $${n}
      OR p.business_name ILIKE $${n}
      OR p.business_type ILIKE $${n}
      OR p.business_category ILIKE $${n}
      OR p.note ILIKE $${n}
    )`)
    params.push(like)
    n += 1
  }

  if (filters.customerStatusOptionId) {
    if (filters.customerStatusOptionId === 'none') {
      clauses.push('p.customer_status_option_id IS NULL')
    } else {
      clauses.push(`p.customer_status_option_id = $${n}::bigint`)
      params.push(filters.customerStatusOptionId)
      n += 1
    }
  }

  if (filters.businessType) {
    clauses.push(`(p.business_type ILIKE $${n} OR p.business_category ILIKE $${n})`)
    params.push(`%${filters.businessType.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`)
    n += 1
  }

  if (filters.ownerUserId) {
    clauses.push(`p.owner_user_id = $${n}`)
    params.push(filters.ownerUserId)
    n += 1
  }

  return { clauses, params, nextIndex: n }
}

/**
 * @param {import('pg').Pool | { query: Function }} pool
 * @param {{ tenantIds: string[], ownerUserId?: string|null, filters?: ReturnType<typeof parseProfileListFilters> }} scope
 */
export async function listGovernmentProfiles(pool, scope) {
  const filters = scope.filters ?? parseProfileListFilters()
  const { clauses, params } = buildProfileListFilterClauses(filters, 3)
  const baseParams = [scope.tenantIds, scope.ownerUserId ?? null]
  const whereExtra = clauses.length ? ` AND ${clauses.join(' AND ')}` : ''

  const r = await pool.query(
    `
    ${PROFILE_LIST_SELECT}
    WHERE p.tenant_id = ANY($1::bigint[])
      AND p.owner_user_id IS NOT NULL
      AND p.archived_at IS NULL
      AND ($2::text IS NULL OR p.owner_user_id = $2::text)
      ${whereExtra}
    ORDER BY p.updated_at DESC, p.id DESC
    `,
    [...baseParams, ...params],
  )
  return r.rows.map(mapGovSupportProfileRow)
}

/**
 * @param {import('pg').Pool | { query: Function }} pool
 * @param {string} profileId
 */
export async function getGovernmentProfileById(pool, profileId) {
  const r = await pool.query(
    `
    ${PROFILE_LIST_SELECT}
    WHERE p.id = $1::bigint AND p.archived_at IS NULL
    LIMIT 1
    `,
    [profileId],
  )
  return r.rows[0] ?? null
}

/**
 * @param {import('pg').Pool} pool
 * @param {{ tenantIds: string[], filters?: ReturnType<typeof parseProfileListFilters> }} scope
 */
export async function summarizeGovernmentAdminCustomers(pool, scope) {
  const filters = scope.filters ?? parseProfileListFilters()
  const { clauses, params } = buildProfileListFilterClauses(filters, 2)
  const whereExtra = clauses.length ? ` AND ${clauses.join(' AND ')}` : ''

  const totalR = await pool.query(
    `
    SELECT COUNT(*)::int AS c
    FROM gov_support_profiles p
    WHERE p.tenant_id = ANY($1::bigint[])
      AND p.owner_user_id IS NOT NULL
      AND p.archived_at IS NULL
      ${whereExtra}
    `,
    [scope.tenantIds, ...params],
  )

  const byStatusR = await pool.query(
    `
    SELECT
      COALESCE(o.id::text, 'none') AS status_key,
      COALESCE(o.label, '상태 없음') AS status_label,
      COUNT(*)::int AS c
    FROM gov_support_profiles p
    LEFT JOIN gov_customer_status_options o
      ON o.id = p.customer_status_option_id AND o.archived_at IS NULL
    WHERE p.tenant_id = ANY($1::bigint[])
      AND p.owner_user_id IS NOT NULL
      AND p.archived_at IS NULL
      ${whereExtra}
    GROUP BY o.id, o.label
    ORDER BY status_label ASC
    `,
    [scope.tenantIds, ...params],
  )

  const byOwnerR = await pool.query(
    `
    SELECT
      p.owner_user_id::text AS owner_user_id,
      COALESCE(u.display_name, u.username, p.owner_user_id::text) AS owner_label,
      COUNT(*)::int AS customer_count
    FROM gov_support_profiles p
    LEFT JOIN users u ON u.id = p.owner_user_id
    WHERE p.tenant_id = ANY($1::bigint[])
      AND p.owner_user_id IS NOT NULL
      AND p.archived_at IS NULL
      ${whereExtra}
    GROUP BY p.owner_user_id, u.display_name, u.username
    ORDER BY owner_label ASC
    `,
    [scope.tenantIds, ...params],
  )

  return {
    totalCount: Number(totalR.rows[0]?.c ?? 0),
    byStatus: byStatusR.rows.map((row) => ({
      statusKey: String(row.status_key),
      statusLabel: String(row.status_label),
      count: Number(row.c ?? 0),
    })),
    byOwner: byOwnerR.rows.map((row) => ({
      ownerUserId: String(row.owner_user_id),
      ownerLabel: String(row.owner_label),
      customerCount: Number(row.customer_count ?? 0),
    })),
  }
}
