import { sanitizeAlimtalkSnapshot } from './governmentSignatureAlimtalkSnapshot.js'
import {
  GOV_SIGNATURE_ALIMTALK_CHANNEL,
  GOV_SIGNATURE_ALIMTALK_PROVIDER,
} from './governmentSignatureAlimtalkConstants.js'

/**
 * @param {import('pg').Pool | { query: Function }} exec
 * @param {{
 *   tenantId: number | string | null,
 *   profileId: number | string | null,
 *   sendSessionId: string,
 *   templateCode: string | null,
 *   recipientPhoneMasked: string,
 *   status: 'sent' | 'failed' | 'skipped',
 *   providerMessageId?: string | null,
 *   providerCode?: string | null,
 *   providerMessage?: string | null,
 *   errorCategory?: string | null,
 *   retryCount?: number,
 *   requestSnapshot?: Record<string, unknown> | null,
 *   responseSnapshot?: Record<string, unknown> | null,
 *   requestedAt?: Date | string | null,
 *   sentAt?: Date | string | null,
 *   failedAt?: Date | string | null,
 *   createdBy?: string | null,
 * }} row
 */
export async function insertGovSignatureNotificationLog(exec, row) {
  const res = await exec.query(
    `
    INSERT INTO gov_signature_notification_logs (
      tenant_id,
      profile_id,
      send_session_id,
      channel,
      provider,
      template_code,
      recipient_phone_masked,
      status,
      provider_message_id,
      provider_code,
      provider_message,
      error_category,
      retry_count,
      request_snapshot,
      response_snapshot,
      requested_at,
      sent_at,
      failed_at,
      created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17,$18,$19)
    RETURNING *
    `,
    [
      row.tenantId != null ? Number(row.tenantId) : null,
      row.profileId != null ? Number(row.profileId) : null,
      row.sendSessionId,
      GOV_SIGNATURE_ALIMTALK_CHANNEL,
      GOV_SIGNATURE_ALIMTALK_PROVIDER,
      row.templateCode,
      row.recipientPhoneMasked,
      row.status,
      row.providerMessageId ?? null,
      row.providerCode ?? null,
      row.providerMessage ?? null,
      row.errorCategory ?? null,
      row.retryCount ?? 0,
      JSON.stringify(sanitizeAlimtalkSnapshot(row.requestSnapshot ?? {})),
      JSON.stringify(sanitizeAlimtalkSnapshot(row.responseSnapshot ?? {})),
      row.requestedAt ?? null,
      row.sentAt ?? null,
      row.failedAt ?? null,
      row.createdBy ?? null,
    ],
  )
  return res.rows[0] ?? null
}

/**
 * @param {import('pg').Pool | { query: Function }} exec
 * @param {string} sendSessionId
 */
export async function findLatestGovSignatureNotificationLog(exec, sendSessionId) {
  const res = await exec.query(
    `
    SELECT *
    FROM gov_signature_notification_logs
    WHERE send_session_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [sendSessionId],
  )
  return res.rows[0] ?? null
}

/**
 * @param {import('pg').Pool | { query: Function }} exec
 * @param {number | string} tenantId
 * @param {number} [limit]
 */
export async function listGovSignatureNotificationLogsByTenant(exec, tenantId, limit = 50) {
  const res = await exec.query(
    `
    SELECT *
    FROM gov_signature_notification_logs
    WHERE tenant_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [Number(tenantId), limit],
  )
  return res.rows
}
