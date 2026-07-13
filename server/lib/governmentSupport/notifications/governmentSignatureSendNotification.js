import { GOV_SIGNATURE_ALIMTALK_CHANNEL, GOV_SIGNATURE_ALIMTALK_PROVIDER } from './governmentSignatureAlimtalkConstants.js'
import { resolveGovernmentSignatureExpiryAt } from './governmentSignatureAlimtalkExpiry.js'
import { loadGovernmentSignatureAlimtalkConfig } from './governmentSignatureAlimtalkConfig.js'

const SUPPORTED_CHANNELS = new Set(['kakao_alimtalk'])

/**
 * @param {unknown} body
 * @returns {{ kind: 'none' } | { kind: 'alimtalk', channel: 'kakao_alimtalk' } | { kind: 'error', status: number, message: string }}
 */
export function parseSignatureSendNotificationBody(body) {
  const raw = body && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body).notification : null
  if (raw == null) {
    return { kind: 'none' }
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { kind: 'error', status: 400, message: 'notification 형식이 올바르지 않습니다.' }
  }
  const channel = String(/** @type {Record<string, unknown>} */ (raw).channel ?? '').trim()
  if (!channel) {
    return { kind: 'error', status: 400, message: 'notification.channel이 필요합니다.' }
  }
  if (!SUPPORTED_CHANNELS.has(channel)) {
    return { kind: 'error', status: 400, message: '지원하지 않는 notification channel입니다.' }
  }
  return { kind: 'alimtalk', channel: 'kakao_alimtalk' }
}

/**
 * @param {unknown} body
 * @param {Date} [sentAt]
 */
export function parseSignatureSendExpiresAt(body, sentAt = new Date()) {
  const src = body && typeof body === 'object' ? /** @type {Record<string, unknown>} */ (body) : {}
  const raw = src.expiresAt ?? src.expires_at ?? null
  const config = loadGovernmentSignatureAlimtalkConfig()
  const resolved = resolveGovernmentSignatureExpiryAt(raw, sentAt, {
    defaultExpiryDays: config.defaultExpiryDays,
    maxExpiryDays: config.maxExpiryDays,
  })
  if (!resolved.ok) {
    return {
      ok: false,
      status: 400,
      message:
        raw != null && raw !== ''
          ? 'expiresAt이 올바르지 않습니다. (현재보다 이후이며 최대 30일 이내)'
          : '서명 기한을 계산할 수 없습니다.',
    }
  }
  return { ok: true, expiryAt: resolved.expiryAt, expiryDateDisplay: resolved.expiryDateDisplay }
}

/**
 * @param {{
 *   status?: string,
 *   errorCategory?: string | null,
 *   providerCode?: string | null,
 *   providerMessage?: string | null,
 *   retryable?: boolean,
 * }} result
 */
export function mapAlimtalkServiceResultToApiNotification(result) {
  const status =
    result.status === 'sent' || result.status === 'skipped' || result.status === 'failed'
      ? result.status
      : 'failed'
  return {
    status,
    channel: GOV_SIGNATURE_ALIMTALK_CHANNEL,
    provider: GOV_SIGNATURE_ALIMTALK_PROVIDER,
    providerCode: result.providerCode ?? null,
    providerMessage: result.providerMessage ?? null,
    retryable: Boolean(result.retryable),
    errorCategory: result.errorCategory ?? null,
  }
}

/**
 * @param {Record<string, unknown>} row
 */
export function computeCanResendNotification(row) {
  const st = String(row.session_status ?? row.status ?? '').trim()
  const signToken = String(row.sign_token ?? '').trim()
  if (!signToken) {
    return false
  }
  if (st !== 'pending' && st !== 'opened') {
    return false
  }
  const expiredAt = row.expired_at
  if (expiredAt == null) {
    return false
  }
  const exp = expiredAt instanceof Date ? expiredAt : new Date(String(expiredAt))
  if (Number.isNaN(exp.getTime()) || exp.getTime() <= Date.now()) {
    return false
  }
  return true
}

/**
 * @param {{ status: string, signToken?: string | null, expiredAt?: Date | string | null }} session
 * @returns {{ ok: true } | { ok: false, status: number, error: string, message: string }}
 */
export function assertSessionAllowsNotificationResend(session) {
  const st = String(session.status ?? '').trim()
  if (st === 'completed') {
    return {
      ok: false,
      status: 409,
      error: 'cannot_resend_completed',
      message: '완료된 전자서명 발송은 알림톡을 재발송할 수 없습니다.',
    }
  }
  if (st === 'cancelled') {
    return {
      ok: false,
      status: 409,
      error: 'cannot_resend_cancelled',
      message: '취소된 전자서명 발송은 알림톡을 재발송할 수 없습니다.',
    }
  }
  if (st === 'expired') {
    return {
      ok: false,
      status: 409,
      error: 'cannot_resend_expired',
      message: '만료된 전자서명 발송은 알림톡을 재발송할 수 없습니다.',
    }
  }
  if (st !== 'pending' && st !== 'opened') {
    return {
      ok: false,
      status: 409,
      error: 'cannot_resend_status',
      message: '현재 상태에서는 알림톡을 재발송할 수 없습니다.',
    }
  }
  const signToken = String(session.signToken ?? '').trim()
  if (!signToken) {
    return {
      ok: false,
      status: 409,
      error: 'missing_sign_token',
      message: '서명 링크가 없어 알림톡을 재발송할 수 없습니다.',
    }
  }
  const expiredAt = session.expiredAt
  if (expiredAt == null) {
    return {
      ok: false,
      status: 409,
      error: 'missing_expiry',
      message: '서명 기한이 없어 알림톡을 재발송할 수 없습니다.',
    }
  }
  const exp = expiredAt instanceof Date ? expiredAt : new Date(String(expiredAt))
  if (Number.isNaN(exp.getTime()) || exp.getTime() <= Date.now()) {
    return {
      ok: false,
      status: 409,
      error: 'session_expired',
      message: '서명 기한이 지나 알림톡을 재발송할 수 없습니다.',
    }
  }
  return { ok: true }
}
