import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessGovernmentProfile,
  canCreateGovernmentProfileOnBehalf,
  canListGovernmentAdminCustomers,
  canUpdateGovernmentProfileCustomerStatus,
  isGovernmentAgencyCustomerManager,
} from './governmentAccess.js'

const profileRow = { tenant_id: '15', owner_user_id: 'user-a' }

describe('isGovernmentAgencyCustomerManager', () => {
  it('대행사 관리자 tenant 보유 시 true', () => {
    assert.equal(isGovernmentAgencyCustomerManager({ governmentAgencyAdminTenantIds: ['15'] }), true)
  })

  it('직원만 있으면 false', () => {
    assert.equal(isGovernmentAgencyCustomerManager({ governmentStaffTenantIds: ['15'] }), false)
  })

  it('업종 관리자 true', () => {
    assert.equal(isGovernmentAgencyCustomerManager({ governmentIndustryAdminIndustryIds: ['1'] }), true)
  })
})

describe('canListGovernmentAdminCustomers', () => {
  it('프로그램 이용자 false', () => {
    assert.equal(
      canListGovernmentAdminCustomers({ governmentProgramUserTenantIds: ['15'] }),
      false,
    )
  })

  it('대행사 관리자 true', () => {
    assert.equal(canListGovernmentAdminCustomers({ governmentAgencyAdminTenantIds: ['15'] }), true)
  })
})

describe('canAccessGovernmentProfile', () => {
  it('이용자는 본인 프로필만', () => {
    const ctx = { userId: 'user-a', governmentProgramUserTenantIds: ['15'] }
    assert.equal(canAccessGovernmentProfile(ctx, profileRow), true)
    assert.equal(
      canAccessGovernmentProfile({ ...ctx, userId: 'user-b' }, profileRow),
      false,
    )
  })

  it('대행사 관리자는 동일 tenant 전체', () => {
    assert.equal(
      canAccessGovernmentProfile({ governmentAgencyAdminTenantIds: ['15'] }, profileRow),
      true,
    )
    assert.equal(
      canAccessGovernmentProfile({ governmentAgencyAdminTenantIds: ['99'] }, profileRow),
      false,
    )
  })
})

describe('canCreateGovernmentProfileOnBehalf', () => {
  it('대행사 관리자 true, 프로그램 이용자 false', () => {
    assert.equal(
      canCreateGovernmentProfileOnBehalf({ governmentAgencyAdminTenantIds: ['15'] }),
      true,
    )
    assert.equal(
      canCreateGovernmentProfileOnBehalf({
        userId: 'u1',
        governmentProgramUserTenantIds: ['15'],
      }),
      false,
    )
  })
})

describe('canUpdateGovernmentProfileCustomerStatus', () => {
  it('이용자는 본인만 변경', () => {
    const ctx = { userId: 'user-a', governmentProgramUserTenantIds: ['15'] }
    assert.equal(canUpdateGovernmentProfileCustomerStatus(ctx, profileRow), true)
    assert.equal(
      canUpdateGovernmentProfileCustomerStatus({ ...ctx, userId: 'user-b' }, profileRow),
      false,
    )
  })

  it('대행사 관리자는 tenant 범위 변경', () => {
    assert.equal(
      canUpdateGovernmentProfileCustomerStatus(
        { governmentAgencyAdminTenantIds: ['15'] },
        profileRow,
      ),
      true,
    )
  })
})
