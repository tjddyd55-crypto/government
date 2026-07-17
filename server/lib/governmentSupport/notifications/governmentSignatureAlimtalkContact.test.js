import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveGovernmentSignatureManagerContactPhone,
  resolveGovernmentSignatureManagerName,
} from './governmentSignatureAlimtalkContact.js'

describe('governmentSignatureAlimtalkContact', () => {
  it('담당자명 display_name 우선', () => {
    assert.equal(
      resolveGovernmentSignatureManagerName({ displayName: '박성용', username: 'tjddyd55' }),
      '박성용',
    )
  })

  it('담당자연락처는 senderPhoneNumber만 사용', () => {
    assert.equal(
      resolveGovernmentSignatureManagerContactPhone({ senderPhoneNumber: '010-1234-5678' }),
      '01012345678',
    )
    assert.equal(
      resolveGovernmentSignatureManagerContactPhone({ senderPhoneNumber: '0211112222' }),
      null,
    )
    assert.equal(resolveGovernmentSignatureManagerContactPhone({ senderPhoneNumber: '' }), null)
    assert.equal(resolveGovernmentSignatureManagerContactPhone({}), null)
  })
})
