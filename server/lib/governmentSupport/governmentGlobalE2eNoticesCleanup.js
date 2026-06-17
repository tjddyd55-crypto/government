/**
 * 정부지원 CRM develop — global E2E/test 더미 공지 정리 (tenant_id IS NULL).
 * tenant 더미 cleanup 과 plan·confirm·산출물을 분리한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { resolveSesungGovernmentTenant } from './governmentDummyDataCleanup.js'

export const GLOBAL_E2E_NOTICE_CONFIRM_VALUE = 'DELETE_GLOBAL_E2E_NOTICES'
export const GLOBAL_E2E_NOTICE_DRY_RUN_JSON = 'government-global-e2e-notices-cleanup-dry-run.json'
export const GLOBAL_E2E_NOTICE_DRY_RUN_TXT = 'government-global-e2e-notices-cleanup-dry-run.txt'

/** @type {readonly string} */
export const GLOBAL_E2E_NOTICE_PG_PATTERN =
  'E2E|e2e|smoke|test|dummy|sample|테스트|더미|샘플'

const DEFAULT_EXPECTED_CANDIDATE_COUNT = 46

/**
 * @param {Record<string, unknown>} row
 */
function mapNoticeRow(row) {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    scopeType: String(row.scope_type ?? ''),
    status: String(row.status ?? ''),
    tenantId: row.tenant_id != null ? String(row.tenant_id) : null,
    createdAt: row.created_at ?? null,
  }
}

/**
 * @param {import('pg').PoolClient | { query: Function }} client
 * @param {{ expectedCount?: number }} [opts]
 */
export async function buildGlobalE2eNoticesCleanupPlan(client, opts = {}) {
  const expectedCount = opts.expectedCount ?? DEFAULT_EXPECTED_CANDIDATE_COUNT
  const sesung = await resolveSesungGovernmentTenant(client)

  const candidatesR = await client.query(
    `
    SELECT id, title, content, scope_type, status, tenant_id, created_at
    FROM gov_support_notices
    WHERE tenant_id IS NULL
      AND (title ~* $1 OR content ~* $1)
    ORDER BY id ASC
    `,
    [GLOBAL_E2E_NOTICE_PG_PATTERN],
  )

  const excludedR = await client.query(
    `
    SELECT id, title, scope_type, status, created_at
    FROM gov_support_notices
    WHERE tenant_id IS NULL
      AND NOT (title ~* $1 OR content ~* $1)
    ORDER BY id ASC
    `,
    [GLOBAL_E2E_NOTICE_PG_PATTERN],
  )

  const sesungNoticeCount = await client.query(
    `SELECT COUNT(*)::int AS c FROM gov_support_notices WHERE tenant_id = $1::bigint`,
    [sesung.id],
  )

  const candidates = candidatesR.rows.map(mapNoticeRow)
  const excludedGlobalNotices = excludedR.rows.map(mapNoticeRow)

  /** @type {string[]} */
  const abortReasons = []

  if (candidates.length !== expectedCount) {
    abortReasons.push(
      `global E2E 공지 후보 ${candidates.length}건 — 예상 ${expectedCount}건과 불일치`,
    )
  }

  for (const row of candidatesR.rows) {
    if (row.tenant_id != null) {
      abortReasons.push(`후보에 tenant_id가 있는 공지 포함: id=${row.id}`)
    }
    if (String(row.tenant_id) === sesung.id) {
      abortReasons.push(`세승 tenant 공지가 후보에 포함됨: id=${row.id}`)
    }
  }

  const candidateIds = new Set(candidates.map((c) => c.id))
  for (const ex of excludedGlobalNotices) {
    if (candidateIds.has(ex.id)) {
      abortReasons.push(`제외 목록과 후보 목록이 겹침: id=${ex.id}`)
    }
  }

  const plan = {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    sesung: { id: sesung.id, code: sesung.code, name: sesung.name },
    expectedCandidateCount: expectedCount,
    candidateCount: candidates.length,
    candidates,
    excludedGlobalNotices,
    sesungTenantNoticeCount: Number(sesungNoticeCount.rows[0]?.c ?? 0),
    abortReasons,
    canExecute: abortReasons.length === 0 && candidates.length > 0,
    deleteStrategy: 'hard-delete-notices-only',
    r2Deletion: false,
    warnings: [
      'global 공지 중 E2E/test/dummy 패턴만 삭제합니다.',
      'tenant_id IS NULL 인 행만 대상입니다.',
      '세승 tenant 공지는 대상이 아닙니다.',
      'R2 object 는 삭제하지 않습니다.',
    ],
  }

  plan.planHash = createHash('sha256')
    .update(
      JSON.stringify({
        sesungId: sesung.id,
        candidateIds: candidates.map((c) => c.id),
        expectedCount,
      }),
    )
    .digest('hex')

  return plan
}

/**
 * @param {object} plan
 * @param {string} projectRoot
 */
export function writeGlobalE2eNoticesDryRunReports(plan, projectRoot) {
  const tmpDir = path.join(projectRoot, 'tmp')
  fs.mkdirSync(tmpDir, { recursive: true })
  const jsonPath = path.join(tmpDir, GLOBAL_E2E_NOTICE_DRY_RUN_JSON)
  const txtPath = path.join(tmpDir, GLOBAL_E2E_NOTICE_DRY_RUN_TXT)

  fs.writeFileSync(jsonPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8')

  const lines = [
    '정부지원 CRM develop — global E2E 공지 정리 dry-run',
    `generatedAt: ${plan.generatedAt}`,
    `planHash: ${plan.planHash}`,
    '',
    '== 세승 tenant ==',
    `id: ${plan.sesung.id} | ${plan.sesung.code} | ${plan.sesung.name}`,
    `sesung tenant 공지 count: ${plan.sesungTenantNoticeCount}`,
    '',
    `== global E2E 공지 후보 (${plan.candidateCount}건, 예상 ${plan.expectedCandidateCount}건) ==`,
    ...plan.candidates.map(
      (n) =>
        `- ${n.id} | ${n.scopeType} | ${n.status} | ${n.createdAt ?? '—'} | ${n.title}`,
    ),
    '',
    `== 삭제 제외 global 공지 (${plan.excludedGlobalNotices.length}건) ==`,
    ...plan.excludedGlobalNotices.map(
      (n) => `- ${n.id} | ${n.scopeType} | ${n.status} | ${n.title}`,
    ),
    '',
    '== 중단 조건 ==',
    ...(plan.abortReasons.length ? plan.abortReasons.map((r) => `- ${r}`) : ['- 없음']),
    '',
    `canExecute: ${plan.canExecute}`,
    '',
    '== execute (승인 후) ==',
    'CONFIRM_GOVERNMENT_GLOBAL_E2E_NOTICE_CLEANUP=DELETE_GLOBAL_E2E_NOTICES node scripts/government-cleanup-global-e2e-notices.js --execute',
  ]

  fs.writeFileSync(txtPath, `${lines.join('\n')}\n`, 'utf8')
  return { jsonPath, txtPath }
}

/**
 * @param {string} projectRoot
 * @param {object} plan
 */
export function assertGlobalE2eNoticesDryRunArtifactForExecute(projectRoot, plan) {
  const jsonPath = path.join(projectRoot, 'tmp', GLOBAL_E2E_NOTICE_DRY_RUN_JSON)
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dry-run artifact missing: ${jsonPath}. Run --dry-run first.`)
  }
  const saved = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  if (saved.planHash !== plan.planHash) {
    throw new Error('Global E2E notices planHash mismatch. Re-run --dry-run.')
  }
  if (!plan.canExecute) {
    throw new Error(`Execute blocked: ${(plan.abortReasons ?? []).join('; ') || 'canExecute=false'}`)
  }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {object} plan
 */
export async function executeGlobalE2eNoticesCleanup(client, plan) {
  if (!plan.canExecute) {
    throw new Error(`Execute blocked: ${(plan.abortReasons ?? []).join('; ')}`)
  }

  const ids = plan.candidates.map((c) => Number(c.id)).filter((id) => Number.isInteger(id) && id > 0)
  if (ids.length === 0) {
    return { deleted: 0, message: '삭제할 공지가 없습니다.' }
  }

  await client.query('BEGIN')
  try {
    const r = await client.query(`DELETE FROM gov_support_notices WHERE id = ANY($1::bigint[])`, [ids])
    const deleted = r.rowCount ?? 0

    const remaining = await client.query(
      `
      SELECT COUNT(*)::int AS c
      FROM gov_support_notices
      WHERE tenant_id IS NULL
        AND (title ~* $1 OR content ~* $1)
      `,
      [GLOBAL_E2E_NOTICE_PG_PATTERN],
    )
    const left = Number(remaining.rows[0]?.c ?? 0)
    if (left > 0) {
      throw new Error(`Post-delete verification failed: ${left} global E2E notices remain`)
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
export function parseGlobalE2eNoticesCleanupArgv(argv) {
  const execute = argv.includes('--execute')
  const dryRun = argv.includes('--dry-run') || !execute
  return { dryRun, execute }
}
