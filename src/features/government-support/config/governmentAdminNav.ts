/** 정부지원 CRM 관리자 사이드바 (보험 CRM /admin/ga·users 패턴과 동일 구조) */
export type GovernmentAdminNavItem = {
  to: string
  label: string
  end?: boolean
}

export const GOVERNMENT_ADMIN_NAV: GovernmentAdminNavItem[] = [
  { to: '/government/admin', label: '대시보드', end: true },
  { to: '/government/admin/agencies', label: '수행기관/대행사' },
  { to: '/government/admin/profiles', label: '고객/사업장' },
  { to: '/government/admin/users', label: '직원·이용자' },
  { to: '/government/admin/memberships', label: '권한/멤버십' },
  { to: '/government/admin/settings', label: '설정' },
]
