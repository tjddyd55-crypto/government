import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildGovSignatureTemplateListWhere,
  canAccessGovPdfTemplateRow,
  canAccessGovSignatureTemplateRow,
} from './access.js'

test('buildGovSignatureTemplateListWhere — program user는 owner_user_id', () => {
  const w = buildGovSignatureTemplateListWhere({ mode: 'program', userId: 'u1' })
  assert.match(w.sql, /owner_user_id/)
  assert.deepEqual(w.params, ['u1'])
})

test('buildGovSignatureTemplateListWhere — operational은 tenant_id', () => {
  const w = buildGovSignatureTemplateListWhere({ mode: 'operational', userId: 'u1', tenantIds: ['10', '20'] })
  assert.match(w.sql, /tenant_id/)
  assert.deepEqual(w.params, [['10', '20']])
})

test('canAccessGovSignatureTemplateRow — operational tenant 공유', () => {
  const req = {
    user: { id: 'staff1' },
    platformContext: {
      userId: 'staff1',
      governmentStaffTenantIds: ['42'],
      governmentAgencyAdminTenantIds: [],
      governmentProgramUserTenantIds: [],
    },
  }
  const row = { owner_user_id: 'admin1', tenant_id: 42 }
  assert.equal(canAccessGovSignatureTemplateRow(req, row), true)
})

test('canAccessGovPdfTemplateRow — 다른 tenant 차단', () => {
  const req = {
    user: { id: 'staff2' },
    platformContext: {
      userId: 'staff2',
      governmentStaffTenantIds: ['99'],
      governmentAgencyAdminTenantIds: [],
      governmentProgramUserTenantIds: [],
    },
  }
  const row = { gov_owner_user_id: 'admin1', gov_tenant_id: 42 }
  assert.equal(canAccessGovPdfTemplateRow(req, row), false)
})
