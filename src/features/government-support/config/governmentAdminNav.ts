/** 정부지원 CRM 관리자 사이드바 */
export type GovernmentAdminNavItem = {
  to: string
  label: string
  end?: boolean
}

/** 업종 관리자 — 대시보드·대행사·설정 */
export const GOVERNMENT_INDUSTRY_ADMIN_NAV: GovernmentAdminNavItem[] = [
  { to: '/government/admin', label: '대시보드', end: true },
  { to: '/government/admin/agencies', label: '대행사 관리' },
  { to: '/government/admin/settings', label: '설정' },
]

/** 사용자 관리자 — 직원·이용자 (사업장/고객 전체 목록 메뉴 없음) */
export const GOVERNMENT_USER_MANAGER_NAV: GovernmentAdminNavItem[] = [
  { to: '/government/admin/users', label: '직원 관리' },
  { to: '/government/admin/program-users', label: '이용자 관리' },
]

/** @deprecated 하위 호환 — industry admin 전용만 사용 */
export const GOVERNMENT_ADMIN_NAV: GovernmentAdminNavItem[] = GOVERNMENT_INDUSTRY_ADMIN_NAV
