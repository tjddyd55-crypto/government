#!/usr/bin/env node
/**
 * 정부지원 CRM develop DB — 대행사 직원 잔여 더미 정리.
 *
 * dry-run:
 *   node scripts/government-cleanup-leftover-agency-staff.js --dry-run
 *
 * execute:
 *   CONFIRM_GOVERNMENT_AGENCY_STAFF_CLEANUP=DELETE_NON_SESUNG_AGENCY_STAFF \
 *   node scripts/government-cleanup-leftover-agency-staff.js --execute
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AGENCY_STAFF_CONFIRM_VALUE,
  assertAgencyStaffDryRunArtifactForExecute,
  assertDevelopGovernmentDbTarget,
  buildAgencyStaffCleanupPlan,
  executeAgencyStaffCleanup,
  maskDatabaseUrl,
  parseAgencyStaffCleanupArgv,
  writeAgencyStaffDryRunReports,
} from '../server/lib/governmentSupport/governmentAgencyStaffCleanup.js'

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
  console.error('[gov-agency-staff] 로컬에서는 postgres.railway.internal 에 연결할 수 없습니다.')
  process.exit(1)
}

function logEnvironment() {
  console.log('[gov-agency-staff] == DB 환경 ==')
  console.log(`[gov-agency-staff] DATABASE_URL: ${maskDatabaseUrl(process.env.DATABASE_URL)}`)
  console.log(`[gov-agency-staff] APP_PRODUCT: ${process.env.APP_PRODUCT ?? '(unset)'}`)
  console.log(
    `[gov-agency-staff] RAILWAY_ENVIRONMENT_NAME: ${process.env.RAILWAY_ENVIRONMENT_NAME ?? '(unset)'}`,
  )
}

async function main() {
  const { dryRun, execute } = parseAgencyStaffCleanupArgv(process.argv.slice(2))
  loadEnvFileIfPresent('.env')
  loadEnvFileIfPresent('.env.local')
  ensureDatabaseUrl()
  exitIfRailwayInternalFromLocalMachine(process.env.DATABASE_URL)

  assertDevelopGovernmentDbTarget()
  logEnvironment()

  const { default: pool } = await import('../server/db.js')
  const client = await pool.connect()

  try {
    const plan = await buildAgencyStaffCleanupPlan(client)
    plan.mode = dryRun ? 'dry-run' : 'execute'

    console.log(
      '[gov-agency-staff] 세승 tenant:',
      `${plan.sesung.id} | ${plan.sesung.code} | ${plan.sesung.name}`,
    )
    console.log('[gov-agency-staff] 전체 대행사 직원:', plan.totalAgencyStaffCount)
    console.log(
      '[gov-agency-staff] 세승 실운영 직원 보존:',
      plan.preserveSummary.sesungStaffPreservedCount,
    )
    console.log('[gov-agency-staff] 관리자/system 보존:', plan.preserveSummary.adminSystemPreserveCount)
    console.log('[gov-agency-staff] 삭제 후보:', plan.deleteCandidateCount)
    console.log('[gov-agency-staff] orphan staff:', plan.orphanStaffPresent)
    console.log('[gov-agency-staff] planHash:', plan.planHash)
    console.log('[gov-agency-staff] canExecute:', plan.canExecute)
    if (plan.abortReasons.length) {
      console.log('[gov-agency-staff] abortReasons:', plan.abortReasons.join('; '))
    }

    if (dryRun) {
      const { jsonPath, txtPath } = writeAgencyStaffDryRunReports(plan, projectRoot)
      console.log('[gov-agency-staff] dry-run 완료 — 삭제 없음')
      console.log(`[gov-agency-staff] JSON: ${jsonPath}`)
      console.log(`[gov-agency-staff] TXT: ${txtPath}`)
      return
    }

    if (process.env.CONFIRM_GOVERNMENT_AGENCY_STAFF_CLEANUP !== AGENCY_STAFF_CONFIRM_VALUE) {
      throw new Error(
        `execute blocked: set CONFIRM_GOVERNMENT_AGENCY_STAFF_CLEANUP=${AGENCY_STAFF_CONFIRM_VALUE}`,
      )
    }

    assertAgencyStaffDryRunArtifactForExecute(projectRoot, plan)
    console.warn('[gov-agency-staff] EXECUTE — transaction 시작')
    const result = await executeAgencyStaffCleanup(client, plan)
    console.log('[gov-agency-staff] execute 완료:', JSON.stringify(result, null, 2))
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[gov-agency-staff] FATAL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
