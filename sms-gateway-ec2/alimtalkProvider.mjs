/**
 * Aligo 카카오 알림톡 발송 (dry-run 시 API 미호출).
 */

const ALIGO_ALIMTALK_URL = 'https://kakaoapi.aligo.in/akv10/alimtalk/send/'

/**
 * @param {Record<string, unknown>} raw
 */
function pickAligoCode(raw) {
  const code = raw?.code ?? raw?.result_code ?? raw?.resultCode
  return code != null ? String(code) : null
}

/**
 * @param {Record<string, unknown>} raw
 */
function pickAligoMessage(raw) {
  const msg = raw?.message ?? raw?.msg ?? raw?.result_message
  return msg != null ? String(msg) : null
}

/**
 * @param {Record<string, unknown>} raw
 */
function pickAligoMessageId(raw) {
  const id = raw?.mid ?? raw?.message_id ?? raw?.msg_id
  return id != null ? String(id) : null
}

/**
 * @param {{
 *   config: ReturnType<import('./alimtalkConfig.mjs').loadAlimtalkGatewayConfig>,
 *   recipientPhone: string,
 *   templateCode: string,
 *   messageVariables: Record<string, string>,
 *   button: { name: string, mobileUrl: string, pcUrl?: string, linkType?: string },
 *   variableNameMap: Record<string, string | null | undefined>,
 * }} p
 */
export function buildAligoAlimtalkForm(p) {
  const { config, recipientPhone, templateCode, messageVariables, button, variableNameMap } = p
  const tplCode = templateCode || config.governmentTemplateCode
  const lines = []
  for (const [internalKey, aligoKey] of Object.entries(variableNameMap)) {
    if (!aligoKey) continue
    const value = String(messageVariables[internalKey] ?? '').trim()
    if (value) {
      lines.push(`#{${aligoKey}}=${value}`)
    }
  }
  const messageBody = lines.length > 0 ? lines.join('\n') : ' '

  const linkType = String(button.linkType ?? 'WL').trim() || 'WL'
  const buttonPayload = {
    button: [
      {
        name: String(button.name ?? '전자서명 확인'),
        linkType,
        linkTypeName: linkType === 'WL' ? '웹링크' : linkType,
        linkMo: String(button.mobileUrl ?? ''),
        ...(button.pcUrl ? { linkPc: String(button.pcUrl) } : {}),
      },
    ],
  }

  const form = new URLSearchParams()
  form.set('apikey', config.aligoApiKey)
  form.set('userid', config.aligoUserId)
  form.set('senderkey', config.aligoSenderKey)
  form.set('tpl_code', tplCode)
  form.set('receiver_1', recipientPhone)
  form.set('message_1', messageBody)
  form.set('button_1', JSON.stringify(buttonPayload))
  form.set('failover', 'N')
  form.set('testmode', 'N')
  return form
}

/**
 * @param {{
 *   config: ReturnType<import('./alimtalkConfig.mjs').loadAlimtalkGatewayConfig>,
 *   recipientPhone: string,
 *   templateCode: string,
 *   messageVariables: Record<string, string>,
 *   button: { name: string, mobileUrl: string, pcUrl?: string, linkType?: string },
 *   variableNameMap: Record<string, string | null | undefined>,
 *   dryRun: boolean,
 * }} p
 */
export async function sendAligoAlimtalk(p) {
  const { config, dryRun } = p
  const requestedAt = new Date().toISOString()

  if (dryRun) {
    return {
      ok: true,
      status: 'sent',
      provider: 'aligo',
      channel: 'kakao_alimtalk',
      dryRun: true,
      providerMessageId: null,
      providerCode: 'DRY_RUN',
      providerMessage: 'dry-run: Aligo API not called',
      retryable: false,
      errorCategory: null,
      requestedAt,
      sentAt: requestedAt,
      failedAt: null,
    }
  }

  if (!config.aligoApiKey || !config.aligoUserId || !config.aligoSenderKey) {
    return {
      ok: false,
      status: 'failed',
      provider: 'aligo',
      channel: 'kakao_alimtalk',
      providerMessageId: null,
      providerCode: null,
      providerMessage: 'Aligo credentials not configured',
      retryable: false,
      errorCategory: 'provider_auth_error',
      requestedAt,
      sentAt: null,
      failedAt: requestedAt,
    }
  }

  const tplCode = String(p.templateCode ?? config.governmentTemplateCode ?? '').trim()
  if (!tplCode) {
    return {
      ok: false,
      status: 'failed',
      provider: 'aligo',
      channel: 'kakao_alimtalk',
      providerMessageId: null,
      providerCode: null,
      providerMessage: 'template code missing',
      retryable: false,
      errorCategory: 'missing_template',
      requestedAt,
      sentAt: null,
      failedAt: requestedAt,
    }
  }

  const form = buildAligoAlimtalkForm({ ...p, templateCode: tplCode })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.sendTimeoutMs)

  try {
    const res = await fetch(ALIGO_ALIMTALK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: controller.signal,
    })
    clearTimeout(timer)
    const text = await res.text()
    let parsed = {}
    try {
      parsed = text ? JSON.parse(text) : {}
    } catch {
      parsed = { message: text }
    }

    const providerCode = pickAligoCode(parsed)
    const providerMessage = pickAligoMessage(parsed) ?? text.slice(0, 500)
    const providerMessageId = pickAligoMessageId(parsed)
    const success = res.ok && (providerCode === '0' || providerCode === '1' || parsed.success === true)

    if (success) {
      return {
        ok: true,
        status: 'sent',
        provider: 'aligo',
        channel: 'kakao_alimtalk',
        providerMessageId,
        providerCode,
        providerMessage,
        retryable: false,
        errorCategory: null,
        requestedAt,
        sentAt: new Date().toISOString(),
        failedAt: null,
      }
    }

    return {
      ok: false,
      status: 'failed',
      provider: 'aligo',
      channel: 'kakao_alimtalk',
      providerMessageId,
      providerCode,
      providerMessage,
      retryable: res.status >= 500,
      errorCategory: 'provider_rejected',
      requestedAt,
      sentAt: null,
      failedAt: new Date().toISOString(),
    }
  } catch (err) {
    clearTimeout(timer)
    const isTimeout = err?.name === 'AbortError'
    return {
      ok: false,
      status: 'failed',
      provider: 'aligo',
      channel: 'kakao_alimtalk',
      providerMessageId: null,
      providerCode: null,
      providerMessage: isTimeout ? 'provider timeout' : 'network error',
      retryable: true,
      errorCategory: isTimeout ? 'provider_timeout' : 'network_error',
      requestedAt,
      sentAt: null,
      failedAt: new Date().toISOString(),
    }
  }
}
