import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildGovPdfTemplateListWhere,
  buildGovSignatureTemplateListWhere,
  canAccessGovPdfTemplateRow,
  canAccessGovSignatureTemplateRow,
  canManageGovPdfTemplateRow,
} from './access.js'

test('buildGovSignatureTemplateListWhere — program user는 owner 또는 소속 tenant', () => {
  const w = buildGovSignatureTemplateListWhere({ mode: 'program', userId: 'u1', tenantIds: ['42'] })
  assert.match(w.sql, /owner_user_id/)
  assert.match(w.sql, /tenant_id/)
  assert.deepEqual(w.params, ['u1', ['42']])
})

test('buildGovSignatureTemplateListWhere — program user tenant 없으면 owner만', () => {
  const w = buildGovSignatureTemplateListWhere({ mode: 'program', userId: 'u1', tenantIds: [] })
  assert.match(w.sql, /owner_user_id/)
  assert.deepEqual(w.params, ['u1'])
})

test('buildGovSignatureTemplateListWhere — operational은 tenant_id', () => {
  const w = buildGovSignatureTemplateListWhere({ mode: 'operational', userId: 'u1', tenantIds: ['10', '20'] })
  assert.match(w.sql, /tenant_id/)
  assert.deepEqual(w.params, [['10', '20']])
})

test('canAccessGovSignatureTemplateRow — program user는 소속 tenant 템플릿 조회', () => {
  const req = {
    user: { id: 'prog1' },
    platformContext: {
      userId: 'prog1',
      governmentStaffTenantIds: [],
      governmentAgencyAdminTenantIds: [],
      governmentProgramUserTenantIds: ['42'],
    },
  }
  const row = { owner_user_id: 'admin1', tenant_id: 42 }
  assert.equal(canAccessGovSignatureTemplateRow(req, row), true)
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

test('canAccessGovPdfTemplateRow — program user는 소속 tenant PDF read', () => {
  const req = {
    user: { id: 'prog1' },
    platformContext: {
      userId: 'prog1',
      governmentStaffTenantIds: [],
      governmentAgencyAdminTenantIds: [],
      governmentProgramUserTenantIds: ['42'],
    },
  }
  const row = { gov_owner_user_id: 'admin1', gov_tenant_id: 42 }
  assert.equal(canAccessGovPdfTemplateRow(req, row), true)
})

test('canManageGovPdfTemplateRow — program user는 tenant PDF 편집 불가', () => {
  const req = {
    user: { id: 'prog1' },
    platformContext: {
      userId: 'prog1',
      governmentStaffTenantIds: [],
      governmentAgencyAdminTenantIds: [],
      governmentProgramUserTenantIds: ['42'],
    },
  }
  const row = { gov_owner_user_id: 'admin1', gov_tenant_id: 42 }
  assert.equal(canManageGovPdfTemplateRow(req, row), false)
})

test('canManageGovPdfTemplateRow — program user는 본인 owner PDF 편집 가능', () => {
  const req = {
    user: { id: 'prog1' },
    platformContext: {
      userId: 'prog1',
      governmentStaffTenantIds: [],
      governmentAgencyAdminTenantIds: [],
      governmentProgramUserTenantIds: ['42'],
    },
  }
  const row = { gov_owner_user_id: 'prog1', gov_tenant_id: 42 }
  assert.equal(canManageGovPdfTemplateRow(req, row), true)
})

test('buildGovPdfTemplateListWhere — program user는 owner 또는 소속 tenant', () => {
  const w = buildGovPdfTemplateListWhere({ mode: 'program', userId: 'u1', tenantIds: ['42'] })
  assert.match(w.sql, /gov_owner_user_id/)
  assert.match(w.sql, /gov_tenant_id/)
  assert.deepEqual(w.params, ['u1', ['42']])
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

test('canAccessGovPdfTemplateRow — program user 다른 tenant PDF read 차단', () => {
  const req = {
    user: { id: 'prog2' },
    platformContext: {
      userId: 'prog2',
      governmentStaffTenantIds: [],
      governmentAgencyAdminTenantIds: [],
      governmentProgramUserTenantIds: ['99'],
    },
  }
  const row = { gov_owner_user_id: 'admin1', gov_tenant_id: 42 }
  assert.equal(canAccessGovPdfTemplateRow(req, row), false)
})
