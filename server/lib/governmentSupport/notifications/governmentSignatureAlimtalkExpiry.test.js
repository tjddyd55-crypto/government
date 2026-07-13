import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeDefaultGovernmentSignatureExpiryAt,
  formatGovernmentSignatureDateForDisplay,
  resolveGovernmentSignatureExpiryAt,
} from './governmentSignatureAlimtalkExpiry.js'

describe('governmentSignatureAlimtalkExpiry', () => {
  const now = new Date('2026-06-25T04:00:00.000Z')

  it('요청일 KST YYYY-MM-DD 포맷', () => {
    assert.equal(formatGovernmentSignatureDateForDisplay(now), '2026-06-25')
  })

  it('expiresAt 없으면 7일 후', () => {
    const r = resolveGovernmentSignatureExpiryAt(null, now)
    assert.equal(r.ok, true)
    assert.equal(r.expiryDateDisplay, '2026-07-02')
  })

  it('과거 expiresAt 거부', () => {
    const r = resolveGovernmentSignatureExpiryAt('2026-06-24T00:00:00.000Z', now)
    assert.equal(r.ok, false)
    assert.equal(r.errorCategory, 'missing_expiry')
  })

  it('30일 초과 expiresAt 거부', () => {
    const r = resolveGovernmentSignatureExpiryAt('2026-08-01T00:00:00.000Z', now)
    assert.equal(r.ok, false)
  })

  it('default 7일 계산', () => {
    const expiry = computeDefaultGovernmentSignatureExpiryAt(now, 7)
    assert.ok(expiry instanceof Date)
    assert.equal(formatGovernmentSignatureDateForDisplay(expiry), '2026-07-02')
  })
})
