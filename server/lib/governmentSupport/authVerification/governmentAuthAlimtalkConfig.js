function normalizeBooleanEnv(raw, defaultValue = false) {
  if (raw == null || String(raw).trim() === '') {
    return defaultValue
  }
  const s = String(raw).trim().toUpperCase()
  return s === '1' || s === 'TRUE' || s === 'YES' || s === 'Y' || s === 'ON' || s === 'T'
}

/**
 * 인증번호 알림톡 설정.
 * 전자서명(UJ_4754) env 와 분리. Kakao credential·relay token 은 전자서명과 재사용.
 */
export function loadGovernmentAuthAlimtalkConfig() {
  const enabled = normalizeBooleanEnv(process.env.GOVERNMENT_AUTH_ALIMTALK_ENABLED, false)
  const fallbackSmsEnabled = normalizeBooleanEnv(
    process.env.GOVERNMENT_AUTH_ALIMTALK_FALLBACK_SMS_ENABLED,
    true,
  )
  const templateCode = String(
    process.env.GOVERNMENT_AUTH_ALIMTALK_TEMPLATE_CODE ?? 'UJ_6183',
  ).trim()

  const explicitRelay = String(process.env.GOVERNMENT_AUTH_ALIMTALK_RELAY_URL ?? '').trim()
  const signatureRelay = String(process.env.GOVERNMENT_ALIMTALK_RELAY_URL ?? '').trim()
  let relayUrl = explicitRelay
  if (!relayUrl && signatureRelay.includes('/send-alimtalk')) {
    relayUrl = signatureRelay.replace(/\/send-alimtalk\/?$/, '/send-auth-alimtalk')
  } else if (!relayUrl && signatureRelay) {
    relayUrl = `${signatureRelay.replace(/\/$/, '')}/send-auth-alimtalk`
  }

  const relayAuthToken = String(
    process.env.GOVERNMENT_AUTH_ALIMTALK_RELAY_AUTH_TOKEN ??
      process.env.GOVERNMENT_ALIMTALK_RELAY_AUTH_TOKEN ??
      '',
  ).trim()

  const relayTimeoutMs = (() => {
    const n = Number(process.env.GOVERNMENT_AUTH_ALIMTALK_RELAY_TIMEOUT_MS ?? 8000)
    if (!Number.isFinite(n) || n < 3000) return 8000
    return Math.min(n, 15000)
  })()

  /** 승인 템플릿 변수명 SSOT (template/list 확정 후 env 로만 조정) */
  const varCode = String(process.env.GOVERNMENT_AUTH_ALIMTALK_VAR_CODE ?? '인증번호').trim() || '인증번호'
  const varExpires =
    String(process.env.GOVERNMENT_AUTH_ALIMTALK_VAR_EXPIRES ?? '유효시간').trim() || '유효시간'

  /** 승인 본문과 일치해야 함. 승인 후 template/list 기준으로 env 갱신 */
  const messageTemplate = String(
    process.env.GOVERNMENT_AUTH_ALIMTALK_MESSAGE_TEMPLATE ??
      `인증번호는 #{${varCode}} 입니다.\n유효시간: #{${varExpires}}분`,
  ).trim()

  const subject = String(process.env.GOVERNMENT_AUTH_ALIMTALK_SUBJECT ?? '인증번호').trim() || '인증번호'

  return {
    enabled,
    fallbackSmsEnabled,
    templateCode,
    relayUrl,
    relayAuthToken,
    relayTimeoutMs,
    varCode,
    varExpires,
    messageTemplate,
    subject,
    product: 'government_auth',
    channel: 'kakao_alimtalk',
  }
}
