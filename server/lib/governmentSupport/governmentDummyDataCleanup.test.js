import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertDevelopGovernmentDbTarget,
  buildTableDeleteCounts,
  CONFIRM_ENV_VALUE,
  countPreservedSesungProfiles,
  isDummyLikeName,
  maskDatabaseUrl,
  parseCleanupArgv,
} from './governmentDummyDataCleanup.js'

describe('governmentDummyDataCleanup', () => {
  /** @type {NodeJS.ProcessEnv} */
  let envBackup

  beforeEach(() => {
    envBackup = { ...process.env }
  })

  afterEach(() => {
    process.env = envBackup
  })

  it('parseCleanupArgv: default is dry-run', () => {
    assert.deepEqual(parseCleanupArgv([]), { dryRun: true, execute: false })
    assert.deepEqual(parseCleanupArgv(['--dry-run']), { dryRun: true, execute: false })
    assert.deepEqual(parseCleanupArgv(['--execute']), { dryRun: false, execute: true })
  })

  it('maskDatabaseUrl hides password', () => {
    const masked = maskDatabaseUrl('postgres://user:secret@host:5432/db')
    assert.match(masked, /user:\*\*\*@host/)
    assert.doesNotMatch(masked, /secret/)
  })

  it('isDummyLikeName detects test labels', () => {
    assert.equal(isDummyLikeName('e2e_agency_admin'), true)
    assert.equal(isDummyLikeName('홍길동 사업장'), true)
    assert.equal(isDummyLikeName('세승 본점'), false)
  })

  it('assertDevelopGovernmentDbTarget blocks production DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgres://u:p@insurance-production-7bd8.up.railway.app:5432/railway'
    assert.throws(() => assertDevelopGovernmentDbTarget(), /production/)
  })

  it('assertDevelopGovernmentDbTarget allows develop railway host', () => {
    process.env.DATABASE_URL = 'postgres://u:p@containers-us-west-123.railway.app:5432/railway'
    process.env.RAILWAY_ENVIRONMENT_NAME = 'develop'
    process.env.APP_PRODUCT = 'government'
    assert.doesNotThrow(() => assertDevelopGovernmentDbTarget())
  })

  it('CONFIRM_ENV_VALUE is stable contract', () => {
    assert.equal(CONFIRM_ENV_VALUE, 'DELETE_NON_SESUNG_DUMMY_DATA')
  })

  it('buildTableDeleteCounts returns preserve profile count when no delete candidates', async () => {
    const client = {
      query: async (sql) => {
        if (sql.includes('gov_support_profiles WHERE tenant_id = $1')) {
          return { rows: [{ c: 27 }] }
        }
        return { rows: [{ c: 0 }] }
      },
    }
    const counts = await buildTableDeleteCounts(client, {
      preserveTenantId: '69',
      deleteTenantIds: [],
      deleteUserIds: [],
    })
    assert.equal(counts.gov_support_profiles_preserve, 27)
    assert.equal(Object.keys(counts).length, 1)
  })

  it('countPreservedSesungProfiles queries tenant-scoped profile count', async () => {
    let capturedParams
    const client = {
      query: async (_sql, params) => {
        capturedParams = params
        return { rows: [{ c: 27 }] }
      },
    }
    const count = await countPreservedSesungProfiles(client, '69')
    assert.equal(count, 27)
    assert.deepEqual(capturedParams, [69])
  })
})
