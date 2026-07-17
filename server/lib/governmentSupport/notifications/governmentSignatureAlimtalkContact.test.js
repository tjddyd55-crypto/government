import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveGovernmentSignatureManagerContactPhone,
  resolveGovernmentSignatureManagerName,
} from './governmentSignatureAlimtalkContact.js'

describe('governmentSignatureAlimtalkContact', () => {
  it('담당자명 fallback: display_name → username → 담당자', () => {
    assert.equal(
      resolveGovernmentSignatureManagerName({ displayName: '김실명', username: 'kim' }),
      '김실명',
    )
    assert.equal(resolveGovernmentSignatureManagerName({ username: 'kim' }), 'kim')
    assert.equal(resolveGovernmentSignatureManagerName({}), '담당자')
  })

  it('담당자 연락처: tenant.config 우선', () => {
    const phone = resolveGovernmentSignatureManagerContactPhone({
      tenantConfig: { contactPhone: '02-1234-5678' },
      gaContactPhone: '0311112222',
    })
    assert.equal(phone, '0212345678')
  })

  it('담당자 연락처 없으면 null', () => {
    assert.equal(resolveGovernmentSignatureManagerContactPhone({ tenantConfig: {}, gaContactPhone: null }), null)
  })
})
