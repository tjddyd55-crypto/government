import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isGovernmentProgramUser,
  isGovernmentTenantMember,
  canAccessGovernmentProfile,
} from './governmentAccess.js'
import { GOVERNMENT_PROGRAM_USER_ROLE } from './governmentSignup.js'

describe('government role access', () => {
  it('program user is tenant member but not user manager', () => {
    const ctx = {
      userId: 'u1',
      governmentProgramUserTenantIds: ['10'],
      governmentAgencyAdminTenantIds: [],
      governmentStaffTenantIds: [],
      governmentIndustryAdminIndustryIds: [],
    }
    assert.equal(isGovernmentProgramUser(ctx), true)
    assert.equal(isGovernmentTenantMember(ctx), true)
  })

  it('program user can only access own profiles', () => {
    const ctx = {
      userId: 'u1',
      governmentProgramUserTenantIds: ['10'],
      governmentAgencyAdminTenantIds: [],
      governmentStaffTenantIds: [],
      governmentIndustryAdminIndustryIds: [],
    }
    assert.equal(
      canAccessGovernmentProfile(ctx, { tenant_id: '10', owner_user_id: 'u1' }),
      true,
    )
    assert.equal(
      canAccessGovernmentProfile(ctx, { tenant_id: '10', owner_user_id: 'other' }),
      false,
    )
    assert.equal(canAccessGovernmentProfile(ctx, { tenant_id: '10', owner_user_id: null }), false)
  })

  it('staff sees all profiles in tenant', () => {
    const ctx = {
      userId: 'staff1',
      governmentProgramUserTenantIds: [],
      governmentAgencyAdminTenantIds: [],
      governmentStaffTenantIds: ['10'],
      governmentIndustryAdminIndustryIds: [],
    }
    assert.equal(
      canAccessGovernmentProfile(ctx, { tenant_id: '10', owner_user_id: 'u1' }),
      true,
    )
  })

  it('program user role constant', () => {
    assert.equal(GOVERNMENT_PROGRAM_USER_ROLE, 'government_user')
  })
})
