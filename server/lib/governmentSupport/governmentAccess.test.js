import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import {
  resolveTenantIdForProfileCreate,
} from './governmentAccess.js'

describe('resolveTenantIdForProfileCreate', () => {
  it('industry admin + tenant 없음: 플랫폼 tenant 생성 후 반환', async () => {
    const calls = []
    const pool = {
      query: async (sql, params) => {
        calls.push({ sql: String(sql), params })
        if (String(sql).includes('FROM industries')) {
          return { rows: [{ id: '3' }], rowCount: 1 }
        }
        if (String(sql).includes('FROM ga_companies')) {
          return { rows: [{ id: 7 }], rowCount: 1 }
        }
        if (String(sql).includes('FROM tenants') && String(sql).includes('GOVERNMENT_PLATFORM')) {
          return { rows: [], rowCount: 0 }
        }
        if (String(sql).includes('INSERT INTO tenants')) {
          return { rows: [{ id: '99' }], rowCount: 1 }
        }
        if (String(sql).includes('FROM tenants t') && String(sql).includes('industries')) {
          return { rows: [], rowCount: 0 }
        }
        return { rows: [], rowCount: 0 }
      },
    }
    const ctx = {
      userId: 'u1',
      governmentIndustryAdminIndustryIds: ['3'],
      governmentAgencyAdminTenantIds: [],
      governmentStaffTenantIds: [],
    }
    const r = await resolveTenantIdForProfileCreate(pool, ctx, null)
    assert.equal(r.ok, true)
    assert.equal(r.tenantId, '99')
    const insert = calls.find((c) => c.sql.includes('INSERT INTO tenants'))
    assert.ok(insert)
  })

  it('staff 멤버: scope 첫 tenant 사용', async () => {
    const pool = {
      query: async (sql) => {
        if (String(sql).includes('FROM tenants t') && String(sql).includes('industries')) {
          return { rows: [], rowCount: 0 }
        }
        return { rows: [], rowCount: 0 }
      },
    }
    const ctx = {
      userId: 'u2',
      governmentIndustryAdminIndustryIds: [],
      governmentAgencyAdminTenantIds: [],
      governmentStaffTenantIds: ['12'],
    }
    const r = await resolveTenantIdForProfileCreate(pool, ctx, null)
    assert.equal(r.ok, true)
    assert.equal(r.tenantId, '12')
  })
})
