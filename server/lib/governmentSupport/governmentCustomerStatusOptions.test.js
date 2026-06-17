import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canManageCustomerStatusOptions,
  canReadCustomerStatusOptions,
  mapCustomerStatusOptionRow,
} from './governmentCustomerStatusOptions.js'

describe('governmentCustomerStatusOptions access', () => {
  it('이용자·관리자는 옵션 조회 가능', () => {
    assert.equal(canReadCustomerStatusOptions({ governmentProgramUserTenantIds: ['1'] }), true)
    assert.equal(canReadCustomerStatusOptions({ governmentAgencyAdminTenantIds: ['1'] }), true)
    assert.equal(canReadCustomerStatusOptions({ governmentStaffTenantIds: ['1'] }), false)
  })

  it('대행사 관리자는 자기 tenant 만 옵션 관리', () => {
    const agencyAdmin = { governmentAgencyAdminTenantIds: ['15'] }
    assert.equal(canManageCustomerStatusOptions(agencyAdmin, '15'), true)
    assert.equal(canManageCustomerStatusOptions(agencyAdmin, '99'), false)
  })

  it('mapCustomerStatusOptionRow', () => {
    const row = mapCustomerStatusOptionRow({
      id: 1,
      tenant_id: 15,
      label: '상담중',
      color: '#60A5FA',
      sort_order: 20,
      is_active: true,
      usage_count: 3,
    })
    assert.equal(row.id, '1')
    assert.equal(row.tenantId, '15')
    assert.equal(row.label, '상담중')
    assert.equal(row.usageCount, 3)
    assert.equal(row.isActive, true)
  })
})
