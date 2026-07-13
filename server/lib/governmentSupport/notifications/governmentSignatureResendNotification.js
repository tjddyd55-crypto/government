import { runPostCommitGovernmentSignatureAlimtalk } from './governmentSignaturePostCommit.js'
import { assertSessionAllowsNotificationResend } from './governmentSignatureSendNotification.js'

/**
 * @param {import('pg').Pool | { query: Function }} pool
 * @param {{
 *   sessionId: string,
 *   accessSql: string,
 *   accessParams: (sessionId: string) => unknown[],
 *   createdBy?: string | null,
 * }} params
 */
export async function resendGovernmentSignatureAlimtalkNotification(pool, params) {
  const sessionId = String(params.sessionId ?? '').trim()
  if (!sessionId) {
    return { ok: false, status: 400, message: '발송 세션 id가 필요합니다.' }
  }

  const sessionRes = await pool.query(
    `
    SELECT
      s.id,
      s.status,
      s.sign_token,
      s.expired_at
    FROM gov_signature_send_sessions s
    JOIN gov_support_profiles p ON p.id = s.profile_id
    WHERE ${params.accessSql}
    LIMIT 1
    `,
    params.accessParams(sessionId),
  )
  if (sessionRes.rowCount === 0) {
    return { ok: false, status: 404, message: '발송 세션을 찾을 수 없습니다.' }
  }

  const row = sessionRes.rows[0]
  const guard = assertSessionAllowsNotificationResend({
    status: String(row.status ?? ''),
    signToken: row.sign_token,
    expiredAt: row.expired_at,
  })
  if (!guard.ok) {
    return { ok: false, status: guard.status, error: guard.error, message: guard.message }
  }

  const retryRes = await pool.query(
    `
    SELECT COALESCE(MAX(retry_count), 0)::int AS max_retry
    FROM gov_signature_notification_logs
    WHERE send_session_id = $1
    `,
    [sessionId],
  )
  const retryCount = Number(retryRes.rows[0]?.max_retry ?? 0) + 1

  const notification = await runPostCommitGovernmentSignatureAlimtalk(pool, {
    sendSessionId: sessionId,
    createdBy: params.createdBy ?? null,
    retryCount,
  })

  return {
    ok: true,
    status: 200,
    sendSessionId: sessionId,
    signToken: String(row.sign_token ?? ''),
    notification,
  }
}
