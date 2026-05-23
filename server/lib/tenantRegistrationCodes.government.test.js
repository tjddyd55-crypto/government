import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { GOVERNMENT_INDUSTRY_CODE } from './governmentSupport/constants.js'

describe('tenantRegistrationCodes government GA backfill', () => {
  it('GOVERNMENT_INDUSTRY_CODE is government', () => {
    assert.equal(GOVERNMENT_INDUSTRY_CODE, 'government')
  })
})
