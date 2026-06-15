/**
 * 정부지원 CRM develop DB — 세승 대행사 보존·더미 데이터 정리.
 * 파괴적 작업: 기본 dry-run, --execute + CONFIRM + develop 가드 + dry-run 산출물 필요.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { GOVERNMENT_INDUSTRY_CODE } from './constants.js'

export const CONFIRM_ENV_VALUE = 'DELETE_NON_SESUNG_DUMMY_DATA'
export const DRY_RUN_JSON = 'government-dummy-cleanup-dry-run.json'
export const DRY_RUN_TXT = 'government-dummy-cleanup-dry-run.txt'

const PRODUCTION_DB_SNIPPETS = [
  'insurance-production',
  'insurance-production-7bd8',
  'insurance-main',
  'production.up.railway.app',
]

const PROTECTED_MEMBERSHIP_ROLES = new Set([
  'super_admin',
  'government_industry_admin',
])

const DUMMY_NAME_RE =
  /test|dummy|sample|e2e|fixture|mock|테스트|더미|샘플|홍길동|가짜|임시/i

const GOVERNMENT_MEMBERSHIP_ROLES = [
  'government_industry_admin',
  'government_agency_admin',
  'government_staff',
  'government_user',
]

const DUMMY_NAME_PG_PATTERN = 'test|dummy|sample|e2e|fixture|mock|테스트|더미|샘플|홍길동|가짜|임시'

/** @param {string} url */
export function maskDatabaseUrl(url) {
  const raw = String(url ?? '').trim()
  if (!raw) return '(empty)'
  try {
    const u = new URL(raw)
    if (u.password) u.password = '***'
    return `${u.protocol}//${u.username ? `${u.username}:***@` : ''}${u.host}${u.pathname}`
  } catch {
    return '(unparseable DATABASE_URL)'
  }
}

/** @param {string} host */
function isDevelopDbHost(host) {
  const h = String(host ?? '').toLowerCase()
  if (!h) return false
  if (h === 'localhost' || h === '127.0.0.1') return true
  if (h.includes('app-develop')) return true
  if (h.includes('develop') && h.includes('railway')) return true
  return false
}

/**
 * develop DB 직접 접근 가드.
 * @param {{ allowOverride?: boolean }} [opts]
 */
export function assertDevelopGovernmentDbTarget(opts = {}) {
  if (opts.allowOverride && process.env.GOVERNMENT_DUMMY_CLEANUP_ALLOW_NON_DEVELOP === '1') {
    console.warn('[gov-cleanup] GOVERNMENT_DUMMY_CLEANUP_ALLOW_NON_DEVELOP=1 — develop 가드 우회')
    return
  }

  const dbUrl = String(process.env.DATABASE_URL ?? '').toLowerCase()
  if (!dbUrl) {
    throw new Error(
      'DATABASE_URL missing. `railway run -e develop -s app node scripts/government-cleanup-dummy-data.js --dry-run` 으로 실행하세요.',
    )
  }

  for (const snippet of PRODUCTION_DB_SNIPPETS) {
    if (dbUrl.includes(snippet)) {
      throw new Error(`Blocked: DATABASE_URL looks like production (${snippet}).`)
    }
  }

  if (process.env.RAILWAY_ENVIRONMENT_NAME === 'production') {
    throw new Error('Blocked: RAILWAY_ENVIRONMENT_NAME=production')
  }

  let host = ''
  try {
    host = new URL(process.env.DATABASE_URL).hostname
  } catch {
    throw new Error('Blocked: DATABASE_URL is not a valid URL')
  }

  if (!isDevelopDbHost(host)) {
    const railwayEnv = String(
      process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.RAILWAY_ENVIRONMENT ?? '',
    )
      .trim()
      .toLowerCase()
    const isDevelopRailway = railwayEnv === 'develop' || railwayEnv === 'development'
    if (!isDevelopRailway) {
      throw new Error(
        `Blocked: DB host "${host}" is not a known develop host (set RAILWAY_ENVIRONMENT_NAME=develop or use railway run -e develop).`,
      )
    }
  }

  const appProduct = String(process.env.APP_PRODUCT ?? process.env.VITE_APP_PRODUCT ?? '').trim()
  if (appProduct && appProduct !== 'government') {
    throw new Error(`Blocked: APP_PRODUCT=${appProduct} (expected government or unset on develop).`)
  }
}

/** @param {unknown} value */
export function isDummyLikeName(value) {
  return DUMMY_NAME_RE.test(String(value ?? '').trim())
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 * @returns {Promise<{ id: string, code: string, name: string, status: string, legacyGaId: number|null }>}
 */
export async function resolveSesungGovernmentTenant(client) {
  const r = await client.query(
    `
    SELECT t.id, t.code, t.name, t.status, t.legacy_ga_id
    FROM tenants t
    INNER JOIN industries i ON i.id = t.industry_id
    LEFT JOIN ga_companies g ON g.id = t.legacy_ga_id
    WHERE LOWER(TRIM(i.code)) = $1
      AND (
        t.name ILIKE '%세승%'
        OR t.code ILIKE '%세승%'
        OR COALESCE(g.name, '') ILIKE '%세승%'
        OR COALESCE(g.code, '') ILIKE '%세승%'
      )
    ORDER BY t.id
    `,
    [GOVERNMENT_INDUSTRY_CODE],
  )

  if (r.rowCount === 0) {
    throw new Error('세승 tenant 를 찾지 못했습니다. develop DB tenants 를 확인하세요.')
  }
  if (r.rowCount > 1) {
    const summary = r.rows.map((row) => `${row.id}:${row.code}:${row.name}`).join(', ')
    throw new Error(`세승 tenant 가 ${r.rowCount}개입니다. 수동 확인 후 스크립트를 조정하세요: ${summary}`)
  }

  const row = r.rows[0]
  return {
    id: String(row.id),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    status: String(row.status ?? ''),
    legacyGaId: row.legacy_ga_id != null ? Number(row.legacy_ga_id) : null,
  }
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 * @param {string} preserveTenantId
 */
async function loadGovernmentTenants(client, preserveTenantId) {
  const r = await client.query(
    `
    SELECT t.id, t.code, t.name, t.status
    FROM tenants t
    INNER JOIN industries i ON i.id = t.industry_id
    WHERE LOWER(TRIM(i.code)) = $1
    ORDER BY t.id
    `,
    [GOVERNMENT_INDUSTRY_CODE],
  )
  const all = r.rows.map((row) => ({
    id: String(row.id),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    status: String(row.status ?? ''),
  }))
  const preserve = all.filter((t) => t.id === preserveTenantId)
  const deleteCandidates = all.filter((t) => t.id !== preserveTenantId)
  return { all, preserve, deleteCandidates }
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 * @param {string} preserveTenantId
 * @param {string[]} deleteTenantIds
 */
async function loadProtectedUserIds(client, preserveTenantId, deleteTenantIds) {
  const protectedIds = new Set()

  const superUsers = await client.query(
    `
    SELECT id FROM users
    WHERE COALESCE(is_deleted, false) IS NOT TRUE
      AND UPPER(TRIM(COALESCE(role::text, ''))) = 'SUPER_ADMIN'
    `,
  )
  for (const row of superUsers.rows) protectedIds.add(String(row.id))

  const membershipProtected = await client.query(
    `
    SELECT DISTINCT user_id
    FROM user_memberships
    WHERE status = 'active'
      AND LOWER(TRIM(role)) = ANY($1::text[])
    `,
    [[...PROTECTED_MEMBERSHIP_ROLES]],
  )
  for (const row of membershipProtected.rows) protectedIds.add(String(row.user_id))

  const sesungMembers = await client.query(
    `
    SELECT DISTINCT user_id
    FROM user_memberships
    WHERE tenant_id = $1::bigint
    `,
    [preserveTenantId],
  )
  for (const row of sesungMembers.rows) protectedIds.add(String(row.user_id))

  const sesungProfileOwners = await client.query(
    `
    SELECT DISTINCT owner_user_id AS user_id
    FROM gov_support_profiles
    WHERE tenant_id = $1::bigint
      AND owner_user_id IS NOT NULL
    `,
    [preserveTenantId],
  )
  for (const row of sesungProfileOwners.rows) {
    if (row.user_id) protectedIds.add(String(row.user_id))
  }

  const govUsersOnDeleteTenants = await client.query(
    `
    SELECT DISTINCT m.user_id
    FROM user_memberships m
    WHERE m.tenant_id = ANY($1::bigint[])
      AND LOWER(TRIM(m.role)) = ANY($2::text[])
    `,
    [deleteTenantIds, [...GOVERNMENT_MEMBERSHIP_ROLES]],
  )

  const deleteUserIds = new Set()
  for (const row of govUsersOnDeleteTenants.rows) {
    const uid = String(row.user_id)
    if (!protectedIds.has(uid)) deleteUserIds.add(uid)
  }

  const orphanGovUsers = await client.query(
    `
    SELECT DISTINCT m.user_id
    FROM user_memberships m
    WHERE LOWER(TRIM(m.role)) = ANY($1::text[])
      AND m.user_id <> ALL($2::text[])
      AND NOT EXISTS (
        SELECT 1 FROM user_memberships m2
        WHERE m2.user_id = m.user_id
          AND m2.tenant_id = $3::bigint
      )
    `,
    [[...GOVERNMENT_MEMBERSHIP_ROLES], [...protectedIds], preserveTenantId],
  )
  for (const row of orphanGovUsers.rows) {
    const uid = String(row.user_id)
    if (!protectedIds.has(uid)) deleteUserIds.add(uid)
  }

  return { protectedIds: [...protectedIds], deleteUserIds: [...deleteUserIds] }
}

/** @param {import('pg').PoolClient | { query: Function }} client */
async function countBySql(client, sql, params = []) {
  const r = await client.query(sql, params)
  return Number(r.rows[0]?.c ?? 0)
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 * @param {{ preserveTenantId: string, deleteTenantIds: string[], deleteUserIds: string[] }} scope
 */
async function buildTableDeleteCounts(client, scope) {
  const { preserveTenantId, deleteTenantIds, deleteUserIds } = scope
  if (deleteTenantIds.length === 0 && deleteUserIds.length === 0) {
    return {}
  }

  const tenantArr = deleteTenantIds.map((id) => Number(id))
  const userArr = deleteUserIds

  /** @type {Record<string, number>} */
  const counts = {}

  const specs = [
    ['tenants', `SELECT COUNT(*)::int AS c FROM tenants WHERE id = ANY($1::bigint[])`, [tenantArr]],
    [
      'tenant_registration_codes',
      `SELECT COUNT(*)::int AS c FROM tenant_registration_codes WHERE tenant_id = ANY($1::bigint[])`,
      [tenantArr],
    ],
    [
      'gov_support_profiles',
      `SELECT COUNT(*)::int AS c FROM gov_support_profiles WHERE tenant_id = ANY($1::bigint[])`,
      [tenantArr],
    ],
    [
      'gov_support_profile_applications',
      `SELECT COUNT(*)::int AS c FROM gov_support_profile_applications a
       INNER JOIN gov_support_profiles p ON p.id = a.profile_id
       WHERE p.tenant_id = ANY($1::bigint[])`,
      [tenantArr],
    ],
    [
      'gov_support_document_requests',
      `SELECT COUNT(*)::int AS c FROM gov_support_document_requests WHERE tenant_id = ANY($1::bigint[])`,
      [tenantArr],
    ],
    [
      'gov_support_inquiries',
      `SELECT COUNT(*)::int AS c FROM gov_support_inquiries WHERE tenant_id = ANY($1::bigint[])`,
      [tenantArr],
    ],
    [
      'gov_support_notices_tenant',
      `SELECT COUNT(*)::int AS c FROM gov_support_notices WHERE tenant_id = ANY($1::bigint[])`,
      [tenantArr],
    ],
    [
      'gov_support_resources_tenant',
      `SELECT COUNT(*)::int AS c FROM gov_support_resources WHERE tenant_id = ANY($1::bigint[])`,
      [tenantArr],
    ],
    [
      'gov_signature_send_sessions',
      `SELECT COUNT(*)::int AS c FROM gov_signature_send_sessions s
       INNER JOIN gov_support_profiles p ON p.id = s.profile_id
       WHERE p.tenant_id = ANY($1::bigint[])`,
      [tenantArr],
    ],
    [
      'gov_signature_templates_tenant',
      `SELECT COUNT(*)::int AS c FROM gov_signature_templates WHERE tenant_id = ANY($1::bigint[])`,
      [tenantArr],
    ],
    [
      'gov_signature_templates_owner',
      `SELECT COUNT(*)::int AS c FROM gov_signature_templates WHERE owner_user_id = ANY($1::text[])`,
      [userArr],
    ],
    [
      'pdf_templates_gov_tenant',
      `SELECT COUNT(*)::int AS c FROM pdf_templates WHERE gov_tenant_id = ANY($1::bigint[])`,
      [tenantArr],
    ],
    [
      'pdf_templates_gov_owner',
      `SELECT COUNT(*)::int AS c FROM pdf_templates WHERE gov_owner_user_id = ANY($1::text[])`,
      [userArr],
    ],
    [
      'user_memberships_delete_tenant',
      `SELECT COUNT(*)::int AS c FROM user_memberships WHERE tenant_id = ANY($1::bigint[])`,
      [tenantArr],
    ],
    [
      'user_memberships_delete_user',
      `SELECT COUNT(*)::int AS c FROM user_memberships WHERE user_id = ANY($1::text[])`,
      [userArr],
    ],
    [
      'users_delete_candidates',
      `SELECT COUNT(*)::int AS c FROM users WHERE id = ANY($1::text[]) AND COALESCE(is_deleted, false) IS NOT TRUE`,
      [userArr],
    ],
    [
      'gov_support_profiles_preserve',
      `SELECT COUNT(*)::int AS c FROM gov_support_profiles WHERE tenant_id = $1::bigint`,
      [Number(preserveTenantId)],
    ],
  ]

  for (const [key, sql, params] of specs) {
    if ((params[0] ?? []).length === 0 && key.includes('delete_user')) {
      counts[key] = 0
      continue
    }
    if ((params[0] ?? []).length === 0 && key.includes('tenant') && key !== 'gov_support_profiles_preserve') {
      counts[key] = 0
      continue
    }
    counts[key] = await countBySql(client, sql, params)
  }

  return counts
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 */
async function loadGlobalDummyCandidates(client) {
  const notices = await client.query(
    `
    SELECT id, title, scope_type
    FROM gov_support_notices
    WHERE tenant_id IS NULL
      AND (title ~* $1 OR content ~* $1)
    ORDER BY id
    LIMIT 20
    `,
    [DUMMY_NAME_PG_PATTERN],
  )
  const resources = await client.query(
    `
    SELECT id, title, scope_type
    FROM gov_support_resources
    WHERE tenant_id IS NULL
      AND (title ~* $1 OR description ~* $1 OR file_name ~* $1)
    ORDER BY id
    LIMIT 20
    `,
    [DUMMY_NAME_PG_PATTERN],
  )
  const sigTemplates = await client.query(
    `
    SELECT id, title, tenant_id
    FROM gov_signature_templates
    WHERE tenant_id IS NULL
      AND title ~* $1
    ORDER BY created_at DESC
    LIMIT 20
    `,
    [DUMMY_NAME_PG_PATTERN],
  )
  const pdfTemplates = await client.query(
    `
    SELECT id, title, gov_tenant_id
    FROM pdf_templates
    WHERE gov_owner_user_id IS NOT NULL
      AND gov_tenant_id IS NULL
      AND (title ~* $1 OR code ~* $1)
    ORDER BY id DESC
    LIMIT 20
    `,
    [DUMMY_NAME_PG_PATTERN],
  )

  return {
    notices: notices.rows.map((r) => ({ id: String(r.id), title: r.title, scopeType: r.scope_type })),
    resources: resources.rows.map((r) => ({ id: String(r.id), title: r.title, scopeType: r.scope_type })),
    signatureTemplates: sigTemplates.rows.map((r) => ({
      id: r.id,
      title: r.title,
      tenantId: r.tenant_id,
    })),
    pdfTemplates: pdfTemplates.rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      govTenantId: r.gov_tenant_id,
    })),
  }
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 * @param {{ sampleLimit?: number }} [opts]
 */
export async function buildGovernmentDummyCleanupPlan(client, opts = {}) {
  const sampleLimit = opts.sampleLimit ?? 5
  const sesung = await resolveSesungGovernmentTenant(client)
  const { all: governmentTenants, preserve, deleteCandidates } = await loadGovernmentTenants(
    client,
    sesung.id,
  )
  const deleteTenantIds = deleteCandidates.map((t) => t.id)
  const { protectedIds, deleteUserIds } = await loadProtectedUserIds(client, sesung.id, deleteTenantIds)

  const regCodes = await client.query(
    `
    SELECT rc.id, rc.code, rc.tenant_id, rc.status, t.name AS tenant_name
    FROM tenant_registration_codes rc
    INNER JOIN tenants t ON t.id = rc.tenant_id
    INNER JOIN industries i ON i.id = t.industry_id
    WHERE LOWER(TRIM(i.code)) = $1
    ORDER BY rc.tenant_id, rc.code
    `,
    [GOVERNMENT_INDUSTRY_CODE],
  )

  const preserveRegCodes = regCodes.rows.filter((r) => String(r.tenant_id) === sesung.id)
  const deleteRegCodes = regCodes.rows.filter((r) => String(r.tenant_id) !== sesung.id)

  const deleteUsersSample = deleteUserIds.length
    ? (
        await client.query(
          `
        SELECT u.id, u.username, u.display_name, u.role
        FROM users u
        WHERE u.id = ANY($1::text[])
        ORDER BY u.username
        LIMIT $2
        `,
          [deleteUserIds, sampleLimit],
        )
      ).rows.map((r) => ({
        id: String(r.id),
        username: r.username,
        displayName: r.display_name,
        role: r.role,
        note: protectedIds.includes(String(r.id)) ? '보존: 세승 연결' : undefined,
      }))
    : []

  const tableCounts = await buildTableDeleteCounts(client, {
    preserveTenantId: sesung.id,
    deleteTenantIds,
    deleteUserIds,
  })

  const globalDummyCandidates = await loadGlobalDummyCandidates(client)

  const preserveSummary = {
    tenantIds: [sesung.id],
    userCount: protectedIds.length,
    profileCount: tableCounts.gov_support_profiles_preserve ?? 0,
    registrationCodeCount: preserveRegCodes.length,
  }

  const plan = {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    sesung,
    governmentTenants,
    preserveTenants: preserve,
    deleteTenantCandidates: deleteCandidates,
    preserveUserIds: protectedIds,
    deleteUserIds,
    deleteUsersSample,
    preserveRegistrationCodes: preserveRegCodes.map((r) => ({
      id: String(r.id),
      code: r.code,
      tenantId: String(r.tenant_id),
      status: r.status,
    })),
    deleteRegistrationCodes: deleteRegCodes.map((r) => ({
      id: String(r.id),
      code: r.code,
      tenantId: String(r.tenant_id),
      tenantName: r.tenant_name,
      status: r.status,
    })),
    tableDeleteCounts: tableCounts,
    globalDummyCandidates,
    preserveSummary,
    deleteStrategy: 'hard-delete',
    deleteStrategyNotes: [
      '세승 tenant 및 연결 데이터는 보존.',
      '세승이 아닌 government tenant 삭제 시 gov_support_* 는 tenants ON DELETE CASCADE 로 정리.',
      'gov_signature_templates / pdf_templates 는 tenant SET NULL 이므로 execute 시 선삭제.',
      'global 공지/자료/템플릿 중 dummy 명칭은 이번 execute 대상에서 제외(별도 승인).',
      'R2 object 는 삭제하지 않음.',
    ],
    warnings: [
      '파괴적 작업 — execute 전 dry-run 결과를 반드시 검토하세요.',
      '세승 tenant 가 정확히 1개일 때만 실행 가능합니다.',
      'admin / government_industry_admin / SUPER_ADMIN 은 보존합니다.',
    ],
    r2Deletion: false,
  }

  plan.planHash = createHash('sha256').update(JSON.stringify({
    sesungId: sesung.id,
    deleteTenantIds,
    deleteUserIds,
    tableDeleteCounts: plan.tableDeleteCounts,
  })).digest('hex')

  return plan
}

/**
 * @param {object} plan
 * @param {string} projectRoot
 */
export function writeDryRunReports(plan, projectRoot) {
  const tmpDir = path.join(projectRoot, 'tmp')
  fs.mkdirSync(tmpDir, { recursive: true })
  const jsonPath = path.join(tmpDir, DRY_RUN_JSON)
  const txtPath = path.join(tmpDir, DRY_RUN_TXT)

  fs.writeFileSync(jsonPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8')

  const lines = [
    '정부지원 CRM develop — 더미 데이터 정리 dry-run',
    `generatedAt: ${plan.generatedAt}`,
    `planHash: ${plan.planHash}`,
    '',
    '== DB 환경 ==',
    `DATABASE_URL: ${maskDatabaseUrl(process.env.DATABASE_URL)}`,
    `NODE_ENV: ${process.env.NODE_ENV ?? '(unset)'}`,
    `APP_PRODUCT: ${process.env.APP_PRODUCT ?? '(unset)'}`,
    `RAILWAY_ENVIRONMENT_NAME: ${process.env.RAILWAY_ENVIRONMENT_NAME ?? '(unset)'}`,
    '',
    '== 세승 tenant ==',
    `id: ${plan.sesung.id}`,
    `code: ${plan.sesung.code}`,
    `name: ${plan.sesung.name}`,
    '',
    '== 보존 요약 ==',
    `preserve tenants: ${plan.preserveTenants.map((t) => `${t.id}(${t.name})`).join(', ')}`,
    `preserve users: ${plan.preserveUserIds.length}`,
    `preserve profiles (sesung): ${plan.preserveSummary?.profileCount ?? plan.tableDeleteCounts?.gov_support_profiles_preserve ?? 0}`,
  ]

  if (plan.preserveSummary) {
    lines.push(`preserve registration codes: ${plan.preserveSummary.registrationCodeCount}`)
  }

  lines.push('', '== 삭제 후보 tenant ==')
  for (const t of plan.deleteTenantCandidates) {
    lines.push(`- ${t.id} | ${t.code} | ${t.name}`)
  }

  lines.push('', '== 삭제 후보 users (sample) ==')
  for (const u of plan.deleteUsersSample) {
    lines.push(`- ${u.id} | ${u.username} | ${u.displayName ?? ''}${u.note ? ` | ${u.note}` : ''}`)
  }
  if (plan.deleteUserIds.length > plan.deleteUsersSample.length) {
    lines.push(`... 외 ${plan.deleteUserIds.length - plan.deleteUsersSample.length}명`)
  }

  lines.push('', '== 테이블별 삭제 후보 count ==')
  for (const [k, v] of Object.entries(plan.tableDeleteCounts ?? {})) {
    lines.push(`${k}: ${v}`)
  }

  lines.push('', '== global dummy 후보 (이번 execute 제외) ==')
  lines.push(`notices: ${plan.globalDummyCandidates?.notices?.length ?? 0}`)
  lines.push(`resources: ${plan.globalDummyCandidates?.resources?.length ?? 0}`)
  lines.push(`signatureTemplates: ${plan.globalDummyCandidates?.signatureTemplates?.length ?? 0}`)
  lines.push(`pdfTemplates: ${plan.globalDummyCandidates?.pdfTemplates?.length ?? 0}`)

  lines.push('', '== 위험 경고 ==')
  for (const w of plan.warnings ?? []) lines.push(`- ${w}`)

  lines.push('', '== execute 명령 (승인 후) ==')
  lines.push(
    'CONFIRM_GOVERNMENT_DUMMY_CLEANUP=DELETE_NON_SESUNG_DUMMY_DATA railway run -e develop -s app node scripts/government-cleanup-dummy-data.js --execute',
  )

  fs.writeFileSync(txtPath, `${lines.join('\n')}\n`, 'utf8')
  return { jsonPath, txtPath }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {object} plan
 */
export async function executeGovernmentDummyCleanup(client, plan) {
  const deleteTenantIds = plan.deleteTenantCandidates.map((t) => Number(t.id))
  const deleteUserIds = [...plan.deleteUserIds]
  const tenantIdNums = deleteTenantIds

  if (deleteTenantIds.length === 0 && deleteUserIds.length === 0) {
    return { deleted: {}, message: '삭제할 더미 tenant/user 가 없습니다.' }
  }

  /** @type {Record<string, number>} */
  const deleted = {}

  await client.query('BEGIN')
  try {
    if (tenantIdNums.length > 0) {
      const r1 = await client.query(
        `DELETE FROM gov_signature_templates WHERE tenant_id = ANY($1::bigint[])`,
        [tenantIdNums],
      )
      deleted.gov_signature_templates_tenant = r1.rowCount ?? 0
    }

    if (deleteUserIds.length > 0) {
      const r2 = await client.query(
        `DELETE FROM gov_signature_templates WHERE owner_user_id = ANY($1::text[])`,
        [deleteUserIds],
      )
      deleted.gov_signature_templates_owner = r2.rowCount ?? 0
    }

    if (tenantIdNums.length > 0) {
      const r3 = await client.query(
        `DELETE FROM pdf_templates WHERE gov_tenant_id = ANY($1::bigint[])`,
        [tenantIdNums],
      )
      deleted.pdf_templates_gov_tenant = r3.rowCount ?? 0
    }

    if (deleteUserIds.length > 0) {
      const r4 = await client.query(
        `DELETE FROM pdf_templates WHERE gov_owner_user_id = ANY($1::text[])`,
        [deleteUserIds],
      )
      deleted.pdf_templates_gov_owner = r4.rowCount ?? 0
    }

    if (tenantIdNums.length > 0) {
      const r5 = await client.query(
        `DELETE FROM user_memberships WHERE tenant_id = ANY($1::bigint[])`,
        [tenantIdNums],
      )
      deleted.user_memberships_by_tenant = r5.rowCount ?? 0
    }

    if (deleteUserIds.length > 0) {
      const r6 = await client.query(
        `DELETE FROM user_memberships WHERE user_id = ANY($1::text[])`,
        [deleteUserIds],
      )
      deleted.user_memberships_by_user = r6.rowCount ?? 0

      const r7 = await client.query(
        `
        DELETE FROM users
        WHERE id = ANY($1::text[])
          AND COALESCE(is_deleted, false) IS NOT TRUE
          AND UPPER(TRIM(COALESCE(role::text, ''))) <> 'SUPER_ADMIN'
        `,
        [deleteUserIds],
      )
      deleted.users = r7.rowCount ?? 0
    }

    if (tenantIdNums.length > 0) {
      const r8 = await client.query(`DELETE FROM tenants WHERE id = ANY($1::bigint[])`, [tenantIdNums])
      deleted.tenants = r8.rowCount ?? 0
    }

    const remaining = await buildTableDeleteCounts(client, {
      preserveTenantId: plan.sesung.id,
      deleteTenantIds: plan.deleteTenantCandidates.map((t) => t.id),
      deleteUserIds: plan.deleteUserIds,
    })
    const leaked = Object.entries(remaining).filter(
      ([k, v]) => v > 0 && k !== 'gov_support_profiles_preserve',
    )
    if (leaked.length > 0) {
      throw new Error(`Post-delete verification failed: ${JSON.stringify(Object.fromEntries(leaked))}`)
    }

    await client.query('COMMIT')
    return { deleted, message: 'COMMIT ok' }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}

/**
 * @param {string} projectRoot
 * @param {object} plan
 */
export function assertDryRunArtifactForExecute(projectRoot, plan) {
  const jsonPath = path.join(projectRoot, 'tmp', DRY_RUN_JSON)
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dry-run artifact missing: ${jsonPath}. Run --dry-run first.`)
  }
  const saved = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  if (saved.planHash !== plan.planHash) {
    throw new Error('Dry-run planHash mismatch. Re-run --dry-run and review before --execute.')
  }
}

/**
 * @param {string[]} argv
 */
export function parseCleanupArgv(argv) {
  const execute = argv.includes('--execute')
  const dryRun = argv.includes('--dry-run') || !execute
  return { dryRun, execute }
}
