/**
 * SMS 발송 채널(test/live) 결정 — ALIGO_TEST_MODE 및 배포 환경 기준.
 */

function isProductionDeploy() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT)
}

/** env 플래그를 true 로 해석한다. 참으로 명시된 값만 true */
export function normalizeBooleanEnv(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
  return s === '1' || s === 'TRUE' || s === 'YES' || s === 'Y' || s === 'ON' || s === 'T'
}

function hasAligoCredentials() {
  return Boolean(
    String(process.env.ALIGO_API_KEY ?? '').trim() &&
      String(process.env.ALIGO_USER_ID ?? '').trim() &&
      String(process.env.ALIGO_SENDER ?? '').trim(),
  )
}

function hasSmsHttpGateway() {
  return Boolean(String(process.env.SMS_HTTP_GATEWAY_URL ?? '').trim())
}

/** @returns {'test' | 'live'} */
export function resolveSmsDeliveryMode() {
  if (hasSmsHttpGateway()) {
    return 'live'
  }

  const raw = process.env.ALIGO_TEST_MODE
  if (raw != null && String(raw).trim() !== '') {
    return normalizeBooleanEnv(raw) ? 'test' : 'live'
  }

  // 미설정: 운영 배포 + 프로바이더 자격 있으면 live, 그 외 안전 기본값 test
  if (isProductionDeploy() && hasAligoCredentials()) {
    return 'live'
  }
  return 'test'
}

/** @returns {boolean} true 이면 실제 알리고 호출 없이 test_mode 분기 */
export function isAligoTestModeOn() {
  return resolveSmsDeliveryMode() === 'test'
}

/** @returns {Record<string, 'present' | 'missing'>} 값은 노출하지 않음 */
export function describeSmsProviderEnvPresence() {
  const pick = (key) => (String(process.env[key] ?? '').trim() ? 'present' : 'missing')
  return {
    ALIGO_API_KEY: pick('ALIGO_API_KEY'),
    ALIGO_USER_ID: pick('ALIGO_USER_ID'),
    ALIGO_SENDER: pick('ALIGO_SENDER'),
    ALIGO_TEST_MODE: process.env.ALIGO_TEST_MODE == null ? 'missing' : 'present',
    SMS_HTTP_GATEWAY_URL: pick('SMS_HTTP_GATEWAY_URL'),
    GOV_SIGNATURE_OTP_SMS_MOCK: pick('GOV_SIGNATURE_OTP_SMS_MOCK'),
    CONTRACT_OTP_SMS_MOCK: pick('CONTRACT_OTP_SMS_MOCK'),
  }
}
