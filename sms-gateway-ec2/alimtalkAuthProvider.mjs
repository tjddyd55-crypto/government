/**
 * 인증번호 알림톡 Aligo 발송 (버튼 없음, failover=N).
 */

import {
  GOVERNMENT_AUTH_ALIMTALK_DEFAULT_TEMPLATE,
  GOVERNMENT_AUTH_ALIMTALK_SUBJECT,
  buildAuthAlimtalkMessageBody,
} from './alimtalkAuthMessage.mjs'

const ALIGO_ALIMTALK_URL = 'https://kakaoapi.aligo.in/akv10/alimtalk/send/'
const ALIGO_TEMPLATE_LIST_URL = 'https://kakaoapi.aligo.in/akv10/template/list/'

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
  return msg != null ? String(msg).slice(0, 300) : null
}

/**
 * @param {Record<string, unknown>} raw
 */
function pickAligoMessageId(raw) {
  const info = raw?.info && typeof raw.info === 'object' ? /** @type {Record<string, unknown>} */ (raw.info) : null
  const id = info?.mid ?? raw?.mid ?? raw?.message_id ?? raw?.msg_id
  return id != null ? String(id) : null
}

/**
 * @param {{
 *   config: ReturnType<import('./alimtalkConfig.mjs').loadAlimtalkGatewayConfig>,
 *   templateCode: string,
 * }} p
 */
export async function fetchAlimtalkTemplateMeta(p) {
  const { config, templateCode } = p
  const form = new URLSearchParams()
  form.set('apikey', config.aligoApiKey)
  form.set('userid', config.aligoUserId)
  form.set('senderkey', config.aligoSenderKey)
  form.set('tpl_code', templateCode)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.sendTimeoutMs)
  try {
    const res = await fetch(ALIGO_TEMPLATE_LIST_URL, {
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
      parsed = {}
    }
    const list = Array.isArray(parsed?.list)
      ? parsed.list
      : Array.isArray(parsed?.data)
        ? parsed.data
        : Array.isArray(parsed?.templates)
          ? parsed.templates
          : []
    const hit =
      list.find((row) => String(row?.templtCode ?? row?.tpl_code ?? row?.code ?? '').trim() === templateCode) ??
      null
    if (!hit) {
      return { found: false, inspStatus: null, status: null, rawCode: pickAligoCode(parsed) }
    }
    return {
      found: true,
      inspStatus: hit.inspStatus ?? hit.insp_status ?? null,
      status: hit.status ?? hit.templtStatus ?? null,
      rawCode: pickAligoCode(parsed),
    }
  } catch {
    clearTimeout(timer)
    return { found: false, inspStatus: null, status: null, rawCode: null, fetchError: true }
  }
}

/**
 * @param {{
 *   config: ReturnType<import('./alimtalkConfig.mjs').loadAlimtalkGatewayConfig>,
 *   recipientPhone: string,
 *   templateCode: string,
 *   subject: string,
 *   messageTemplate: string,
 *   varMap: { verificationCode?: string, expiresInMinutes?: string },
 *   messageVariables: { verificationCode?: string, expiresInMinutes?: string },
 * }} p
 */
export function buildAuthAligoAlimtalkForm(p) {
  const { config, recipientPhone, templateCode, subject, messageTemplate, varMap, messageVariables } = p
  const tplCode = String(templateCode || GOVERNMENT_AUTH_ALIMTALK_DEFAULT_TEMPLATE).trim()
  const messageBody = buildAuthAlimtalkMessageBody({
    messageTemplate,
    varMap,
    messageVariables,
  })

  const form = new URLSearchParams()
  form.set('apikey', config.aligoApiKey)
  form.set('userid', config.aligoUserId)
  form.set('senderkey', config.aligoSenderKey)
  form.set('tpl_code', tplCode)
  form.set('sender', config.aligoSender)
  form.set('receiver_1', recipientPhone)
  form.set('subject_1', String(subject || GOVERNMENT_AUTH_ALIMTALK_SUBJECT))
  form.set('message_1', messageBody)
  form.set('failover', 'N')
  form.set('testMode', 'N')
  return form
}

/**
 * @param {{
 *   config: ReturnType<import('./alimtalkConfig.mjs').loadAlimtalkGatewayConfig>,
 *   recipientPhone: string,
 *   templateCode: string,
 *   subject: string,
 *   messageTemplate: string,
 *   varMap: { verificationCode?: string, expiresInMinutes?: string },
 *   messageVariables: { verificationCode?: string, expiresInMinutes?: string },
 *   dryRun: boolean,
 * }} p
 */
export async function sendAuthAligoAlimtalk(p) {
  const { config, dryRun } = p
  const requestedAt = new Date().toISOString()

  if (dryRun) {
    return {
      ok: true,
      status: 'skipped',
      provider: 'aligo',
      channel: 'kakao_alimtalk',
      dryRun: true,
      providerMessageId: null,
      providerCode: 'DRY_RUN',
      providerMessage: 'dry-run: Aligo API not called',
      retryable: false,
      errorCategory: null,
      requestedAt,
      sentAt: null,
      failedAt: null,
    }
  }

  if (!config.aligoApiKey || !config.aligoUserId || !config.aligoSenderKey || !config.aligoSender) {
    return {
      ok: false,
      status: 'failed',
      provider: 'aligo',
      channel: 'kakao_alimtalk',
      dryRun: false,
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

  const form = buildAuthAligoAlimtalkForm(p)
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
      parsed = { message: text.slice(0, 300) }
    }

    const providerCode = pickAligoCode(parsed)
    const providerMessage = pickAligoMessage(parsed) ?? 'aligo response'
    const providerMessageId = pickAligoMessageId(parsed)
    const success = providerCode === '0'

    if (success) {
      return {
        ok: true,
        status: 'sent',
        provider: 'aligo',
        channel: 'kakao_alimtalk',
        dryRun: false,
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
      dryRun: false,
      providerMessageId,
      providerCode,
      providerMessage,
      retryable: false,
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
      dryRun: false,
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
