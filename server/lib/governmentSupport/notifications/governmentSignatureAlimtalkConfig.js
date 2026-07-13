import {
  GOV_SIGNATURE_ALIMTALK_CHANNEL,
  GOV_SIGNATURE_ALIMTALK_DEFAULT_EXPIRY_DAYS,
  GOV_SIGNATURE_ALIMTALK_INTERNAL_VARIABLE_KEYS,
  GOV_SIGNATURE_ALIMTALK_MAX_EXPIRY_DAYS,
  GOV_SIGNATURE_ALIMTALK_PRODUCT,
} from './governmentSignatureAlimtalkConstants.js'

function normalizeBooleanEnv(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
  return s === '1' || s === 'TRUE' || s === 'YES' || s === 'Y' || s === 'ON' || s === 'T'
}

/**
 * Aligo 콘솔 변수명 — 미확정 시 null (임의 확정 금지).
 * @returns {Record<string, string | null>}
 */
export function loadGovernmentSignatureAlimtalkTemplateVariableMap() {
  const envKey = (suffix) => String(process.env[`GOVERNMENT_ALIMTALK_VAR_${suffix}`] ?? '').trim() || null
  return {
    customerName: envKey('CUSTOMER_NAME'),
    companyName: envKey('COMPANY_NAME'),
    requestedDate: envKey('REQUESTED_DATE'),
    expiryDate: envKey('EXPIRY_DATE'),
    managerName: envKey('MANAGER_NAME'),
    managerPhone: envKey('MANAGER_PHONE'),
  }
}

export function loadGovernmentSignatureAlimtalkConfig() {
  const enabled = normalizeBooleanEnv(process.env.GOVERNMENT_ALIMTALK_ENABLED)
  const dryRunRaw = process.env.GOVERNMENT_ALIMTALK_DRY_RUN
  const dryRun =
    dryRunRaw != null && String(dryRunRaw).trim() !== ''
      ? normalizeBooleanEnv(dryRunRaw)
      : true
  const relayUrl = String(process.env.GOVERNMENT_ALIMTALK_RELAY_URL ?? '').trim()
  const relayAuthToken = String(process.env.GOVERNMENT_ALIMTALK_RELAY_AUTH_TOKEN ?? '').trim()
  const publicBaseUrl = String(
    process.env.GOVERNMENT_PUBLIC_BASE_URL ?? process.env.VITE_BASE_URL ?? '',
  ).trim().replace(/\/$/, '')
  const templateCode = String(process.env.GOVERNMENT_ALIMTALK_TEMPLATE_CODE ?? '').trim()
  const buttonName = String(process.env.GOVERNMENT_ALIMTALK_BUTTON_NAME ?? '전자서명 확인').trim()
  const buttonLinkType = String(process.env.GOVERNMENT_ALIMTALK_BUTTON_LINK_TYPE ?? 'WL').trim() || 'WL'
  const relayTimeoutMs = (() => {
    const n = Number(process.env.GOVERNMENT_ALIMTALK_RELAY_TIMEOUT_MS ?? 8000)
    if (!Number.isFinite(n) || n < 3000) return 8000
    return Math.min(n, 15000)
  })()

  return {
    enabled,
    dryRun,
    relayUrl,
    relayAuthToken,
    publicBaseUrl,
    templateCode,
    buttonName,
    buttonLinkType,
    relayTimeoutMs,
    product: GOV_SIGNATURE_ALIMTALK_PRODUCT,
    channel: GOV_SIGNATURE_ALIMTALK_CHANNEL,
    defaultExpiryDays: GOV_SIGNATURE_ALIMTALK_DEFAULT_EXPIRY_DAYS,
    maxExpiryDays: GOV_SIGNATURE_ALIMTALK_MAX_EXPIRY_DAYS,
    internalVariableKeys: [...GOV_SIGNATURE_ALIMTALK_INTERNAL_VARIABLE_KEYS],
    templateVariableMap: loadGovernmentSignatureAlimtalkTemplateVariableMap(),
  }
}
