/** 정부지원 CRM 관리자 사이드바 (보험 CRM: GA 관리·직원·공지 / 유저·고객 데이터 분리) */
export type GovernmentAdminNavItem = {
  to: string
  label: string
  end?: boolean
}

const RESOURCES_NAV: GovernmentAdminNavItem = {
  to: '/government/admin/resources',
  label: '자료실/서식함',
}

const SIGNATURE_HISTORY_NAV: GovernmentAdminNavItem = {
  to: '/government/admin/signatures',
  label: '전자서명 발송 내역',
}

const SIGNATURE_SEND_NAV: GovernmentAdminNavItem = {
  to: '/government/admin/signatures/send',
  label: '전자서명 발송',
}

const SIGNATURE_TEMPLATES_NAV: GovernmentAdminNavItem = {
  to: '/government/admin/signature-templates',
  label: '전자서명 템플릿',
}

const SETTINGS_NAV: GovernmentAdminNavItem = {
  to: '/government/admin/settings',
  label: '설정',
}

/** 업종 관리자 — 대행사·설정·운영 현황 (공지/자료는 대행사 귀속, 업종 관리자 메뉴 없음) */
export const GOVERNMENT_INDUSTRY_ADMIN_NAV: GovernmentAdminNavItem[] = [
  { to: '/government/admin', label: '대시보드', end: true },
  { to: '/government/admin/agencies', label: '대행사 관리' },
  SETTINGS_NAV,
]

/** 대행사 관리자 — 직원·이용자·요청서류·문의 (사업장/고객 전체 목록 없음) */
export const GOVERNMENT_AGENCY_ADMIN_NAV: GovernmentAdminNavItem[] = [
  { to: '/government/admin', label: '운영 대시보드', end: true },
  { to: '/government/admin/users', label: '대행사 직원' },
  { to: '/government/admin/program-users', label: '이용자 관리' },
  { to: '/government/admin/document-requests', label: '요청서류 관리' },
  { to: '/government/admin/inquiries', label: '문의 관리' },
  { to: '/government/admin/notifications', label: '알림' },
  SIGNATURE_HISTORY_NAV,
  SIGNATURE_SEND_NAV,
  SIGNATURE_TEMPLATES_NAV,
  { to: '/government/admin/notices', label: '공지/전달사항' },
  RESOURCES_NAV,
  SETTINGS_NAV,
]

/** 대행사 직원 — 요청서류·문의·공지·운영 업무 중심 */
export const GOVERNMENT_STAFF_NAV: GovernmentAdminNavItem[] = [
  { to: '/government/admin', label: '운영 대시보드', end: true },
  { to: '/government/admin/document-requests', label: '요청서류 관리' },
  { to: '/government/admin/inquiries', label: '문의 관리' },
  { to: '/government/admin/notifications', label: '알림' },
  SIGNATURE_HISTORY_NAV,
  SIGNATURE_SEND_NAV,
  SIGNATURE_TEMPLATES_NAV,
  { to: '/government/admin/notices', label: '공지/전달사항' },
  RESOURCES_NAV,
  { to: '/government/admin/settings', label: '내 정보' },
]

/** @deprecated — 레이아웃에서 역할별 배열 조합 */
export const GOVERNMENT_ADMIN_NAV: GovernmentAdminNavItem[] = GOVERNMENT_INDUSTRY_ADMIN_NAV

/** @deprecated — `GOVERNMENT_AGENCY_ADMIN_NAV` 사용 */
export const GOVERNMENT_USER_MANAGER_NAV: GovernmentAdminNavItem[] = GOVERNMENT_AGENCY_ADMIN_NAV
