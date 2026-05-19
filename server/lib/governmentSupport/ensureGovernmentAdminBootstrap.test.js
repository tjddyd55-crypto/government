import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { ensureGovernmentAdminBootstrap } from './ensureGovernmentAdminBootstrap.js'

describe('ensureGovernmentAdminBootstrap', () => {
  /** @type {NodeJS.ProcessEnv} */
  let envBackup

  beforeEach(() => {
    envBackup = { ...process.env }
    delete process.env.GOVERNMENT_ADMIN_BOOTSTRAP_ENABLED
    delete process.env.GOVERNMENT_ADMIN_EMAIL
    delete process.env.GOVERNMENT_ADMIN_PASSWORD
  })

  afterEach(() => {
    process.env = envBackup
  })

  it('disabled: pool query 없이 즉시 반환', async () => {
    let queried = false
    const pool = {
      query: async () => {
        queried = true
        return { rows: [], rowCount: 0 }
      },
    }
    await ensureGovernmentAdminBootstrap(pool)
    assert.equal(queried, false)
  })

  it('enabled without email: 경고만 하고 query 없음', async () => {
    process.env.GOVERNMENT_ADMIN_BOOTSTRAP_ENABLED = 'true'
    let queried = false
    const pool = {
      query: async () => {
        queried = true
        return { rows: [], rowCount: 0 }
      },
    }
    await ensureGovernmentAdminBootstrap(pool)
    assert.equal(queried, false)
  })
})
