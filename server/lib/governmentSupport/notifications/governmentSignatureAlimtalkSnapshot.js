import { maskKrMobileForDisplay } from '../../../utils/maskKrMobile.js'
import { GOV_SIGNATURE_ALIMTALK_INTERNAL_VARIABLE_KEYS } from './governmentSignatureAlimtalkConstants.js'

const SENSITIVE_KEYS = new Set([
  'recipientPhone',
  'phone',
  'phoneDigits',
  'relayAuthToken',
  'apikey',
  'apiKey',
  'senderkey',
  'senderKey',
])

/**
 * @param {unknown} value
 */
function maskIfPhoneLike(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length >= 10) {
    return maskKrMobileForDisplay(digits)
  }
  return value
}

/**
 * @param {Record<string, unknown>} obj
 */
export function sanitizeAlimtalkSnapshot(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return {}
  }
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      out[key] = key.includes('Token') || key.includes('Key') ? '[redacted]' : maskIfPhoneLike(value)
      continue
    }
    if (key === 'messageVariables' && value && typeof value === 'object' && !Array.isArray(value)) {
      /** @type {Record<string, unknown>} */
      const vars = {}
      for (const [vk, vv] of Object.entries(/** @type {Record<string, unknown>} */ (value))) {
        if (vk === 'managerPhone' || vk === 'customerPhone') {
          vars[vk] = maskIfPhoneLike(vv)
        } else if (vk === 'customerName') {
          vars[vk] = typeof vv === 'string' && vv.length > 1 ? `${vv[0]}*` : vv
        } else {
          vars[vk] = vv
        }
      }
      out[key] = vars
      continue
    }
    if (key === 'button' && value && typeof value === 'object' && !Array.isArray(value)) {
      const btn = /** @type {Record<string, unknown>} */ ({ ...value })
      out[key] = btn
      continue
    }
    out[key] = value
  }
  return out
}

/**
 * @param {Record<string, string>} messageVariables
 */
export function validateInternalAlimtalkVariables(messageVariables) {
  for (const key of GOV_SIGNATURE_ALIMTALK_INTERNAL_VARIABLE_KEYS) {
    const v = String(messageVariables[key] ?? '').trim()
    if (!v) {
      const category =
        key === 'customerName'
          ? 'missing_customer_name'
          : key === 'managerPhone'
            ? 'missing_contact'
            : key === 'signToken'
              ? 'missing_sign_token'
              : 'unknown'
      return { ok: false, errorCategory: category }
    }
  }
  return { ok: true }
}

/**
 * @param {string} signToken
 * @param {string} publicBaseUrl
 */
export function buildGovernmentSignaturePublicSignUrl(signToken, publicBaseUrl) {
  const token = String(signToken ?? '').trim()
  const base = String(publicBaseUrl ?? '').trim().replace(/\/$/, '')
  if (!token || !base) return null
  return `${base}/government/sign/${encodeURIComponent(token)}`
}
