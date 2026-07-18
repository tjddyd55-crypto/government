import { maskKrMobileForDisplay } from '../../../utils/maskKrMobile.js'
import { sendVerificationCode } from '../../../services/smsService.js'
import { postGovernmentSignatureAlimtalkRelay } from '../notifications/governmentSignatureAlimtalkRelayClient.js'
import { loadGovernmentAuthAlimtalkConfig } from './governmentAuthAlimtalkConfig.js'
import {
  buildGovernmentAuthAlimtalkMessage,
  buildGovernmentAuthAlimtalkMessageVariables,
} from './governmentAuthAlimtalkMessage.js'
import { normalizeGovernmentAuthVerificationPurpose } from './governmentAuthVerificationPurposes.js'

/**
 * @param {{
 *   purpose: string,
 *   phoneDigits: string,
 *   channel: string,
 *   fallbackUsed: boolean,
 *   provider?: string | null,
 *   providerCode?: string | null,
 *   providerMessage?: string | null,
 *   skipReason?: string | null,
 * }} p
 */
function logAuthDelivery(p) {
  console.error('[gov-auth-otp] delivery', {
    purpose: p.purpose,
    phone: maskKrMobileForDisplay(p.phoneDigits),
    channel: p.channel,
    fallbackUsed: p.fallbackUsed,
    provider: p.provider ?? null,
    providerCode: p.providerCode ?? null,
    providerMessage: p.providerMessage != null ? String(p.providerMessage).slice(0, 120) : null,
    skipReason: p.skipReason ?? null,
  })
}

/**
 * @param {{
 *   phoneNumber: string,
 *   code: string,
 *   purpose: string,
 *   clientIp?: string,
 *   expiresInMinutes?: number,
 *   config?: ReturnType<typeof loadGovernmentAuthAlimtalkConfig>,
 *   sendSms?: typeof sendVerificationCode,
 *   postRelay?: typeof postGovernmentSignatureAlimtalkRelay,
 *   evaluateEligibility?: (templateCode: string) => Promise<{ ok: boolean, reason?: string | null, inspStatus?: string | null, status?: string | null }>,
 * }} p
 */
export async function sendGovernmentAuthVerificationCode(p) {
  const config = p.config ?? loadGovernmentAuthAlimtalkConfig()
  const sendSms = p.sendSms ?? sendVerificationCode
  const postRelay = p.postRelay ?? postGovernmentSignatureAlimtalkRelay
  const purpose = normalizeGovernmentAuthVerificationPurpose(p.purpose)
  const phoneDigits = String(p.phoneNumber ?? '').replace(/\D/g, '')
  const code = String(p.code ?? '').trim()
  const clientIp = String(p.clientIp ?? '')
  const expiresInMinutes = Number.isFinite(Number(p.expiresInMinutes))
    ? Math.floor(Number(p.expiresInMinutes))
    : 3

  if (!phoneDigits || !/^\d{6}$/.test(code)) {
    return {
      success: false,
      sent: false,
      channel: null,
      fallbackUsed: false,
      publicMessage: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    }
  }

  const trySms = async (meta = {}) => {
    const sms = await sendSms({
      phoneNumber: phoneDigits,
      code,
      purpose,
      clientIp,
      relayOnly: true,
    })
    const ok = Boolean(sms?.success)
    logAuthDelivery({
      purpose,
      phoneDigits,
      channel: 'sms',
      fallbackUsed: Boolean(meta.fallbackUsed),
      provider: 'aligo_sms',
      providerCode: ok ? '1' : null,
      providerMessage: ok ? null : String(sms?.publicMessage ?? 'sms_failed').slice(0, 120),
      skipReason: meta.skipReason ?? null,
    })
    return {
      success: ok,
      sent: Boolean(sms?.sent ?? ok),
      deliveryMode: sms?.deliveryMode ?? 'live',
      publicMessage: sms?.publicMessage,
      retryAfterSec: sms?.retryAfterSec,
      channel: ok ? 'sms' : null,
      fallbackUsed: Boolean(meta.fallbackUsed),
      provider: 'aligo_sms',
      providerCode: ok ? '1' : null,
      alimtalkSkipReason: meta.skipReason ?? null,
    }
  }

  if (!config.enabled) {
    return trySms({ fallbackUsed: false, skipReason: 'auth_alimtalk_disabled' })
  }

  if (typeof p.evaluateEligibility === 'function') {
    const el = await p.evaluateEligibility(config.templateCode)
    if (!el?.ok) {
      if (config.fallbackSmsEnabled) {
        return trySms({
          fallbackUsed: true,
          skipReason: el?.reason ?? 'template_not_approved',
        })
      }
      logAuthDelivery({
        purpose,
        phoneDigits,
        channel: 'kakao_alimtalk',
        fallbackUsed: false,
        skipReason: el?.reason ?? 'template_not_approved',
      })
      return {
        success: false,
        sent: false,
        channel: null,
        fallbackUsed: false,
        publicMessage: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        alimtalkSkipReason: el?.reason ?? 'template_not_approved',
      }
    }
  }

  if (!config.relayUrl || !config.relayAuthToken) {
    if (config.fallbackSmsEnabled) {
      return trySms({ fallbackUsed: true, skipReason: 'relay_unconfigured' })
    }
    return {
      success: false,
      sent: false,
      channel: null,
      fallbackUsed: false,
      publicMessage: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    }
  }

  const messageVariables = buildGovernmentAuthAlimtalkMessageVariables({
    code,
    expiresInMinutes,
  })
  // message body is built on EC2 from approved template vars; Railway sends internal keys only.
  void buildGovernmentAuthAlimtalkMessage

  const relay = await postRelay({
    relayUrl: config.relayUrl,
    relayAuthToken: config.relayAuthToken,
    relayTimeoutMs: config.relayTimeoutMs,
    payload: {
      requestId: `gov-auth-${purpose}-${Date.now()}`,
      product: config.product,
      recipientPhone: phoneDigits,
      templateCode: config.templateCode,
      subject: config.subject,
      messageVariables,
      varMap: {
        verificationCode: config.varCode,
        expiresInMinutes: config.varExpires,
      },
      messageTemplate: config.messageTemplate,
      dryRun: false,
    },
  })

  const alimtalkAccepted =
    Boolean(relay?.ok) &&
    relay?.status === 'sent' &&
    String(relay?.providerCode ?? '') === '0' &&
    !relay?.dryRun

  if (alimtalkAccepted) {
    logAuthDelivery({
      purpose,
      phoneDigits,
      channel: 'kakao_alimtalk',
      fallbackUsed: false,
      provider: 'aligo',
      providerCode: String(relay.providerCode),
      providerMessage: relay.providerMessage ?? null,
    })
    return {
      success: true,
      sent: true,
      deliveryMode: 'live',
      channel: 'kakao_alimtalk',
      fallbackUsed: false,
      provider: 'aligo',
      providerCode: String(relay.providerCode),
      providerMessageId: relay.providerMessageId ?? null,
    }
  }

  const skipReason = String(
    relay?.errorCategory ?? (relay?.status === 'skipped' ? 'skipped' : 'alimtalk_failed'),
  )

  if (config.fallbackSmsEnabled) {
    return trySms({ fallbackUsed: true, skipReason })
  }

  logAuthDelivery({
    purpose,
    phoneDigits,
    channel: 'kakao_alimtalk',
    fallbackUsed: false,
    provider: 'aligo',
    providerCode: relay?.providerCode != null ? String(relay.providerCode) : null,
    providerMessage: relay?.providerMessage ?? null,
    skipReason,
  })
  return {
    success: false,
    sent: false,
    channel: null,
    fallbackUsed: false,
    publicMessage: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    alimtalkSkipReason: skipReason,
  }
}
