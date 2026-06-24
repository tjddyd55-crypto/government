/** CRM-정부지원 — document / PWA / 헤더 브랜드 SSOT */
export const GOVERNMENT_APP_TITLE = 'CRM-정부지원'
export const GOVERNMENT_APP_SHORT_NAME = 'CRM-정부지원'
export const GOVERNMENT_APP_DESCRIPTION = 'CRM-정부지원 관리 시스템'
export const GOVERNMENT_LOGIN_DOCUMENT_TITLE = 'CRM-정부지원 로그인'

/** 페이지별 document.title — `CRM-정부지원 · {section}` */
export function governmentPageTitle(section?: string): string {
  const trimmed = String(section ?? '').trim()
  return trimmed ? `${GOVERNMENT_APP_TITLE} · ${trimmed}` : GOVERNMENT_APP_TITLE
}

/** 플랫폼 관리자 대시보드 헤더 */
export function governmentAdminHubTitle(isPlatform: boolean): string {
  return isPlatform ? `${GOVERNMENT_APP_TITLE} 관리` : '운영 대시보드'
}
