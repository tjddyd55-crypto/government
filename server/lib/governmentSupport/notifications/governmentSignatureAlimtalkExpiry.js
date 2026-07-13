import { getSeoulDateString, seoulYmdAddDays } from '../../analyticsDates.js'
import {
  GOV_SIGNATURE_ALIMTALK_DEFAULT_EXPIRY_DAYS,
  GOV_SIGNATURE_ALIMTALK_MAX_EXPIRY_DAYS,
} from './governmentSignatureAlimtalkConstants.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Asia/Seoul 기준 YYYY-MM-DD 표시용 포맷.
 * @param {Date | string | number} value
 */
export function formatGovernmentSignatureDateForDisplay(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) {
    return null
  }
  return getSeoulDateString(d)
}

/**
 * @param {Date} [now]
 * @returns {Date} UTC Date — 발송 기준 defaultExpiryDays 후 자정(서울) 직전 근사
 */
export function computeDefaultGovernmentSignatureExpiryAt(now = new Date(), defaultExpiryDays = GOV_SIGNATURE_ALIMTALK_DEFAULT_EXPIRY_DAYS) {
  const requestedYmd = getSeoulDateString(now)
  const expiryYmd = seoulYmdAddDays(requestedYmd, defaultExpiryDays)
  const [y, m, d] = expiryYmd.split('-').map(Number)
  // 서울 23:59:59 ≈ UTC same calendar day end — 단순화해 UTC 자정+days
  return new Date(Date.UTC(y, m - 1, d, 14, 59, 59))
}

/**
 * @param {unknown} expiresAtRaw
 * @param {Date} [now]
 * @param {{ defaultExpiryDays?: number, maxExpiryDays?: number }} [opts]
 */
export function resolveGovernmentSignatureExpiryAt(expiresAtRaw, now = new Date(), opts = {}) {
  const defaultExpiryDays = opts.defaultExpiryDays ?? GOV_SIGNATURE_ALIMTALK_DEFAULT_EXPIRY_DAYS
  const maxExpiryDays = opts.maxExpiryDays ?? GOV_SIGNATURE_ALIMTALK_MAX_EXPIRY_DAYS
  const nowMs = now.getTime()

  if (expiresAtRaw == null || expiresAtRaw === '') {
    const expiryAt = computeDefaultGovernmentSignatureExpiryAt(now, defaultExpiryDays)
    return {
      ok: true,
      expiryAt,
      expiryDateDisplay: formatGovernmentSignatureDateForDisplay(expiryAt),
      requestedDateDisplay: formatGovernmentSignatureDateForDisplay(now),
    }
  }

  const expiryAt = expiresAtRaw instanceof Date ? expiresAtRaw : new Date(String(expiresAtRaw))
  if (Number.isNaN(expiryAt.getTime())) {
    return { ok: false, errorCategory: 'missing_expiry' }
  }
  if (expiryAt.getTime() <= nowMs) {
    return { ok: false, errorCategory: 'missing_expiry', message: 'expiry must be in the future' }
  }
  const maxAt = new Date(nowMs + maxExpiryDays * MS_PER_DAY)
  if (expiryAt.getTime() > maxAt.getTime()) {
    return { ok: false, errorCategory: 'missing_expiry', message: 'expiry exceeds max days' }
  }

  return {
    ok: true,
    expiryAt,
    expiryDateDisplay: formatGovernmentSignatureDateForDisplay(expiryAt),
    requestedDateDisplay: formatGovernmentSignatureDateForDisplay(now),
  }
}
