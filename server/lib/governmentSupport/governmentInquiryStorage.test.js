import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertGovernmentInquiryObjectKey,
  buildGovernmentInquiryObjectKey,
} from './governmentInquiryStorage.js'

test('buildGovernmentInquiryObjectKey uses government/inquiries path', () => {
  const key = buildGovernmentInquiryObjectKey({
    ownerUserId: 'user-a',
    inquiryId: 12,
    messageId: null,
    fileId: 99,
    fileName: 'scan.pdf',
  })
  assert.match(key, /government\/inquiries\/user-a\/12\/root\/99\//)
})

test('assertGovernmentInquiryObjectKey accepts matching key', () => {
  const key = buildGovernmentInquiryObjectKey({
    ownerUserId: 'user-a',
    inquiryId: 5,
    messageId: 7,
    fileId: 3,
    fileName: 'a.png',
  })
  assert.equal(
    assertGovernmentInquiryObjectKey(key, {
      ownerUserId: 'user-a',
      inquiryId: 5,
      messageId: 7,
      fileId: 3,
    }),
    true,
  )
})
