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
    /** 카카오 알림톡 전용 — 보험 SMS ALIGO_API_KEY/USER_ID 로 fallback 하지 않음 */
    aligoApiKey: String(process.env.ALIGO_KAKAO_API_KEY ?? '').trim(),
    aligoUserId: String(process.env.ALIGO_KAKAO_USER_ID ?? '').trim(),
    aligoSenderKey: String(process.env.ALIGO_KAKAO_SENDER_KEY ?? '').trim(),
    /** 발신번호만 기존 SMS ALIGO_SENDER 재사용 (값 변경 금지) */
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
