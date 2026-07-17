import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeGovernmentAlimtalkRelayOutcome } from './governmentSignatureAlimtalkNormalize.js'

describe('normalizeGovernmentAlimtalkRelayOutcome', () => {
  it('dryRun=true + status=sent → skipped', () => {
    const out = normalizeGovernmentAlimtalkRelayOutcome(
      { ok: true, status: 'sent', dryRun: true, providerCode: 'DRY_RUN' },
      { dryRun: true },
    )
    assert.equal(out.ok, true)
    assert.equal(out.status, 'skipped')
    assert.equal(out.dryRun, true)
    assert.equal(out.recordSentAt, false)
    assert.equal(out.errorCategory, null)
  })

  it('dryRun=true + status=skipped 유지', () => {
    const out = normalizeGovernmentAlimtalkRelayOutcome(
      { ok: true, status: 'skipped', dryRun: true, providerCode: 'DRY_RUN' },
      { dryRun: false },
    )
    assert.equal(out.status, 'skipped')
    assert.equal(out.dryRun, true)
    assert.equal(out.recordSentAt, false)
  })

  it('config.dryRun=true 이면 relay sent 도 skipped', () => {
    const out = normalizeGovernmentAlimtalkRelayOutcome(
      { ok: true, status: 'sent', dryRun: false, providerCode: '0' },
      { dryRun: true },
    )
    assert.equal(out.status, 'skipped')
    assert.equal(out.dryRun, true)
    assert.equal(out.recordSentAt, false)
  })

  it('실제 sent + dryRun=false 유지', () => {
    const out = normalizeGovernmentAlimtalkRelayOutcome(
      { ok: true, status: 'sent', dryRun: false, providerCode: '0' },
      { dryRun: false },
    )
    assert.equal(out.status, 'sent')
    assert.equal(out.dryRun, false)
    assert.equal(out.recordSentAt, true)
  })

  it('실패는 failed', () => {
    const out = normalizeGovernmentAlimtalkRelayOutcome(
      { ok: false, status: 'failed', dryRun: false, errorCategory: 'network_error' },
      { dryRun: false },
    )
    assert.equal(out.ok, false)
    assert.equal(out.status, 'failed')
    assert.equal(out.recordSentAt, false)
    assert.equal(out.errorCategory, 'network_error')
  })
})
