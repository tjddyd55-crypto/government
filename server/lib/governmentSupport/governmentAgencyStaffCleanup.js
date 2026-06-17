/**
 * 정부지원 CRM develop — 대행사 직원 잔여 더미 정리.
 * users + user_memberships 기반 (별도 staff 테이블 없음).
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { GOVERNMENT_INDUSTRY_CODE } from './constants.js'
import {
  assertDevelopGovernmentDbTarget,
  isDummyLikeName,
  maskDatabaseUrl,
  resolveSesungGovernmentTenant,
} from './governmentDummyDataCleanup.js'

export const AGENCY_STAFF_CONFIRM_VALUE = 'DELETE_NON_SESUNG_AGENCY_STAFF'
export const AGENCY_STAFF_DRY_RUN_JSON = 'government-agency-staff-cleanup-dry-run.json'
export const AGENCY_STAFF_DRY_RUN_TXT = 'government-agency-staff-cleanup-dry-run.txt'

export const AGENCY_STAFF_ROLES = Object.freeze(['government_agency_admin', 'government_staff'])

const PROTECTED_MEMBERSHIP_ROLES = Object.freeze(['government_industry_admin', 'super_admin'])

/** develop 더미 정리 — 비정상 대량 삭제 방지 */
const MAX_DELETE_CANDIDATES = 200

/**
 * @returns {string[]}
 */
export function resolveBootstrapAdminUsernames() {
  const names = new Set()
  const loginId = String(process.env.GOVERNMENT_ADMIN_LOGIN_ID ?? '').trim()
  const bootstrap = String(process.env.INSURANCE_ADMIN_BOOTSTRAP_USERNAME ?? 'admin').trim()
  if (loginId) names.add(loginId.toLowerCase())
  if (bootstrap) names.add(bootstrap.toLowerCase())
  names.add('admin')
  return [...names]
}

/**
 * @param {{ username?: string, displayName?: string, display_name?: string }} user
 */
export function isAgencyStaffDummyUser(user) {
  const username = String(user.username ?? '').trim()
  const displayName = String(user.displayName ?? user.display_name ?? '').trim()
  if (/^agencyadm/i.test(username)) return true
  return isDummyLikeName(username) || isDummyLikeName(displayName)
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 */
async function loadGovernmentAgencyStaffRows(client) {
  const r = await client.query(
    `
    SELECT DISTINCT ON (u.id)
      u.id::text AS id,
      u.username,
      COALESCE(u.display_name, '') AS display_name,
      UPPER(TRIM(COALESCE(u.role::text, ''))) AS legacy_role,
      m.role AS government_role,
      m.tenant_id::text AS tenant_id,
      t.code AS agency_code,
      t.name AS tenant_name,
      (t.id IS NOT NULL) AS tenant_exists
    FROM users u
    INNER JOIN user_memberships m ON m.user_id = u.id
    INNER JOIN industries i ON i.id = m.industry_id AND LOWER(TRIM(i.code)) = $1
    LEFT JOIN tenants t ON t.id = m.tenant_id
    WHERE COALESCE(u.is_deleted, false) IS NOT TRUE
      AND m.role = ANY($2::text[])
    ORDER BY u.id,
      CASE m.role
        WHEN 'government_agency_admin' THEN 1
        WHEN 'government_staff' THEN 2
        ELSE 3
      END,
      m.id ASC
    `,
    [GOVERNMENT_INDUSTRY_CODE, [...AGENCY_STAFF_ROLES]],
  )
  return r.rows
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 */
async function loadUserMembershipSummaries(client, userIds) {
  if (userIds.length === 0) return new Map()
  const r = await client.query(
    `
    SELECT
      m.user_id::text AS user_id,
      m.id::text AS membership_id,
      m.role,
      m.tenant_id::text AS tenant_id,
      (t.id IS NOT NULL) AS tenant_exists
    FROM user_memberships m
    INNER JOIN industries i ON i.id = m.industry_id AND LOWER(TRIM(i.code)) = $1
    LEFT JOIN tenants t ON t.id = m.tenant_id
    WHERE m.user_id = ANY($2::text[])
    ORDER BY m.user_id, m.id
    `,
    [GOVERNMENT_INDUSTRY_CODE, userIds],
  )
  /** @type {Map<string, object[]>} */
  const map = new Map()
  for (const row of r.rows) {
    const uid = String(row.user_id)
    if (!map.has(uid)) map.set(uid, [])
    map.get(uid).push({
      membershipId: String(row.membership_id),
      role: String(row.role),
      tenantId: row.tenant_id != null ? String(row.tenant_id) : null,
      tenantExists: Boolean(row.tenant_exists),
    })
  }
  return map
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 */
async function loadProtectedAgencyStaffContext(client, sesungId) {
  const protectedUserIds = new Set()
  const protectedReasons = new Map()

  const mark = (userId, reason) => {
    const id = String(userId)
    protectedUserIds.add(id)
    if (!protectedReasons.has(id)) protectedReasons.set(id, reason)
  }

  const superUsers = await client.query(
    `
    SELECT id::text AS id, username
    FROM users
    WHERE COALESCE(is_deleted, false) IS NOT TRUE
      AND UPPER(TRIM(COALESCE(role::text, ''))) = 'SUPER_ADMIN'
    `,
  )
  for (const row of superUsers.rows) mark(row.id, 'super_admin')

  const industryAdmins = await client.query(
    `
    SELECT DISTINCT m.user_id::text AS id, u.username
    FROM user_memberships m
    INNER JOIN industries i ON i.id = m.industry_id AND LOWER(TRIM(i.code)) = $1
    INNER JOIN users u ON u.id = m.user_id
    WHERE LOWER(TRIM(m.role)) = ANY($2::text[])
      AND COALESCE(u.is_deleted, false) IS NOT TRUE
    `,
    [GOVERNMENT_INDUSTRY_CODE, [...PROTECTED_MEMBERSHIP_ROLES]],
  )
  for (const row of industryAdmins.rows) mark(row.id, 'government_industry_admin')

  const bootstrapNames = resolveBootstrapAdminUsernames()
  for (const row of industryAdmins.rows) {
    const username = String(row.username ?? '').trim().toLowerCase()
    if (bootstrapNames.includes(username)) {
      mark(row.id, 'bootstrap_admin')
    }
  }

  const sesungStaff = await client.query(
    `
    SELECT DISTINCT u.id::text AS id, u.username, COALESCE(u.display_name, '') AS display_name
    FROM users u
    INNER JOIN user_memberships m ON m.user_id = u.id
    INNER JOIN industries i ON i.id = m.industry_id AND LOWER(TRIM(i.code)) = $1
    WHERE COALESCE(u.is_deleted, false) IS NOT TRUE
      AND m.role = ANY($2::text[])
      AND m.tenant_id = $3::bigint
    `,
    [GOVERNMENT_INDUSTRY_CODE, [...AGENCY_STAFF_ROLES], sesungId],
  )
  for (const row of sesungStaff.rows) {
    if (!isAgencyStaffDummyUser(row)) {
      mark(row.id, 'sesung_agency_staff')
    }
  }

  const adminPreserveCount = await client.query(
    `
    SELECT COUNT(DISTINCT u.id)::int AS c
    FROM users u
    WHERE COALESCE(u.is_deleted, false) IS NOT TRUE
      AND (
        UPPER(TRIM(COALESCE(u.role::text, ''))) = 'SUPER_ADMIN'
        OR EXISTS (
          SELECT 1 FROM user_memberships m
          INNER JOIN industries i ON i.id = m.industry_id AND LOWER(TRIM(i.code)) = $1
          WHERE m.user_id = u.id
            AND LOWER(TRIM(m.role)) = ANY($2::text[])
        )
      )
    `,
    [GOVERNMENT_INDUSTRY_CODE, [...PROTECTED_MEMBERSHIP_ROLES]],
  )

  const sesungPreserveCount = await client.query(
    `
    SELECT COUNT(DISTINCT u.id)::int AS c
    FROM users u
    INNER JOIN user_memberships m ON m.user_id = u.id
    INNER JOIN industries i ON i.id = m.industry_id AND LOWER(TRIM(i.code)) = $1
    WHERE COALESCE(u.is_deleted, false) IS NOT TRUE
      AND m.role = ANY($2::text[])
      AND m.tenant_id = $3::bigint
    `,
    [GOVERNMENT_INDUSTRY_CODE, [...AGENCY_STAFF_ROLES], sesungId],
  )

  return {
    protectedUserIds,
    protectedReasons,
    adminPreserveCount: Number(adminPreserveCount.rows[0]?.c ?? 0),
    sesungStaffTotalCount: Number(sesungPreserveCount.rows[0]?.c ?? 0),
  }
}

/**
 * @param {object} row
 * @param {string} sesungId
 * @param {object[]} memberships
 */
export function isAgencyStaffDeleteCandidate(row, sesungId, memberships) {
  const agencyMemberships = memberships.filter((m) => AGENCY_STAFF_ROLES.includes(m.role))
  if (agencyMemberships.length === 0) return { delete: false, reason: 'no_agency_membership' }

  if (String(row.legacy_role ?? '') === 'SUPER_ADMIN') {
    return { delete: false, reason: 'super_admin' }
  }

  if (isAgencyStaffDummyUser(row)) {
    return { delete: true, reason: 'dummy_username_or_display_name' }
  }

  if (agencyMemberships.some((m) => m.tenantId && m.tenantId !== sesungId)) {
    return { delete: true, reason: 'non_sesung_tenant_membership' }
  }

  if (agencyMemberships.some((m) => !m.tenantId || !m.tenantExists)) {
    return { delete: true, reason: 'orphan_tenant_membership' }
  }

  return { delete: false, reason: 'sesung_non_dummy_staff' }
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 * @param {{ maxDeleteCandidates?: number }} [opts]
 */
export async function buildAgencyStaffCleanupPlan(client, opts = {}) {
  const maxDeleteCandidates = opts.maxDeleteCandidates ?? MAX_DELETE_CANDIDATES
  const sesung = await resolveSesungGovernmentTenant(client)

  if (sesung.id !== '69' || sesung.code !== 'AGENCYC') {
    throw new Error(
      `세승 tenant 확인 실패: id=${sesung.id}, code=${sesung.code}, name=${sesung.name}`,
    )
  }

  const staffRows = await loadGovernmentAgencyStaffRows(client)
  const protectedCtx = await loadProtectedAgencyStaffContext(client, sesung.id)
  const membershipMap = await loadUserMembershipSummaries(
    client,
    staffRows.map((r) => String(r.id)),
  )

  /** @type {object[]} */
  const deleteCandidates = []
  /** @type {object[]} */
  const preserveStaff = []

  for (const row of staffRows) {
    const uid = String(row.id)
    const memberships = membershipMap.get(uid) ?? []

    if (protectedCtx.protectedUserIds.has(uid)) {
      preserveStaff.push({
        id: uid,
        username: row.username,
        displayName: row.display_name,
        governmentRole: row.government_role,
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        preserveReason: protectedCtx.protectedReasons.get(uid) ?? 'protected',
      })
      continue
    }

    const decision = isAgencyStaffDeleteCandidate(row, sesung.id, memberships)
    if (decision.delete) {
      deleteCandidates.push({
        id: uid,
        username: row.username,
        displayName: row.display_name,
        governmentRole: row.government_role,
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        agencyCode: row.agency_code,
        deleteReason: decision.reason,
        memberships,
      })
    } else {
      preserveStaff.push({
        id: uid,
        username: row.username,
        displayName: row.display_name,
        governmentRole: row.government_role,
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        preserveReason: decision.reason,
      })
    }
  }

  const deleteUserIds = deleteCandidates.map((c) => c.id)
  const tableDeleteCounts = await buildAgencyStaffTableDeleteCounts(client, deleteUserIds)

  const orphanStaffPresent = deleteCandidates.some(
    (c) => c.deleteReason === 'orphan_tenant_membership' || c.deleteReason === 'non_sesung_tenant_membership',
  )

  /** @type {string[]} */
  const abortReasons = []

  if (deleteCandidates.length > maxDeleteCandidates) {
    abortReasons.push(
      `삭제 후보 ${deleteCandidates.length}건 — 허용 상한 ${maxDeleteCandidates}건 초과`,
    )
  }

  for (const candidate of deleteCandidates) {
    if (candidate.tenantId === sesung.id && !isAgencyStaffDummyUser(candidate)) {
      abortReasons.push(`세승 비더미 직원이 삭제 후보에 포함됨: ${candidate.username} (${candidate.id})`)
    }
    if (protectedCtx.protectedReasons.has(candidate.id)) {
      abortReasons.push(`보호 계정이 삭제 후보에 포함됨: ${candidate.username}`)
    }
    if (String(candidate.username ?? '').trim().toLowerCase() === 'admin') {
      abortReasons.push(`bootstrap admin 후보 포함: ${candidate.id}`)
    }
  }

  const sesungPreservedNonDummy = preserveStaff.filter(
    (p) => p.tenantId === sesung.id && p.preserveReason === 'sesung_agency_staff',
  )

  const plan = {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    sesung,
    investigation: {
      listApi: 'GET /government-support/admin/users',
      listModule: 'server/lib/governmentSupport/governmentAdminUsers.js:listGovernmentAdminUsers',
      tables: ['users', 'user_memberships', 'tenants', 'industries'],
      separateStaffTable: false,
      agencyStaffRoles: [...AGENCY_STAFF_ROLES],
    },
    preserveSummary: {
      sesungStaffTotalCount: protectedCtx.sesungStaffTotalCount,
      sesungStaffPreservedCount: sesungPreservedNonDummy.length,
      adminSystemPreserveCount: protectedCtx.adminPreserveCount,
      preservedStaff: preserveStaff,
    },
    totalAgencyStaffCount: staffRows.length,
    deleteCandidateCount: deleteCandidates.length,
    deleteCandidates,
    tableDeleteCounts,
    orphanStaffPresent,
    abortReasons,
    canExecute: abortReasons.length === 0 && deleteCandidates.length > 0,
    deleteStrategy: 'hard-delete-users-and-memberships',
    r2Deletion: false,
    warnings: [
      '대행사 직원 목록은 users + user_memberships (government_agency_admin / government_staff) 입니다.',
      '세승 tenant의 실운영 직원(비더미 username)은 보존합니다.',
      'e2e/test/dummy 패턴 직원은 세승 소속이어도 삭제합니다.',
      'super admin / government_industry_admin / bootstrap admin 은 보존합니다.',
      'R2 object 는 삭제하지 않습니다.',
    ],
  }

  plan.planHash = createHash('sha256')
    .update(
      JSON.stringify({
        sesungId: sesung.id,
        deleteUserIds,
        deleteCandidateCount: deleteCandidates.length,
      }),
    )
    .digest('hex')

  return plan
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 * @param {string[]} deleteUserIds
 */
export async function buildAgencyStaffTableDeleteCounts(client, deleteUserIds) {
  if (deleteUserIds.length === 0) {
    return {
      users: 0,
      user_memberships: 0,
      gov_signature_send_sessions: 0,
      gov_signature_templates: 0,
      pdf_templates: 0,
      user_auth_sessions: 0,
    }
  }

  const count = async (sql, params) => {
    const r = await client.query(sql, params)
    return Number(r.rows[0]?.c ?? 0)
  }

  return {
    users: deleteUserIds.length,
    user_memberships: await count(
      `SELECT COUNT(*)::int AS c FROM user_memberships WHERE user_id = ANY($1::text[])`,
      [deleteUserIds],
    ),
    gov_signature_send_sessions: await count(
      `SELECT COUNT(*)::int AS c FROM gov_signature_send_sessions WHERE owner_user_id = ANY($1::text[])`,
      [deleteUserIds],
    ),
    gov_signature_templates: await count(
      `SELECT COUNT(*)::int AS c FROM gov_signature_templates WHERE owner_user_id = ANY($1::text[])`,
      [deleteUserIds],
    ),
    pdf_templates: await count(
      `SELECT COUNT(*)::int AS c FROM pdf_templates WHERE gov_owner_user_id = ANY($1::text[])`,
      [deleteUserIds],
    ),
    user_auth_sessions: await count(
      `SELECT COUNT(*)::int AS c FROM user_auth_sessions WHERE user_id = ANY($1::text[])`,
      [deleteUserIds],
    ),
  }
}

/**
 * @param {object} plan
 * @param {string} projectRoot
 */
export function writeAgencyStaffDryRunReports(plan, projectRoot) {
  const tmpDir = path.join(projectRoot, 'tmp')
  fs.mkdirSync(tmpDir, { recursive: true })
  const jsonPath = path.join(tmpDir, AGENCY_STAFF_DRY_RUN_JSON)
  const txtPath = path.join(tmpDir, AGENCY_STAFF_DRY_RUN_TXT)
  fs.writeFileSync(jsonPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8')

  const lines = [
    '정부지원 CRM develop — 대행사 직원 잔여 더미 정리 dry-run',
    `generatedAt: ${plan.generatedAt}`,
    `planHash: ${plan.planHash}`,
    '',
    '== DB 조사 ==',
    `API: ${plan.investigation.listApi}`,
    `테이블: ${plan.investigation.tables.join(', ')}`,
    `별도 staff 테이블: ${plan.investigation.separateStaffTable ? 'yes' : 'no'}`,
    '',
    '== 세승 tenant ==',
    `id: ${plan.sesung.id} | ${plan.sesung.code} | ${plan.sesung.name}`,
    `세승 직원 전체: ${plan.preserveSummary.sesungStaffTotalCount}`,
    `세승 실운영 직원 보존: ${plan.preserveSummary.sesungStaffPreservedCount}`,
    `관리자/system 보존: ${plan.preserveSummary.adminSystemPreserveCount}`,
    '',
    `== 전체 대행사 직원 (${plan.totalAgencyStaffCount}건) ==`,
    `== 삭제 후보 (${plan.deleteCandidateCount}건) ==`,
    ...plan.deleteCandidates.map(
      (u) =>
        `- ${u.id} | ${u.governmentRole} | tenant=${u.tenantId ?? 'null'} | ${u.username} | ${u.deleteReason}`,
    ),
    '',
    '== 보존 직원 ==',
    ...plan.preserveSummary.preservedStaff.map(
      (u) =>
        `- ${u.id} | ${u.governmentRole} | tenant=${u.tenantId ?? 'null'} | ${u.username} | ${u.preserveReason}`,
    ),
    '',
    '== 테이블별 삭제 후보 count ==',
    ...Object.entries(plan.tableDeleteCounts).map(([k, v]) => `- ${k}: ${v}`),
    '',
    `orphan staff 포함: ${plan.orphanStaffPresent}`,
    '',
    '== 중단 조건 ==',
    ...(plan.abortReasons.length ? plan.abortReasons.map((r) => `- ${r}`) : ['- 없음']),
    '',
    `canExecute: ${plan.canExecute}`,
    '',
    '== execute ==',
    'CONFIRM_GOVERNMENT_AGENCY_STAFF_CLEANUP=DELETE_NON_SESUNG_AGENCY_STAFF node scripts/government-cleanup-leftover-agency-staff.js --execute',
  ]

  fs.writeFileSync(txtPath, `${lines.join('\n')}\n`, 'utf8')
  return { jsonPath, txtPath }
}

/**
 * @param {string} projectRoot
 * @param {object} plan
 */
export function assertAgencyStaffDryRunArtifactForExecute(projectRoot, plan) {
  const jsonPath = path.join(projectRoot, 'tmp', AGENCY_STAFF_DRY_RUN_JSON)
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dry-run artifact missing: ${jsonPath}. Run --dry-run first.`)
  }
  const saved = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  if (saved.planHash !== plan.planHash) {
    throw new Error('Agency staff planHash mismatch. Re-run --dry-run.')
  }
  if (!plan.canExecute) {
    throw new Error(`Execute blocked: ${(plan.abortReasons ?? []).join('; ') || 'canExecute=false'}`)
  }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {object} plan
 */
export async function executeAgencyStaffCleanup(client, plan) {
  if (!plan.canExecute) {
    throw new Error(`Execute blocked: ${(plan.abortReasons ?? []).join('; ')}`)
  }

  const deleteUserIds = plan.deleteCandidates.map((c) => String(c.id))
  if (deleteUserIds.length === 0) {
    return { deleted: {}, message: '삭제할 직원이 없습니다.' }
  }

  /** @type {Record<string, number>} */
  const deleted = {}

  await client.query('BEGIN')
  try {
    const r1 = await client.query(
      `DELETE FROM gov_signature_send_sessions WHERE owner_user_id = ANY($1::text[])`,
      [deleteUserIds],
    )
    deleted.gov_signature_send_sessions = r1.rowCount ?? 0

    const r2 = await client.query(
      `DELETE FROM gov_signature_templates WHERE owner_user_id = ANY($1::text[])`,
      [deleteUserIds],
    )
    deleted.gov_signature_templates = r2.rowCount ?? 0

    const r3 = await client.query(
      `DELETE FROM pdf_templates WHERE gov_owner_user_id = ANY($1::text[])`,
      [deleteUserIds],
    )
    deleted.pdf_templates = r3.rowCount ?? 0

    const r4 = await client.query(`DELETE FROM user_memberships WHERE user_id = ANY($1::text[])`, [
      deleteUserIds,
    ])
    deleted.user_memberships = r4.rowCount ?? 0

    const r5 = await client.query(
      `
      DELETE FROM users
      WHERE id = ANY($1::text[])
        AND COALESCE(is_deleted, false) IS NOT TRUE
        AND UPPER(TRIM(COALESCE(role::text, ''))) <> 'SUPER_ADMIN'
      `,
      [deleteUserIds],
    )
    deleted.users = r5.rowCount ?? 0

    const remaining = await client.query(
      `
      SELECT COUNT(DISTINCT u.id)::int AS c
      FROM users u
      INNER JOIN user_memberships m ON m.user_id = u.id
      INNER JOIN industries i ON i.id = m.industry_id AND LOWER(TRIM(i.code)) = $1
      WHERE COALESCE(u.is_deleted, false) IS NOT TRUE
        AND m.role = ANY($2::text[])
        AND (
          u.username ~* $3
          OR COALESCE(u.display_name, '') ~* $3
        )
      `,
      [
        GOVERNMENT_INDUSTRY_CODE,
        [...AGENCY_STAFF_ROLES],
        'e2e|test|dummy|sample|agencyadm|테스트|더미|샘플',
      ],
    )
    const left = Number(remaining.rows[0]?.c ?? 0)
    if (left > 0) {
      throw new Error(`Post-delete verification failed: ${left} dummy agency staff remain`)
    }

    await client.query('COMMIT')
    return { deleted, message: 'COMMIT ok' }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}

/**
 * @param {string[]} argv
 */
export function parseAgencyStaffCleanupArgv(argv) {
  const execute = argv.includes('--execute')
  const dryRun = argv.includes('--dry-run') || !execute
  return { dryRun, execute }
}

export { assertDevelopGovernmentDbTarget, maskDatabaseUrl }
