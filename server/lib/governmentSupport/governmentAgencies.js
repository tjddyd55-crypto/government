/**
 * 정부지원 대행사(tenant) 관리 — 조회·수정·보관(soft).
 * @module governmentAgencies
 */
import { GOVERNMENT_INDUSTRY_CODE } from './constants.js'
import { parseGovernmentEntityStatus } from './governmentAdminUsers.js'

const ARCHIVED_STATUS = 'inactive'

/**
 * @param {{ name?: string, code?: string }} row
 */
export function isSesungAgencyTenant(row) {
  const name = String(row?.name ?? '')
  const code = String(row?.code ?? '')
  return /세승/.test(name) || /세승/.test(code)
}

/**
 * @param {unknown} config
 */
function readGovernmentAgencyConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return {}
  }
  const root = /** @type {Record<string, unknown>} */ (config)
  const gov = root.governmentAgency
  if (!gov || typeof gov !== 'object' || Array.isArray(gov)) {
    return {}
  }
  return /** @type {Record<string, unknown>} */ (gov)
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapGovernmentAgencyRow(row) {
  const gov = readGovernmentAgencyConfig(row.config)
  return {
    id: String(row.id),
    agencyCode: String(row.code ?? ''),
    name: String(row.name ?? ''),
    status: String(row.status ?? 'active'),
    representativeName: String(gov.representativeName ?? ''),
    contactPhone: String(gov.contactPhone ?? ''),
    businessNumber: String(gov.businessNumber ?? ''),
    address: String(gov.address ?? ''),
    memo: String(gov.memo ?? ''),
    registrationCodeEnabled: gov.registrationCodeEnabled !== false,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}

/**
 * @param {unknown} body
 */
export function parseGovernmentAgencyPatchBody(body) {
  const src = body && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body) : {}
  /** @type {Record<string, unknown>} */
  const patch = {}

  if (src.name != null) {
    const name = String(src.name).trim()
    if (!name) {
      return { ok: false, status: 400, message: '대행사명이 필요합니다.' }
    }
    patch.name = name
  }

  if (src.status != null) {
    const status = parseGovernmentEntityStatus(src.status)
    if (!status) {
      return { ok: false, status: 400, message: 'status 값이 올바르지 않습니다.' }
    }
    patch.status = status
  }

  const govFields = [
    'representativeName',
    'contactPhone',
    'businessNumber',
    'address',
    'memo',
  ]
  /** @type {Record<string, unknown>} */
  const govPatch = {}
  let hasGovPatch = false
  for (const key of govFields) {
    if (src[key] != null) {
      govPatch[key] = String(src[key]).trim()
      hasGovPatch = true
    }
  }
  if (src.registrationCodeEnabled != null) {
    govPatch.registrationCodeEnabled = Boolean(src.registrationCodeEnabled)
    hasGovPatch = true
  }
  if (hasGovPatch) {
    patch.governmentAgency = govPatch
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, status: 400, message: '변경할 항목이 없습니다.' }
  }

  return { ok: true, patch }
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} pool
 * @param {string} tenantId
 */
export async function loadGovernmentAgencyRow(pool, tenantId) {
  const r = await pool.query(
    `
    SELECT t.id::text AS id, t.code, t.name, t.status, t.config, t.created_at, t.updated_at
    FROM tenants t
    INNER JOIN industries i ON i.id = t.industry_id
    WHERE t.id::text = $1
      AND LOWER(TRIM(i.code)) = $2
    LIMIT 1
    `,
    [tenantId, GOVERNMENT_INDUSTRY_CODE],
  )
  return r.rows[0] ?? null
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ tenantId?: string, actorTenantIds?: string[] }} [options]
 */
export function assertCanArchiveGovernmentAgency(row, options = {}) {
  if (!row) {
    return { ok: false, status: 404, message: '대행사를 찾을 수 없습니다.' }
  }
  if (isSesungAgencyTenant(row)) {
    return { ok: false, status: 409, message: '세승 대행사는 보관할 수 없습니다.' }
  }
  const tenantId = String(options.tenantId ?? row.id ?? '')
  const actorTenantIds = (options.actorTenantIds ?? []).map((id) => String(id))
  if (tenantId && actorTenantIds.includes(tenantId)) {
    return { ok: false, status: 409, message: '소속 대행사는 보관할 수 없습니다.' }
  }
  if (String(row.status ?? '').toLowerCase() === ARCHIVED_STATUS) {
    return { ok: false, status: 409, message: '이미 보관된 대행사입니다.' }
  }
  return { ok: true }
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} exec
 * @param {string} tenantId
 * @param {Record<string, unknown>} patch
 */
export async function patchGovernmentAgency(exec, tenantId, patch) {
  const existing = await loadGovernmentAgencyRow(exec, tenantId)
  if (!existing) {
    return { ok: false, status: 404, message: '대행사를 찾을 수 없습니다.' }
  }

  const nextName = patch.name != null ? String(patch.name) : String(existing.name ?? '')
  const nextStatus = patch.status != null ? String(patch.status) : String(existing.status ?? 'active')

  const currentConfig =
    existing.config && typeof existing.config === 'object' && !Array.isArray(existing.config)
      ? { ...existing.config }
      : {}
  const currentGov = readGovernmentAgencyConfig(currentConfig)
  const govPatch = patch.governmentAgency && typeof patch.governmentAgency === 'object' ? patch.governmentAgency : {}
  const nextGov = { ...currentGov, ...govPatch }
  const nextConfig = { ...currentConfig, governmentAgency: nextGov }

  const updated = await exec.query(
    `
    UPDATE tenants
    SET
      name = $2,
      status = $3,
      config = $4::jsonb,
      updated_at = NOW()
    WHERE id::text = $1
    RETURNING id::text AS id, code, name, status, config, created_at, updated_at
    `,
    [tenantId, nextName, nextStatus, JSON.stringify(nextConfig)],
  )

  const row = updated.rows[0]
  const registrationEnabled = nextGov.registrationCodeEnabled !== false
  await exec.query(
    `
    UPDATE tenant_registration_codes
    SET status = $2, updated_at = NOW()
    WHERE tenant_id::text = $1
    `,
    [tenantId, registrationEnabled ? 'active' : 'inactive'],
  )

  return { ok: true, data: mapGovernmentAgencyRow(row) }
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} exec
 * @param {string} tenantId
 * @param {{ actorTenantIds?: string[] }} [options]
 */
export async function archiveGovernmentAgency(exec, tenantId, options = {}) {
  const existing = await loadGovernmentAgencyRow(exec, tenantId)
  const guard = assertCanArchiveGovernmentAgency(existing, {
    tenantId,
    actorTenantIds: options.actorTenantIds,
  })
  if (!guard.ok) {
    return guard
  }

  const updated = await exec.query(
    `
    UPDATE tenants
    SET status = $2, updated_at = NOW()
    WHERE id::text = $1
    RETURNING id::text AS id, code, name, status, config, created_at, updated_at
    `,
    [tenantId, ARCHIVED_STATUS],
  )

  await exec.query(
    `
    UPDATE tenant_registration_codes
    SET status = 'inactive', updated_at = NOW()
    WHERE tenant_id::text = $1
    `,
    [tenantId],
  )

  return { ok: true, data: mapGovernmentAgencyRow(updated.rows[0]) }
}
