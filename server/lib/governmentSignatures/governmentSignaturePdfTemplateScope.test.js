import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseGovSignatureScopeInput,
  validateGovSignaturePdfTemplateScope,
} from './governmentSignaturePdfTemplateScope.js'

function industryReq(body = {}) {
  return {
    body,
    user: { id: 'industry-admin' },
    platformContext: {
      userId: 'industry-admin',
      governmentIndustryAdminIndustryIds: ['gov-industry-1'],
      governmentAgencyAdminTenantIds: [],
      governmentStaffTenantIds: [],
      governmentProgramUserTenantIds: [],
    },
  }
}

function agencyAdminReq(body = {}, tenantIds = ['69']) {
  return {
    body,
    user: { id: 'agency-admin' },
    platformContext: {
      userId: 'agency-admin',
      governmentIndustryAdminIndustryIds: [],
      governmentAgencyAdminTenantIds: tenantIds,
      governmentStaffTenantIds: [],
      governmentProgramUserTenantIds: [],
    },
  }
}

test('parseGovSignatureScopeInput reads scopeType and tenantId from body', () => {
  assert.deepEqual(parseGovSignatureScopeInput({ body: { scopeType: 'global' } }), {
    scopeType: 'global',
    tenantId: null,
  })
  assert.deepEqual(parseGovSignatureScopeInput({ body: { scopeType: 'agency', tenantId: '69' } }), {
    scopeType: 'agency',
    tenantId: '69',
  })
})

test('validateGovSignaturePdfTemplateScope — industry admin global', async () => {
  const pool = {
    query: async () => {
      throw new Error('should not query tenant for global')
    },
  }
  const result = await validateGovSignaturePdfTemplateScope(
    industryReq({ scopeType: 'global' }),
    pool,
  )
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.scopeType, 'global')
    assert.equal(result.tenantId, null)
  }
})

test('validateGovSignaturePdfTemplateScope — empty scopeType rejected', async () => {
  const pool = { query: async () => ({ rowCount: 0, rows: [] }) }
  const result = await validateGovSignaturePdfTemplateScope(industryReq({ scopeType: '' }), pool)
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.message, '공개 범위를 선택해 주세요.')
  }
})

test('validateGovSignaturePdfTemplateScope — industry admin agency requires tenantId', async () => {
  const pool = { query: async () => ({ rowCount: 0, rows: [] }) }
  const missing = await validateGovSignaturePdfTemplateScope(industryReq({ scopeType: 'agency' }), pool)
  assert.equal(missing.ok, false)
  if (!missing.ok) {
    assert.match(missing.message, /대행사를 선택/)
  }
})

test('validateGovSignaturePdfTemplateScope — industry admin agency with tenant passes', async () => {
  const pool = {
    query: async (sql) => {
      if (String(sql).includes('FROM tenants')) {
        return { rowCount: 1, rows: [{ id: '69' }] }
      }
      return { rowCount: 0, rows: [] }
    },
  }
  const result = await validateGovSignaturePdfTemplateScope(
    industryReq({ scopeType: 'agency', tenantId: '69' }),
    pool,
  )
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.scopeType, 'agency')
    assert.equal(result.tenantId, '69')
  }
})

test('validateGovSignaturePdfTemplateScope — agency admin global rejected', async () => {
  const pool = { query: async () => ({ rowCount: 0, rows: [] }) }
  const result = await validateGovSignaturePdfTemplateScope(
    agencyAdminReq({ scopeType: 'global' }),
    pool,
  )
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.message, /전체 범위/)
  }
})

test('validateGovSignaturePdfTemplateScope — agency admin uses own tenant', async () => {
  const pool = { query: async () => ({ rowCount: 0, rows: [] }) }
  const result = await validateGovSignaturePdfTemplateScope(
    agencyAdminReq({ scopeType: 'agency' }),
    pool,
  )
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.scopeType, 'agency')
    assert.equal(result.tenantId, '69')
  }
})

test('validateGovSignaturePdfTemplateScope — agency admin other tenant rejected', async () => {
  const pool = { query: async () => ({ rowCount: 0, rows: [] }) }
  const result = await validateGovSignaturePdfTemplateScope(
    agencyAdminReq({ scopeType: 'agency', tenantId: '99' }),
    pool,
  )
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.message, /권한/)
  }
})
