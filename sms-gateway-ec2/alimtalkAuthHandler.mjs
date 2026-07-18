import { loadAlimtalkGatewayConfig } from './alimtalkConfig.mjs'
import { verifyAlimtalkRelayAuth } from './alimtalkAuth.mjs'
import { evaluateAlimtalkTemplateSendEligibility } from './alimtalkTemplateEligibility.mjs'
import {
  GOVERNMENT_AUTH_ALIMTALK_DEFAULT_TEMPLATE,
  GOVERNMENT_AUTH_ALIMTALK_SUBJECT,
} from './alimtalkAuthMessage.mjs'
import { fetchAlimtalkTemplateMeta, sendAuthAligoAlimtalk } from './alimtalkAuthProvider.mjs'

const AUTH_PRODUCT = 'government_auth'

/**
 * @param {Record<string, unknown>} body
 */
function validateAuthAlimtalkRequestBody(body) {
  const product = String(body?.product ?? '').trim()
  if (product !== AUTH_PRODUCT) {
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
  const templateCode =
    String(body?.templateCode ?? '').trim() || GOVERNMENT_AUTH_ALIMTALK_DEFAULT_TEMPLATE
  const messageVariables = body?.messageVariables
  if (!messageVariables || typeof messageVariables !== 'object' || Array.isArray(messageVariables)) {
    return { ok: false, status: 400, error: 'missing_template_variables' }
  }
  const vars = /** @type {Record<string, unknown>} */ (messageVariables)
  const verificationCode = String(vars.verificationCode ?? '').trim()
  const expiresInMinutes = String(vars.expiresInMinutes ?? '').trim()
  if (!/^\d{6}$/.test(verificationCode) || !expiresInMinutes) {
    return { ok: false, status: 400, error: 'missing_template_variables' }
  }
  if (body?.button != null) {
    return { ok: false, status: 400, error: 'button_not_allowed' }
  }

  const varMapRaw = body?.varMap && typeof body.varMap === 'object' ? body.varMap : {}
  const varMap = {
    verificationCode: String(/** @type {Record<string, unknown>} */ (varMapRaw).verificationCode ?? '인증번호'),
    expiresInMinutes: String(/** @type {Record<string, unknown>} */ (varMapRaw).expiresInMinutes ?? '유효시간'),
  }
  const messageTemplate = String(body?.messageTemplate ?? '').trim()
  const subject = String(body?.subject ?? GOVERNMENT_AUTH_ALIMTALK_SUBJECT).trim() || GOVERNMENT_AUTH_ALIMTALK_SUBJECT

  return {
    ok: true,
    value: {
      requestId: String(body?.requestId ?? '').trim() || null,
      product,
      recipientPhone,
      templateCode,
      subject,
      messageTemplate:
        messageTemplate ||
        `인증번호는 #{${varMap.verificationCode}} 입니다.\n유효시간: #{${varMap.expiresInMinutes}}분`,
      varMap,
      messageVariables: {
        verificationCode,
        expiresInMinutes,
      },
      dryRun: Boolean(body?.dryRun),
    },
  }
}

/**
 * @param {{
 *   fetchTemplateMeta?: typeof fetchAlimtalkTemplateMeta,
 *   sendAuth?: typeof sendAuthAligoAlimtalk,
 * }} [deps]
 */
export function createAuthAlimtalkHandler(deps = {}) {
  const fetchTemplateMeta = deps.fetchTemplateMeta ?? fetchAlimtalkTemplateMeta
  const sendAuth = deps.sendAuth ?? sendAuthAligoAlimtalk

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

    const validated = validateAuthAlimtalkRequestBody(req.body)
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

    try {
      const { value } = validated
      const effectiveDryRun = value.dryRun || config.dryRun

      if (!effectiveDryRun) {
        if (!config.aligoSenderKey) {
          res.status(503).json({
            ok: false,
            status: 'failed',
            provider: 'aligo',
            channel: 'kakao_alimtalk',
            dryRun: false,
            errorCategory: 'missing_sender_key',
            retryable: false,
          })
          return
        }

        const meta = await fetchTemplateMeta({
          config,
          templateCode: value.templateCode,
        })
        const eligibility = evaluateAlimtalkTemplateSendEligibility({
          found: meta.found,
          inspStatus: meta.inspStatus,
          status: meta.status,
        })
        if (!eligibility.ok) {
          res.status(200).json({
            ok: false,
            status: 'skipped',
            provider: 'aligo',
            channel: 'kakao_alimtalk',
            dryRun: false,
            errorCategory: eligibility.reason ?? 'template_not_approved',
            providerCode: null,
            providerMessage: 'template not eligible for send',
            retryable: false,
            requestId: value.requestId,
            inspStatus: eligibility.inspStatus,
            templateStatus: eligibility.status,
          })
          return
        }
      }

      const result = await sendAuth({
        config,
        recipientPhone: value.recipientPhone,
        templateCode: value.templateCode,
        subject: value.subject,
        messageTemplate: value.messageTemplate,
        varMap: value.varMap,
        messageVariables: value.messageVariables,
        dryRun: effectiveDryRun,
      })

      const statusCode = result.ok
        ? 200
        : result.errorCategory === 'provider_rejected'
          ? 502
          : result.status === 'skipped'
            ? 200
            : 503
      res.status(statusCode).json({
        ...result,
        requestId: value.requestId,
      })
    } catch {
      res.status(500).json({
        ok: false,
        status: 'failed',
        provider: 'aligo',
        channel: 'kakao_alimtalk',
        dryRun: false,
        errorCategory: 'unknown',
        retryable: true,
      })
    }
  }
}
