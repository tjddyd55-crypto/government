import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canManageGovernmentOperations,
  canReadOperationalRecord,
  canDeleteOperationalRecord,
  canWriteOperationalScope,
  canCreateGlobalScope,
} from './governmentOperationsAccess.js'

describe('governmentOperationsAccess', () => {
  const programUser = {
    userId: 'u1',
    governmentProgramUserTenantIds: ['10'],
    governmentAgencyAdminTenantIds: [],
    governmentStaffTenantIds: [],
    governmentIndustryAdminIndustryIds: [],
  }
  const staff = {
    userId: 's1',
    governmentProgramUserTenantIds: [],
    governmentAgencyAdminTenantIds: [],
    governmentStaffTenantIds: ['10'],
    governmentIndustryAdminIndustryIds: [],
  }
  const agencyAdmin = {
    userId: 'a1',
    governmentProgramUserTenantIds: [],
    governmentAgencyAdminTenantIds: ['10'],
    governmentStaffTenantIds: [],
    governmentIndustryAdminIndustryIds: [],
  }
  const industryAdmin = {
    userId: 'i1',
    governmentProgramUserTenantIds: [],
    governmentAgencyAdminTenantIds: [],
    governmentStaffTenantIds: [],
    governmentIndustryAdminIndustryIds: ['3'],
  }

  it('program user cannot manage operations', () => {
    assert.equal(canManageGovernmentOperations(programUser), false)
  })

  it('staff, agency admin, and industry admin can manage operations', () => {
    assert.equal(canManageGovernmentOperations(staff), true)
    assert.equal(canManageGovernmentOperations(agencyAdmin), true)
    assert.equal(canManageGovernmentOperations(industryAdmin), true)
  })

  it('program user reads published agency notice in own tenant', () => {
    assert.equal(
      canReadOperationalRecord(programUser, {
        tenant_id: '10',
        scope_type: 'agency',
        status: 'published',
      }),
      true,
    )
    assert.equal(
      canReadOperationalRecord(programUser, {
        tenant_id: '99',
        scope_type: 'agency',
        status: 'published',
      }),
      false,
    )
  })

  it('program user cannot read global or draft notice', () => {
    assert.equal(
      canReadOperationalRecord(programUser, {
        tenant_id: null,
        scope_type: 'global',
        status: 'published',
      }),
      true,
    )
    assert.equal(
      canReadOperationalRecord(programUser, {
        tenant_id: '10',
        scope_type: 'agency',
        status: 'draft',
      }),
      false,
    )
  })

  it('staff cannot delete others notice; agency admin can', () => {
    const row = { tenant_id: '10', scope_type: 'agency', created_by_user_id: 'other' }
    assert.equal(canDeleteOperationalRecord(staff, row), false)
    assert.equal(canDeleteOperationalRecord(agencyAdmin, row), true)
  })

  it('staff can delete own notice', () => {
    assert.equal(
      canDeleteOperationalRecord(staff, {
        tenant_id: '10',
        scope_type: 'agency',
        created_by_user_id: 's1',
      }),
      true,
    )
  })

  it('global scope write is limited to industry admin', () => {
    assert.equal(canCreateGlobalScope(industryAdmin), true)
    assert.equal(canCreateGlobalScope(agencyAdmin), false)
    assert.equal(canWriteOperationalScope(industryAdmin, null, 'global'), true)
    assert.equal(canWriteOperationalScope(agencyAdmin, null, 'global'), false)
    assert.equal(canWriteOperationalScope(staff, '10', 'agency'), true)
    assert.equal(canWriteOperationalScope(staff, '99', 'agency'), false)
  })
})
