/**
 * gov_signature_notification_logs 최신 행 → API 요약 필드.
 */

/**
 * @param {Record<string, unknown> | null | undefined} logRow
 */
export function mapLatestNotificationLogToApiSummary(logRow) {
  if (!logRow) {
    return {
      notificationStatus: 'not_requested',
      notificationSentAt: null,
      notificationRecipientPhoneMasked: null,
      notificationRetryCount: 0,
      notificationErrorCategory: null,
      notificationProviderCode: null,
      notificationDryRun: false,
    }
  }
  const status = String(logRow.status ?? '').trim()
  const providerCode = logRow.provider_code != null ? String(logRow.provider_code) : null
  const sentAt = logRow.sent_at ?? logRow.requested_at ?? null
  return {
    notificationStatus: status || 'not_requested',
    notificationSentAt: sentAt ? new Date(sentAt).toISOString() : null,
    notificationRecipientPhoneMasked:
      logRow.recipient_phone_masked != null ? String(logRow.recipient_phone_masked) : null,
    notificationRetryCount: Number(logRow.retry_count ?? 0) || 0,
    notificationErrorCategory: logRow.error_category != null ? String(logRow.error_category) : null,
    notificationProviderCode: providerCode,
    notificationDryRun: providerCode === 'DRY_RUN',
  }
}

/** 목록/상세 쿼리용 LATERAL 서브쿼리 (별칭 notif_log) */
export const LATEST_GOV_SIGNATURE_NOTIFICATION_LOG_LATERAL = `
  LEFT JOIN LATERAL (
    SELECT
      nl.status,
      nl.sent_at,
      nl.requested_at,
      nl.recipient_phone_masked,
      nl.retry_count,
      nl.error_category,
      nl.provider_code
    FROM gov_signature_notification_logs nl
    WHERE nl.send_session_id = s.id
    ORDER BY nl.created_at DESC
    LIMIT 1
  ) notif_log ON true
`

/**
 * @param {Record<string, unknown>} row DB row with notif_log_* or joined notif_log columns
 */
export function mapNotificationSummaryFromJoinedRow(row) {
  const hasLog =
    row.notif_log_status != null ||
    row.notification_log_status != null ||
    (row.notif_log && typeof row.notif_log === 'object')
  if (!hasLog) {
    return mapLatestNotificationLogToApiSummary(null)
  }
  return mapLatestNotificationLogToApiSummary({
    status: row.notif_log_status ?? row.notification_log_status,
    sent_at: row.notif_log_sent_at ?? row.notification_log_sent_at,
    requested_at: row.notif_log_requested_at ?? row.notification_log_requested_at,
    recipient_phone_masked:
      row.notif_log_recipient_phone_masked ?? row.notification_log_recipient_phone_masked,
    retry_count: row.notif_log_retry_count ?? row.notification_log_retry_count,
    error_category: row.notif_log_error_category ?? row.notification_log_error_category,
    provider_code: row.notif_log_provider_code ?? row.notification_log_provider_code,
  })
}
