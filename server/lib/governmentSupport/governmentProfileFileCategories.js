/**
 * gov_support_profile_file_categories 행 매핑·검증.
 * @module governmentProfileFileCategories
 */

import { GOV_PROFILE_FILE_CATEGORY_MAX } from './governmentProfileFiles.js'

export { GOV_PROFILE_FILE_CATEGORY_MAX as GOV_PROFILE_FILE_CATEGORY_NAME_MAX }

/**
 * @param {unknown} raw
 */
export function normalizeGovProfileFileCategoryName(raw) {
  const name = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, GOV_PROFILE_FILE_CATEGORY_MAX)
  if (!name) {
    return { ok: false, status: 400, message: '분류 이름을 입력해 주세요.' }
  }
  return { ok: true, name }
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapGovSupportProfileFileCategoryRow(row) {
  const createdAt = row.created_at
  const updatedAt = row.updated_at
  const archivedAt = row.archived_at
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id ?? ''),
    profileId: String(row.profile_id),
    ownerUserId: String(row.owner_user_id ?? ''),
    name: String(row.name ?? ''),
    sortOrder: Number(row.sort_order ?? 0),
    createdByUserId: row.created_by_user_id != null ? String(row.created_by_user_id) : null,
    updatedByUserId: row.updated_by_user_id != null ? String(row.updated_by_user_id) : null,
    createdAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : createdAt != null
          ? String(createdAt)
          : new Date().toISOString(),
    updatedAt:
      updatedAt instanceof Date
        ? updatedAt.toISOString()
        : updatedAt != null
          ? String(updatedAt)
          : new Date().toISOString(),
    archivedAt:
      archivedAt instanceof Date
        ? archivedAt.toISOString()
        : archivedAt != null
          ? String(archivedAt)
          : null,
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} profileId
 * @param {string} name
 * @param {string|null} excludeCategoryId
 */
export async function hasActiveGovProfileFileCategoryName(pool, profileId, name, excludeCategoryId = null) {
  const params = [profileId, name.trim().toLowerCase()]
  let excludeSql = ''
  if (excludeCategoryId) {
    params.push(excludeCategoryId)
    excludeSql = ` AND id <> $${params.length}::bigint`
  }
  const r = await pool.query(
    `
    SELECT id
    FROM gov_support_profile_file_categories
    WHERE profile_id = $1::bigint
      AND archived_at IS NULL
      AND LOWER(TRIM(name)) = $2
      ${excludeSql}
    LIMIT 1
    `,
    params,
  )
  return r.rows.length > 0
}

/**
 * @param {import('pg').Pool} pool
 * @param {string} profileId
 * @param {string} categoryName
 */
export async function countActiveGovProfileFilesInCategory(pool, profileId, categoryName) {
  const r = await pool.query(
    `
    SELECT COUNT(*)::int AS cnt
    FROM gov_support_profile_files
    WHERE profile_id = $1::bigint
      AND archived_at IS NULL
      AND upload_status = 'active'
      AND LOWER(TRIM(category)) = LOWER(TRIM($2))
    `,
    [profileId, categoryName],
  )
  return Number(r.rows[0]?.cnt ?? 0)
}

/**
 * @param {Record<string, unknown>|null|undefined} body
 */
export function parseGovProfileFileCategoryPatchBody(body) {
  const b = body ?? {}
  /** @type {{ name?: string, sortOrder?: number }} */
  const patch = {}
  if (b.name != null) {
    const normalized = normalizeGovProfileFileCategoryName(b.name)
    if (!normalized.ok) {
      return normalized
    }
    patch.name = normalized.name
  }
  if (b.sortOrder != null || b.sort_order != null) {
    const sortOrder = Number(b.sortOrder ?? b.sort_order)
    if (!Number.isFinite(sortOrder)) {
      return { ok: false, status: 400, message: '정렬 순서가 올바르지 않습니다.' }
    }
    patch.sortOrder = Math.trunc(sortOrder)
  }
  if (patch.name == null && patch.sortOrder == null) {
    return { ok: false, status: 400, message: '수정할 필드가 없습니다.' }
  }
  return { ok: true, patch }
}
