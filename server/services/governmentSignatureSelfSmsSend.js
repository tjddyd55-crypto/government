import {
  isSmsHttpGatewayConfigured,
  sendVerificationCode,
} from './smsService.js'
import { SMS_PUBLIC_SERVER_CONFIG_FAILED_MESSAGE } from './smsPublicMessages.js'
import { maskKrMobileForDisplay } from '../utils/maskKrMobile.js'

function isRunningInProduction() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT)
}

function govSignatureOtpSmsMockEnabled() {
  return String(process.env.GOV_SIGNATURE_OTP_SMS_MOCK ?? process.env.CONTRACT_OTP_SMS_MOCK ?? '')
    .trim()
    .toLowerCase() === 'true'
}

/**
 * @param {{ phoneDigits: string, code: string, purpose: string, clientIp?: string }} p
 * @returns {Promise<{
 *   ok: boolean,
 *   mock?: boolean,
 *   sent?: boolean,
 *   deliveryMode?: 'test' | 'live',
 *   message?: string,
 *   publicMessage?: string,
 *   error?: string
 * }>}
 */
export async function sendGovernmentSignatureSelfSmsOtp(p) {
  const phoneDigits = String(p.phoneDigits ?? '').replace(/\D/g, '')
  const code = String(p.code ?? '')
  const purpose = String(p.purpose ?? 'gov_signature')
  const clientIp = String(p.clientIp ?? '')

  if (!phoneDigits || !/^\d{6}$/.test(code)) {
    return { ok: false, error: 'invalid_send_params' }
  }

  const masked = maskKrMobileForDisplay(phoneDigits)

  if (isRunningInProduction() && govSignatureOtpSmsMockEnabled()) {
    console.error('[gov signature OTP SMS] mock must not be enabled in production')
    return { ok: false, error: 'sms_mock_forbidden' }
  }

  if (!isRunningInProduction() && (govSignatureOtpSmsMockEnabled() || !isSmsHttpGatewayConfigured())) {
    console.log('[gov signature OTP SMS mock]', { toMasked: masked, purpose, relay: false })
    return {
      ok: true,
      mock: true,
      sent: false,
      deliveryMode: 'test',
      message: 'SMS 테스트 모드입니다.',
    }
  }

  if (isRunningInProduction() && !isSmsHttpGatewayConfigured()) {
    console.error('[gov signature OTP SMS] EC2 relay not configured in production', {
      purpose,
      toMasked: masked,
      relay: false,
    })
    return {
      ok: false,
      error: 'sms_provider_unconfigured',
      publicMessage: SMS_PUBLIC_SERVER_CONFIG_FAILED_MESSAGE,
    }
  }

  const res = await sendVerificationCode({
    phoneNumber: phoneDigits,
    code,
    purpose,
    clientIp,
    relayOnly: true,
  })
  if (!res.success) {
    return {
      ok: false,
      error: 'sms_send_failed',
      deliveryMode: res.deliveryMode ?? 'live',
      publicMessage:
        typeof res.publicMessage === 'string' && res.publicMessage.trim()
          ? res.publicMessage.trim()
          : SMS_PUBLIC_SERVER_CONFIG_FAILED_MESSAGE,
    }
  }
  return {
    ok: true,
    mock: Boolean(res.test || res.mocked),
    sent: Boolean(res.sent),
    deliveryMode: res.deliveryMode === 'live' ? 'live' : 'test',
    message:
      typeof res.message === 'string' && res.message.trim()
        ? res.message.trim()
        : res.sent
          ? undefined
          : 'SMS 테스트 모드입니다.',
  }
}
