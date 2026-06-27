import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertGovernmentProfileFileObjectKey,
  assertGovernmentR2ObjectKeyPrefix,
  assertGovernmentResourceObjectKey,
  assertGovernmentSignaturePdfTemplateObjectKey,
  assertGovernmentSignatureSendAttachmentObjectKey,
  assertGovernmentSignatureSessionDocumentObjectKey,
  buildGovernmentProfileFileKey,
  buildGovernmentResourceFileKey,
  buildGovernmentSignaturePdfTemplateUploadKey,
  buildGovernmentSignatureSendAttachmentKey,
  buildGovernmentSignatureSessionDocumentKey,
  buildLegacyGovernmentProfileFileObjectKey,
  assertGovernmentR2KeyHasNoBucketName,
  GOVERNMENT_R2_BUCKET,
  GOVERNMENT_R2_KEY_ROOT,
  GOVERNMENT_STORAGE_PREFIX,
  requireGovernmentR2ObjectKeyPrefix,
} from './governmentR2Keys.js'

describe('governmentR2Keys', () => {
  it('bucket and prefix constants', () => {
    assert.equal(GOVERNMENT_R2_BUCKET, 'platform-assets')
    assert.equal(GOVERNMENT_R2_KEY_ROOT, 'government')
    assert.equal(GOVERNMENT_STORAGE_PREFIX, 'government/')
  })

  it('new profile file key uses agencies/users/profiles/files', () => {
    const key = buildGovernmentProfileFileKey({
      tenantId: '36',
      userId: 'user-1',
      profileId: '9',
      fileId: '3',
      fileName: 'test.pdf',
    })
    assert.match(key, /government\/agencies\/36\/users\/user-1\/profiles\/9\/files\/3\//)
    assert.match(key, /test\.pdf$/)
    assert.equal(assertGovernmentR2KeyHasNoBucketName(key), true)
    assert.equal(assertGovernmentR2ObjectKeyPrefix(key), true)
  })

  it('assert accepts legacy profile file key', () => {
    const legacy = buildLegacyGovernmentProfileFileObjectKey({
      ownerUserId: 'u1',
      profileId: '2',
      fileId: '5',
      fileName: 'a.pdf',
    })
    assert.equal(
      assertGovernmentProfileFileObjectKey(legacy, { ownerUserId: 'u1', profileId: '2', fileId: '5' }),
      true,
    )
    assert.equal(assertGovernmentR2ObjectKeyPrefix(legacy), true)
  })

  it('assert accepts new profile file key with tenantId', () => {
    const key = buildGovernmentProfileFileKey({
      tenantId: '10',
      userId: 'u1',
      profileId: '2',
      fileId: '5',
      fileName: 'a.pdf',
    })
    assert.equal(
      assertGovernmentProfileFileObjectKey(key, {
        tenantId: '10',
        ownerUserId: 'u1',
        profileId: '2',
        fileId: '5',
      }),
      true,
    )
  })

  it('rejects insurance/ and root-only keys on confirm', () => {
    assert.equal(assertGovernmentR2ObjectKeyPrefix('insurance/ga-1/file.pdf'), false)
    assert.equal(assertGovernmentR2ObjectKeyPrefix('uploads/file.pdf'), false)
    assert.equal(assertGovernmentR2ObjectKeyPrefix('file.pdf'), false)
    assert.throws(() => requireGovernmentR2ObjectKeyPrefix('insurance/x'), /government/)
  })

  it('pdf template upload without tenant uses government/tmp/pdf-templates', () => {
    const key = buildGovernmentSignaturePdfTemplateUploadKey({
      ownerUserId: 'user-abc',
      code: 'tpl-1',
    })
    assert.match(key, /^government\/tmp\/pdf-templates\/user-abc\//)
    assert.equal(assertGovernmentR2ObjectKeyPrefix(key), true)
    assert.equal(
      assertGovernmentSignaturePdfTemplateObjectKey(key, { ownerUserId: 'user-abc' }),
      true,
    )
  })

  it('pdf template upload with tenant uses shared pdf-templates', () => {
    const key = buildGovernmentSignaturePdfTemplateUploadKey({
      ownerUserId: 'user-abc',
      code: 'tpl-1',
      tenantId: '36',
      pdfTemplateId: '99',
    })
    assert.match(key, /government\/agencies\/36\/shared\/pdf-templates\/99\//)
    assert.equal(
      assertGovernmentSignaturePdfTemplateObjectKey(key, { tenantId: '36', ownerUserId: 'user-abc' }),
      true,
    )
  })

  it('legacy pdf-templates key is read-only compatible', () => {
    const legacy = 'pdf-templates/gov-user-abc/tpl-1.pdf'
    assert.equal(assertGovernmentR2ObjectKeyPrefix(legacy), false)
    assert.equal(assertGovernmentR2ObjectKeyPrefix(legacy, { allowLegacyPdfTemplate: true }), true)
    assert.equal(
      assertGovernmentSignaturePdfTemplateObjectKey(legacy, { ownerUserId: 'abc' }),
      true,
    )
  })

  it('signature session document key is under government/signatures/sessions', () => {
    const key = buildGovernmentSignatureSessionDocumentKey({
      sendSessionId: 'sess-1',
      documentId: 'doc-9',
      fileName: 'completed.pdf',
    })
    assert.match(key, /^government\/signatures\/sessions\/sess-1\/documents\/doc-9\//)
    assert.equal(
      assertGovernmentSignatureSessionDocumentObjectKey(key, {
        sendSessionId: 'sess-1',
        documentId: 'doc-9',
      }),
      true,
    )
  })

  it('signature send attachment key is under government/signatures/send-attachments', () => {
    const key = buildGovernmentSignatureSendAttachmentKey({
      userId: 'user-1',
      fileName: 'attach.pdf',
    })
    assert.match(key, /^government\/signatures\/send-attachments\/user-1\//)
    assert.equal(assertGovernmentSignatureSendAttachmentObjectKey(key, { userId: 'user-1' }), true)
  })

  it('resource file key is under government/agencies or global shared resources', () => {
    const agencyKey = buildGovernmentResourceFileKey({
      tenantId: '36',
      resourceId: '7',
      fileName: 'guide.pdf',
      fileId: 'f1',
    })
    assert.match(agencyKey, /government\/agencies\/36\/shared\/resources\/7\/f1\//)
    assert.equal(
      assertGovernmentResourceObjectKey(agencyKey, { tenantId: '36', resourceId: '7' }),
      true,
    )
  })
})
