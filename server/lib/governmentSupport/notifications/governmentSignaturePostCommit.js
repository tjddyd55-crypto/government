import { sendGovernmentSignatureAlimtalk } from './governmentSignatureAlimtalkService.js'
import { mapAlimtalkServiceResultToApiNotification } from './governmentSignatureSendNotification.js'

/**
 * COMMIT 이후 알림톡 발송 (세션 롤백 없음).
 * @param {import('pg').Pool | { query: Function }} pool
 * @param {{
 *   sendSessionId: string,
 *   createdBy?: string | null,
 *   retryCount?: number,
 * }} params
 */
export async function runPostCommitGovernmentSignatureAlimtalk(pool, params) {
  const sendSessionId = String(params.sendSessionId ?? '').trim()
  if (!sendSessionId) {
    return mapAlimtalkServiceResultToApiNotification({
      status: 'failed',
      errorCategory: 'unknown',
      retryable: false,
    })
  }
  try {
    const result = await sendGovernmentSignatureAlimtalk(pool, {
      sendSessionId,
      createdBy: params.createdBy ?? null,
      retryCount: Number(params.retryCount ?? 0),
    })
    return mapAlimtalkServiceResultToApiNotification(result)
  } catch (err) {
    console.error('[gov signature alimtalk] post-commit send failed', {
      sendSessionId,
      error: err instanceof Error ? err.message : String(err),
    })
    return mapAlimtalkServiceResultToApiNotification({
      status: 'failed',
      errorCategory: 'unknown',
      retryable: true,
    })
  }
}
