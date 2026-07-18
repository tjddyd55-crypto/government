/** 정부지원 계정 인증 OTP 목적 — 로그·cooldown 분리용. 알림톡 본문에는 넣지 않는다. */
export const GOVERNMENT_AUTH_VERIFICATION_PURPOSES = Object.freeze({
  SIGNUP: 'SIGNUP',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PHONE_CHANGE: 'PHONE_CHANGE',
  ACCOUNT_RECOVERY: 'ACCOUNT_RESET',
  ACCOUNT_RESET: 'ACCOUNT_RESET',
})

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeGovernmentAuthVerificationPurpose(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (s === 'ACCOUNT_RECOVERY' || s === 'ACCOUNT_RESET') {
    return GOVERNMENT_AUTH_VERIFICATION_PURPOSES.ACCOUNT_RESET
  }
  if (
    s === GOVERNMENT_AUTH_VERIFICATION_PURPOSES.SIGNUP ||
    s === GOVERNMENT_AUTH_VERIFICATION_PURPOSES.PASSWORD_RESET ||
    s === GOVERNMENT_AUTH_VERIFICATION_PURPOSES.PHONE_CHANGE
  ) {
    return s
  }
  return s || 'UNKNOWN'
}
