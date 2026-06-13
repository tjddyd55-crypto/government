import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/** Frontend lib mirror — scope payload rules for admin notices/resources forms */
function resolveOperationalScopePayload(form, options) {
  if (options.canPickScope) {
    if (form.scopeType === 'global') {
      return { scopeType: 'global' }
    }
    const tenantId = String(form.tenantId ?? '').trim()
    if (!tenantId) {
      throw new Error('대행사를 선택해 주세요.')
    }
    return { scopeType: 'agency', tenantId }
  }
  const tenantId = String(form.tenantId ?? '').trim() || options.defaultTenantId
  if (!tenantId) {
    throw new Error('대행사 정보가 없습니다.')
  }
  return { scopeType: 'agency', tenantId }
}

describe('governmentOperationalScope payload (admin form)', () => {
  it('industry admin global scope omits tenantId', () => {
    assert.deepEqual(
      resolveOperationalScopePayload({ scopeType: 'global', tenantId: '' }, { canPickScope: true, defaultTenantId: '' }),
      { scopeType: 'global' },
    )
  })

  it('industry admin agency scope requires tenantId', () => {
    assert.throws(
      () =>
        resolveOperationalScopePayload({ scopeType: 'agency', tenantId: '' }, { canPickScope: true, defaultTenantId: '' }),
      /대행사를 선택/,
    )
    assert.deepEqual(
      resolveOperationalScopePayload({ scopeType: 'agency', tenantId: '10' }, { canPickScope: true, defaultTenantId: '' }),
      { scopeType: 'agency', tenantId: '10' },
    )
  })

  it('agency admin always uses agency scope with default tenant', () => {
    assert.deepEqual(
      resolveOperationalScopePayload({ scopeType: 'agency', tenantId: '' }, { canPickScope: false, defaultTenantId: '10' }),
      { scopeType: 'agency', tenantId: '10' },
    )
  })
})
