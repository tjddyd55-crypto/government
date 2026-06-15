#!/usr/bin/env node
/**
 * 정부지원 CRM develop DB — 세승 보존·더미 데이터 정리.
 *
 * dry-run (기본):
 *   railway run -e develop -s app node scripts/government-cleanup-dummy-data.js --dry-run
 *
 * execute (승인 후):
 *   CONFIRM_GOVERNMENT_DUMMY_CLEANUP=DELETE_NON_SESUNG_DUMMY_DATA \
 *   railway run -e develop -s app node scripts/government-cleanup-dummy-data.js --execute
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertDevelopGovernmentDbTarget,
  assertDryRunArtifactForExecute,
  buildGovernmentDummyCleanupPlan,
  CONFIRM_ENV_VALUE,
  executeGovernmentDummyCleanup,
  maskDatabaseUrl,
  parseCleanupArgv,
  writeDryRunReports,
} from '../server/lib/governmentSupport/governmentDummyDataCleanup.js'

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
    '[gov-cleanup] 로컬에서는 postgres.railway.internal 에 연결할 수 없습니다.',
  )
  console.error(
    '[gov-cleanup] Railway Dashboard → Postgres → Connect → Public Network URL 을 DATABASE_PUBLIC_URL 로 주입하거나,',
  )
  console.error(
    '[gov-cleanup] `railway shell -e develop -s app` 안에서 동일 명령을 실행하세요.',
  )
  process.exit(1)
}

function logEnvironment() {
  console.log('[gov-cleanup] == DB 환경 ==')
  console.log(`[gov-cleanup] DATABASE_URL: ${maskDatabaseUrl(process.env.DATABASE_URL)}`)
  console.log(`[gov-cleanup] NODE_ENV: ${process.env.NODE_ENV ?? '(unset)'}`)
  console.log(`[gov-cleanup] APP_PRODUCT: ${process.env.APP_PRODUCT ?? '(unset)'}`)
  console.log(
    `[gov-cleanup] RAILWAY_ENVIRONMENT_NAME: ${process.env.RAILWAY_ENVIRONMENT_NAME ?? '(unset)'}`,
  )
  console.log(
    `[gov-cleanup] RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT ?? '(unset)'}`,
  )
}

async function main() {
  const { dryRun, execute } = parseCleanupArgv(process.argv.slice(2))
  loadEnvFileIfPresent('.env')
  loadEnvFileIfPresent('.env.local')
  ensureDatabaseUrl()

  exitIfRailwayInternalFromLocalMachine(process.env.DATABASE_URL)

  assertDevelopGovernmentDbTarget()
  logEnvironment()

  const { default: pool } = await import('../server/db.js')
  const client = await pool.connect()

  try {
    const plan = await buildGovernmentDummyCleanupPlan(client)
    plan.mode = dryRun ? 'dry-run' : 'execute'

    console.log('[gov-cleanup] 세승 tenant:', `${plan.sesung.id} | ${plan.sesung.code} | ${plan.sesung.name}`)
    console.log('[gov-cleanup] 보존 users:', plan.preserveUserIds.length)
    console.log('[gov-cleanup] 보존 profiles:', plan.preserveSummary.profileCount)
    console.log('[gov-cleanup] 삭제 후보 tenants:', plan.deleteTenantCandidates.length)
    console.log('[gov-cleanup] 삭제 후보 users:', plan.deleteUserIds.length)
    console.log('[gov-cleanup] 테이블별 count:', JSON.stringify(plan.tableDeleteCounts, null, 2))

    if (dryRun) {
      const { jsonPath, txtPath } = writeDryRunReports(plan, projectRoot)
      console.log('[gov-cleanup] dry-run 완료 — 삭제 없음')
      console.log(`[gov-cleanup] JSON: ${jsonPath}`)
      console.log(`[gov-cleanup] TXT: ${txtPath}`)
      console.log(
        '[gov-cleanup] execute 예시: CONFIRM_GOVERNMENT_DUMMY_CLEANUP=DELETE_NON_SESUNG_DUMMY_DATA railway run -e develop -s app node scripts/government-cleanup-dummy-data.js --execute',
      )
      return
    }

    if (process.env.CONFIRM_GOVERNMENT_DUMMY_CLEANUP !== CONFIRM_ENV_VALUE) {
      throw new Error(
        `execute blocked: set CONFIRM_GOVERNMENT_DUMMY_CLEANUP=${CONFIRM_ENV_VALUE}`,
      )
    }

    assertDryRunArtifactForExecute(projectRoot, plan)
    console.warn('[gov-cleanup] EXECUTE — transaction 시작')
    const result = await executeGovernmentDummyCleanup(client, plan)
    console.log('[gov-cleanup] execute 완료:', JSON.stringify(result, null, 2))
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[gov-cleanup] FATAL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
