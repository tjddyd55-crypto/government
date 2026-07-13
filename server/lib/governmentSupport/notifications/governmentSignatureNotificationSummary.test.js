import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  mapLatestNotificationLogToApiSummary,
  mapNotificationSummaryFromJoinedRow,
} from './governmentSignatureNotificationSummary.js'

describe('governmentSignatureNotificationSummary', () => {
  it('로그 없음 → not_requested', () => {
    const s = mapLatestNotificationLogToApiSummary(null)
    assert.equal(s.notificationStatus, 'not_requested')
    assert.equal(s.notificationRetryCount, 0)
  })

  it('sent + DRY_RUN', () => {
    const s = mapLatestNotificationLogToApiSummary({
      status: 'sent',
      sent_at: new Date('2026-06-25T05:00:00.000Z'),
      recipient_phone_masked: '010-****-5678',
      retry_count: 1,
      provider_code: 'DRY_RUN',
    })
    assert.equal(s.notificationStatus, 'sent')
    assert.equal(s.notificationDryRun, true)
    assert.equal(s.notificationRetryCount, 1)
  })

  it('joined row 매핑', () => {
    const s = mapNotificationSummaryFromJoinedRow({
      notif_log_status: 'failed',
      notif_log_error_category: 'missing_contact',
      notif_log_retry_count: 0,
    })
    assert.equal(s.notificationStatus, 'failed')
    assert.equal(s.notificationErrorCategory, 'missing_contact')
  })
})
