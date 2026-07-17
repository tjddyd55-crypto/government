/**
 * 담당자명·연락처 해석.
 * 담당자연락처 SSOT: 회원가입·인증 후 저장된 users.phone_number (발송 세션의 sent_by_user).
 */

/**
 * @param {Record<string, unknown>} row tenants + optional ga name
 * @deprecated 알림톡 managerPhone 경로에서는 사용하지 않음. tenant config 자체는 유지.
 */
export function readTenantGovernmentAgencyConfig(row) {
  const config = row?.config
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return {}
  }
  const root = /** @type {Record<string, unknown>} */ (config)
  const gov = root.governmentAgency
  if (!gov || typeof gov !== 'object' || Array.isArray(gov)) {
    return {}
  }
  return /** @type {Record<string, unknown>} */ (gov)
}

/**
 * 담당자명: display_name → username → 담당자
 * @param {{
 *   displayName?: string | null,
 *   username?: string | null,
 * }} p
 */
export function resolveGovernmentSignatureManagerName(p) {
  const displayName = String(p.displayName ?? '').trim()
  if (displayName) return displayName
  const username = String(p.username ?? '').trim()
  if (username) return username
  return '담당자'
}

/**
 * 담당자연락처: 발송자(users.phone_number) — 가입 시 인증·저장된 휴대폰.
 * tenant.config.governmentAgency.contactPhone 은 사용하지 않는다.
 * @param {{ senderPhoneNumber?: string | null }} p
 * @returns {string | null} 숫자만 정규화된 휴대폰, 없으면 null
 */
export function resolveGovernmentSignatureManagerContactPhone(p) {
  const digits = String(p.senderPhoneNumber ?? '')
    .trim()
    .replace(/\D/g, '')
  if (!digits) return null
  if (!/^01[0-9]\d{7,8}$/.test(digits)) return null
  return digits
}
