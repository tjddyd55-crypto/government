import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertGovernmentInquiryObjectKey,
  buildGovernmentInquiryObjectKey,
} from './governmentInquiryStorage.js'

test('buildGovernmentInquiryObjectKey uses agencies/users/inquiries path', () => {
  const key = buildGovernmentInquiryObjectKey({
    tenantId: '36',
    userId: 'user-a',
    inquiryId: 12,
    fileId: 99,
    fileName: 'scan.pdf',
  })
  assert.match(key, /government\/agencies\/36\/users\/user-a\/inquiries\/12\/99\//)
})

test('assertGovernmentInquiryObjectKey accepts matching key', () => {
  const key = buildGovernmentInquiryObjectKey({
    tenantId: '10',
    userId: 'user-a',
    inquiryId: 5,
    fileId: 3,
    fileName: 'a.png',
  })
  assert.equal(
    assertGovernmentInquiryObjectKey(key, {
      tenantId: '10',
      ownerUserId: 'user-a',
      inquiryId: 5,
      fileId: 3,
    }),
    true,
  )
})
