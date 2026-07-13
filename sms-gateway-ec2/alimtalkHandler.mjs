import { loadAlimtalkGatewayConfig } from './alimtalkConfig.mjs'
import { verifyAlimtalkRelayAuth } from './alimtalkAuth.mjs'
import { sendAligoAlimtalk } from './alimtalkProvider.mjs'

const GOVERNMENT_PRODUCT = 'government'

/**
 * @param {Record<string, unknown>} body
 */
function validateAlimtalkRequestBody(body) {
  const product = String(body?.product ?? '').trim()
  if (product !== GOVERNMENT_PRODUCT) {
    return { ok: false, status: 400, error: 'invalid_product' }
  }
  const recipientPhone = String(body?.recipientPhone ?? '')
    .trim()
    .replace(/\D/g, '')
  if (!recipientPhone) {
    return { ok: false, status: 400, error: 'missing_recipient' }
  }
  if (!/^01[0-9]\d{7,8}$/.test(recipientPhone)) {
    return { ok: false, status: 400, error: 'invalid_phone' }
  }
  const templateCode = String(body?.templateCode ?? '').trim()
  const messageVariables = body?.messageVariables
  if (!messageVariables || typeof messageVariables !== 'object' || Array.isArray(messageVariables)) {
    return { ok: false, status: 400, error: 'missing_template_variables' }
  }
  const button = body?.button
  if (!button || typeof button !== 'object' || Array.isArray(button)) {
    return { ok: false, status: 400, error: 'missing_button' }
  }
  const buttonName = String(/** @type {Record<string, unknown>} */ (button).name ?? '').trim()
  const mobileUrl = String(/** @type {Record<string, unknown>} */ (button).mobileUrl ?? '').trim()
  if (!buttonName || !mobileUrl) {
    return { ok: false, status: 400, error: 'invalid_button' }
  }
  return {
    ok: true,
    value: {
      requestId: String(body?.requestId ?? '').trim() || null,
      product,
      recipientPhone,
      templateCode,
      messageVariables: /** @type {Record<string, string>} */ (
        Object.fromEntries(
          Object.entries(/** @type {Record<string, unknown>} */ (messageVariables)).map(([k, v]) => [
            k,
            String(v ?? ''),
          ]),
        )
      ),
      button: {
        name: buttonName,
        mobileUrl,
        pcUrl: String(/** @type {Record<string, unknown>} */ (button).pcUrl ?? '').trim() || undefined,
        linkType: String(/** @type {Record<string, unknown>} */ (button).linkType ?? 'WL').trim() || 'WL',
      },
      dryRun: Boolean(body?.dryRun),
      variableNameMap:
        body?.variableNameMap && typeof body.variableNameMap === 'object' && !Array.isArray(body.variableNameMap)
          ? /** @type {Record<string, string | null | undefined>} */ (body.variableNameMap)
          : {},
    },
  }
}

export function createAlimtalkHandler() {
  return async (req, res) => {
    const config = loadAlimtalkGatewayConfig()
    const auth = verifyAlimtalkRelayAuth(req, config.relayAuthToken)
    if (!auth.ok) {
      res.status(auth.status).json({
        ok: false,
        status: 'failed',
        provider: 'aligo',
        channel: 'kakao_alimtalk',
        errorCategory: auth.error,
        retryable: false,
      })
      return
    }

    const validated = validateAlimtalkRequestBody(req.body)
    if (!validated.ok) {
      res.status(validated.status).json({
        ok: false,
        status: 'failed',
        provider: 'aligo',
        channel: 'kakao_alimtalk',
        errorCategory: validated.error,
        retryable: false,
      })
      return
    }

    const { value } = validated
    const effectiveDryRun = value.dryRun || config.dryRun

    if (!config.aligoSenderKey && !effectiveDryRun) {
      res.status(503).json({
        ok: false,
        status: 'failed',
        provider: 'aligo',
        channel: 'kakao_alimtalk',
        errorCategory: 'missing_sender_key',
        retryable: false,
      })
      return
    }

    const result = await sendAligoAlimtalk({
      config,
      recipientPhone: value.recipientPhone,
      templateCode: value.templateCode,
      messageVariables: value.messageVariables,
      button: value.button,
      variableNameMap: value.variableNameMap,
      dryRun: effectiveDryRun,
    })

    const statusCode = result.ok ? 200 : result.errorCategory === 'provider_rejected' ? 502 : 503
    res.status(statusCode).json({
      ...result,
      requestId: value.requestId,
    })
  }
}
