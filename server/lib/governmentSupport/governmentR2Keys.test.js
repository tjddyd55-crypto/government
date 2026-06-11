import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertGovernmentProfileFileObjectKey,
  buildGovernmentProfileFileKey,
  buildLegacyGovernmentProfileFileObjectKey,
  assertGovernmentR2KeyHasNoBucketName,
  GOVERNMENT_R2_KEY_ROOT,
} from './governmentR2Keys.js'

describe('governmentR2Keys', () => {
  it('object key root is government/', () => {
    assert.equal(GOVERNMENT_R2_KEY_ROOT, 'government')
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
})
