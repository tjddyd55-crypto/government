#!/usr/bin/env node
/**
 * 정부지원 CRM develop DB — global E2E/test 더미 공지 정리 (tenant_id IS NULL).
 * tenant 더미 cleanup 과 plan·confirm·산출물을 분리한다.
 *
 * dry-run:
 *   node scripts/government-cleanup-global-e2e-notices.js --dry-run
 *
 * execute (승인 후):
 *   CONFIRM_GOVERNMENT_GLOBAL_E2E_NOTICE_CLEANUP=DELETE_GLOBAL_E2E_NOTICES \
 *   node scripts/government-cleanup-global-e2e-notices.js --execute
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertDevelopGovernmentDbTarget,
  maskDatabaseUrl,
} from '../server/lib/governmentSupport/governmentDummyDataCleanup.js'
import {
  assertGlobalE2eNoticesDryRunArtifactForExecute,
  buildGlobalE2eNoticesCleanupPlan,
  executeGlobalE2eNoticesCleanup,
  GLOBAL_E2E_NOTICE_CONFIRM_VALUE,
  parseGlobalE2eNoticesCleanupArgv,
  writeGlobalE2eNoticesDryRunReports,
} from '../server/lib/governmentSupport/governmentGlobalE2eNoticesCleanup.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

function loadEnvFileIfPresent(filename) {
  const p = path.join(projectRoot, filename)
  if (!fs.existsSync(p)) return
  const raw = fs.readFileSync(p, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

function ensureDatabaseUrl() {
  const pick = (...keys) => {
    for (const k of keys) {
      const v = String(process.env[k] ?? '').trim()
      if (v && !v.includes('user:password@host')) return v
    }
    return ''
  }
  const url =
    pick('DATABASE_PUBLIC_URL', 'PUBLIC_DATABASE_URL', 'DATABASE_URL', 'POSTGRES_URL') || ''
  if (url) process.env.DATABASE_URL = url
}

function exitIfRailwayInternalFromLocalMachine(url) {
  if (!url || !/\.railway\.internal\b/i.test(String(url))) return
  if (process.env.RAILWAY_REPLICA_ID || process.env.RAILWAY_SERVICE_ID) return
  console.error(
    '[gov-global-e2e-notices] 로컬에서는 postgres.railway.internal 에 연결할 수 없습니다.',
  )
  console.error(
    '[gov-global-e2e-notices] Railway Dashboard → Postgres → Public Network URL 을 DATABASE_PUBLIC_URL 로 주입하세요.',
  )
  process.exit(1)
}

function logEnvironment() {
  console.log('[gov-global-e2e-notices] == DB 환경 ==')
  console.log(
    `[gov-global-e2e-notices] DATABASE_URL: ${maskDatabaseUrl(process.env.DATABASE_URL)}`,
  )
  console.log(`[gov-global-e2e-notices] APP_PRODUCT: ${process.env.APP_PRODUCT ?? '(unset)'}`)
  console.log(
    `[gov-global-e2e-notices] RAILWAY_ENVIRONMENT_NAME: ${process.env.RAILWAY_ENVIRONMENT_NAME ?? '(unset)'}`,
  )
}

async function main() {
  const { dryRun, execute } = parseGlobalE2eNoticesCleanupArgv(process.argv.slice(2))
  loadEnvFileIfPresent('.env')
  loadEnvFileIfPresent('.env.local')
  ensureDatabaseUrl()

  exitIfRailwayInternalFromLocalMachine(process.env.DATABASE_URL)

  assertDevelopGovernmentDbTarget()
  logEnvironment()

  const { default: pool } = await import('../server/db.js')
  const client = await pool.connect()

  try {
    const plan = await buildGlobalE2eNoticesCleanupPlan(client)
    plan.mode = dryRun ? 'dry-run' : 'execute'

    console.log(
      '[gov-global-e2e-notices] 세승 tenant:',
      `${plan.sesung.id} | ${plan.sesung.code} | ${plan.sesung.name}`,
    )
    console.log('[gov-global-e2e-notices] global E2E 공지 후보:', plan.candidateCount)
    console.log('[gov-global-e2e-notices] 제외 global 공지:', plan.excludedGlobalNotices.length)
    console.log('[gov-global-e2e-notices] sesung tenant 공지:', plan.sesungTenantNoticeCount)
    console.log('[gov-global-e2e-notices] planHash:', plan.planHash)
    console.log('[gov-global-e2e-notices] canExecute:', plan.canExecute)
    if (plan.abortReasons.length) {
      console.log('[gov-global-e2e-notices] abortReasons:', plan.abortReasons.join('; '))
    }

    if (dryRun) {
      const { jsonPath, txtPath } = writeGlobalE2eNoticesDryRunReports(plan, projectRoot)
      console.log('[gov-global-e2e-notices] dry-run 완료 — 삭제 없음')
      console.log(`[gov-global-e2e-notices] JSON: ${jsonPath}`)
      console.log(`[gov-global-e2e-notices] TXT: ${txtPath}`)
      return
    }

    if (process.env.CONFIRM_GOVERNMENT_GLOBAL_E2E_NOTICE_CLEANUP !== GLOBAL_E2E_NOTICE_CONFIRM_VALUE) {
      throw new Error(
        `execute blocked: set CONFIRM_GOVERNMENT_GLOBAL_E2E_NOTICE_CLEANUP=${GLOBAL_E2E_NOTICE_CONFIRM_VALUE}`,
      )
    }

    assertGlobalE2eNoticesDryRunArtifactForExecute(projectRoot, plan)
    console.warn('[gov-global-e2e-notices] EXECUTE — transaction 시작')
    const result = await executeGlobalE2eNoticesCleanup(client, plan)
    console.log('[gov-global-e2e-notices] execute 완료:', JSON.stringify(result, null, 2))
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[gov-global-e2e-notices] FATAL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
