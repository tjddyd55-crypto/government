/**
 * EC2 알림톡 relay 전용 환경변수 (기존 SMS env 와 분리).
 */

function normalizeBooleanEnv(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
  return s === '1' || s === 'TRUE' || s === 'YES' || s === 'Y' || s === 'ON' || s === 'T'
}

export function loadAlimtalkGatewayConfig() {
  const dryRunRaw = process.env.ALIMTALK_DRY_RUN
  const dryRun =
    dryRunRaw != null && String(dryRunRaw).trim() !== ''
      ? normalizeBooleanEnv(dryRunRaw)
      : true
  return {
    relayAuthToken: String(process.env.ALIMTALK_RELAY_AUTH_TOKEN ?? '').trim(),
    dryRun,
    aligoApiKey: String(process.env.ALIGO_API_KEY ?? '').trim(),
    aligoUserId: String(process.env.ALIGO_USER_ID ?? '').trim(),
    aligoSenderKey: String(process.env.ALIGO_KAKAO_SENDER_KEY ?? '').trim(),
    /** 기존 SMS 발신번호와 동일 키 재사용 (값 변경 금지) */
    aligoSender: String(process.env.ALIGO_SENDER ?? '').trim().replace(/\D/g, ''),
    governmentTemplateCode: String(process.env.GOVERNMENT_ALIMTALK_TEMPLATE_CODE ?? '').trim(),
    /** 최초 실발송 검증용 — 설정 시 이 번호만 live 허용 */
    liveTestRecipient: String(process.env.ALIMTALK_LIVE_TEST_RECIPIENT ?? '')
      .trim()
      .replace(/\D/g, ''),
    sendTimeoutMs: (() => {
      const n = Number(process.env.ALIMTALK_SEND_TIMEOUT_MS ?? 8000)
      if (!Number.isFinite(n) || n < 3000) return 8000
      return Math.min(n, 15000)
    })(),
  }
}
