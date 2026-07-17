/**
 * 담당자명·연락처 해석 (발송자 개인 휴대폰 사용 금지).
 */

/**
 * @param {Record<string, unknown>} row tenants + optional ga name
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
 * (승인 템플릿에 업체명 변수 없음 — 업체명을 담당자명 fallback으로 쓰지 않음)
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
 * tenant.config.governmentAgency.contactPhone 우선.
 * @param {{ tenantConfig?: Record<string, unknown>, gaContactPhone?: string | null }} p
 */
export function resolveGovernmentSignatureManagerContactPhone(p) {
  const gov = p.tenantConfig ?? {}
  const fromTenant = String(gov.contactPhone ?? '').trim().replace(/\D/g, '')
  if (fromTenant) return fromTenant
  const fromGa = String(p.gaContactPhone ?? '').trim().replace(/\D/g, '')
  if (fromGa) return fromGa
  return null
}
