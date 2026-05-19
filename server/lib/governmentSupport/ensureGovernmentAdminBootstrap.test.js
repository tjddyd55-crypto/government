import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { ensureGovernmentAdminBootstrap } from './ensureGovernmentAdminBootstrap.js'

describe('ensureGovernmentAdminBootstrap', () => {
  /** @type {NodeJS.ProcessEnv} */
  let envBackup

  beforeEach(() => {
    envBackup = { ...process.env }
    delete process.env.GOVERNMENT_ADMIN_BOOTSTRAP_ENABLED
    delete process.env.GOVERNMENT_ADMIN_LOGIN_ID
    delete process.env.GOVERNMENT_ADMIN_EMAIL
    delete process.env.GOVERNMENT_ADMIN_PASSWORD
    delete process.env.GOVERNMENT_ADMIN_NAME
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

  it('enabled without GOVERNMENT_ADMIN_LOGIN_ID: query 없음', async () => {
    process.env.GOVERNMENT_ADMIN_BOOTSTRAP_ENABLED = 'true'
    process.env.GOVERNMENT_ADMIN_PASSWORD = 'test-only'
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

  it('GOVERNMENT_ADMIN_EMAIL 만 있으면 LOGIN_ID 없이 건너뜀 (EMAIL 미사용)', async () => {
    process.env.GOVERNMENT_ADMIN_BOOTSTRAP_ENABLED = 'true'
    process.env.GOVERNMENT_ADMIN_EMAIL = 'admin@example.com'
    process.env.GOVERNMENT_ADMIN_PASSWORD = 'test-only'
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

  it('enabled with LOGIN_ID: users INSERT에 username으로 loginId 사용', async () => {
    process.env.GOVERNMENT_ADMIN_BOOTSTRAP_ENABLED = 'true'
    process.env.GOVERNMENT_ADMIN_LOGIN_ID = 'govadmin'
    process.env.GOVERNMENT_ADMIN_PASSWORD = 'bootstrap-test-pass'
    process.env.GOVERNMENT_ADMIN_NAME = '테스트 관리자'

    const calls = []
    const pool = {
      query: async (sql, params) => {
        calls.push({ sql: String(sql), params })
        if (String(sql).includes('INSERT INTO ga_companies')) {
          return { rows: [{ id: 99 }], rowCount: 1 }
        }
        if (String(sql).includes('FROM industries')) {
          return { rows: [{ id: 7 }], rowCount: 1 }
        }
        if (String(sql).includes('FROM users WHERE username')) {
          return { rows: [], rowCount: 0 }
        }
        if (String(sql).includes('INSERT INTO users')) {
          assert.equal(params[1], 'govadmin')
          assert.equal(params[4], '테스트 관리자')
          assert.ok(String(sql).includes('invited_by_user_id'))
          return { rows: [], rowCount: 1 }
        }
        if (String(sql).includes('user_memberships')) {
          return { rows: [], rowCount: 0 }
        }
        return { rows: [], rowCount: 0 }
      },
    }

    await ensureGovernmentAdminBootstrap(pool)
    const userInsert = calls.find((c) => c.sql.includes('INSERT INTO users'))
    assert.ok(userInsert, 'expected user insert')
    assert.equal(userInsert.params[1], 'govadmin')
    assert.equal(userInsert.params[4], '테스트 관리자')
    assert.match(String(userInsert.params[2]), /^\$2[aby]\$/)
  })
})
