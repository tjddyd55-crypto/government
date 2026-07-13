import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertSessionAllowsNotificationResend,
  computeCanResendNotification,
  mapAlimtalkServiceResultToApiNotification,
  parseSignatureSendExpiresAt,
  parseSignatureSendNotificationBody,
} from './governmentSignatureSendNotification.js'

describe('parseSignatureSendNotificationBody', () => {
  it('notification 없음', () => {
    assert.deepEqual(parseSignatureSendNotificationBody({ profileId: 1 }), { kind: 'none' })
  })

  it('kakao_alimtalk 허용', () => {
    const r = parseSignatureSendNotificationBody({ notification: { channel: 'kakao_alimtalk' } })
    assert.equal(r.kind, 'alimtalk')
  })

  it('invalid channel → 400', () => {
    const r = parseSignatureSendNotificationBody({ notification: { channel: 'sms' } })
    assert.equal(r.kind, 'error')
    assert.equal(r.status, 400)
  })
})

describe('parseSignatureSendExpiresAt', () => {
  const now = new Date('2026-06-25T04:00:00.000Z')

  it('expiresAt 없음 → 7일 기본', () => {
    const r = parseSignatureSendExpiresAt({}, now)
    assert.equal(r.ok, true)
    assert.equal(r.expiryDateDisplay, '2026-07-02')
  })

  it('과거 expiresAt → 400', () => {
    const r = parseSignatureSendExpiresAt({ expiresAt: '2026-06-20T00:00:00.000Z' }, now)
    assert.equal(r.ok, false)
    assert.equal(r.status, 400)
  })

  it('30일 초과 → 400', () => {
    const r = parseSignatureSendExpiresAt({ expiresAt: '2026-08-01T00:00:00.000Z' }, now)
    assert.equal(r.ok, false)
  })
})

describe('computeCanResendNotification', () => {
  it('pending + 유효 기한 → true', () => {
    assert.equal(
      computeCanResendNotification({
        status: 'pending',
        sign_token: 'tok',
        expired_at: new Date(Date.now() + 86400000),
      }),
      true,
    )
  })

  it('completed → false', () => {
    assert.equal(
      computeCanResendNotification({
        status: 'completed',
        sign_token: 'tok',
        expired_at: new Date(Date.now() + 86400000),
      }),
      false,
    )
  })

  it('만료 기한 지남 → false', () => {
    assert.equal(
      computeCanResendNotification({
        status: 'opened',
        sign_token: 'tok',
        expired_at: new Date(Date.now() - 1000),
      }),
      false,
    )
  })
})

describe('assertSessionAllowsNotificationResend', () => {
  it('cancelled → 409', () => {
    const r = assertSessionAllowsNotificationResend({
      status: 'cancelled',
      signToken: 'tok',
      expiredAt: new Date(Date.now() + 86400000),
    })
    assert.equal(r.ok, false)
    assert.equal(r.status, 409)
  })
})

describe('mapAlimtalkServiceResultToApiNotification', () => {
  it('skipped 매핑', () => {
    const out = mapAlimtalkServiceResultToApiNotification({
      status: 'skipped',
      errorCategory: 'disabled',
      retryable: false,
    })
    assert.equal(out.status, 'skipped')
    assert.equal(out.channel, 'kakao_alimtalk')
    assert.equal(out.errorCategory, 'disabled')
  })
})
