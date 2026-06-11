/**
 * 정부지원 CRM 브라우저 저장 key SSOT.
 * R2 object key는 서버 presign 응답만 사용 — 프론트에서 조합하지 않는다.
 */

export const GOVERNMENT_STORAGE_KEYS = Object.freeze({
  /** @deprecated legacy — RegisterPage migration 후 제거 검토 */
  joinAgencyCodeSession: 'government_join_agency_code',
  selectedProfileId: 'government.selectedProfileId',
  lastWorkspaceTab: 'government.lastWorkspaceTab',
  customerAppTab: 'government.customerAppTab',
})

/** legacy session key → 신규 key (아직 미사용 필드는 no-op) */
export function migrateGovernmentStorageKeys(): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    const key = GOVERNMENT_STORAGE_KEYS.joinAgencyCodeSession
    const legacyJoin = window.sessionStorage.getItem(key)
    if (legacyJoin && !window.sessionStorage.getItem(key)) {
      window.sessionStorage.setItem(key, legacyJoin)
    }
  } catch {
    /* ignore quota / private mode */
  }
}
