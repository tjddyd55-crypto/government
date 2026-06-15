/** 정부지원 CRM 관리자 사이드바 (보험 CRM: GA 관리·직원·공지 / 유저·고객 데이터 분리) */
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'
import {
  isGovernmentSignaturePdfNavActive,
  isGovernmentSignatureTemplatesNavActive,
} from './governmentAdminNavActive'

export type GovernmentAdminNavItem = {
  to: string
  label: string
  /** NavLink end — 정확히 to 와 일치할 때만 active */
  end?: boolean
  /** NavLink active — pathname 이 이 prefix 로 시작할 때 active (end 보다 우선) */
  matchPrefix?: string
  /** 커스텀 active 판정 (전자서명 템플릿 / PDF 좌표 분리용) */
  isActive?: (pathname: string) => boolean
}

export const GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH = GOVERNMENT_ROUTE_PATHS.adminSignatureTemplates
export const GOVERNMENT_ADMIN_SIGNATURE_PDF_NEW_PATH = GOVERNMENT_ROUTE_PATHS.adminSignaturePdfNew

const RESOURCES_NAV: GovernmentAdminNavItem = {
  to: GOVERNMENT_ROUTE_PATHS.adminResources,
  label: '자료실/서식함',
}

export const GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_NAV: GovernmentAdminNavItem = {
  to: GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH,
  label: '전자서명 템플릿',
  isActive: isGovernmentSignatureTemplatesNavActive,
}

export const GOVERNMENT_ADMIN_SIGNATURE_PDF_NAV: GovernmentAdminNavItem = {
  to: GOVERNMENT_ADMIN_SIGNATURE_PDF_NEW_PATH,
  label: 'PDF 좌표 설정',
  isActive: isGovernmentSignaturePdfNavActive,
}

const SIGNATURE_NAV_ITEMS: GovernmentAdminNavItem[] = [
  GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_NAV,
  GOVERNMENT_ADMIN_SIGNATURE_PDF_NAV,
]

const SETTINGS_NAV: GovernmentAdminNavItem = {
  to: '/government/admin/settings',
  label: '설정',
}

/** 업종·super 관리자 — 대행사·공지/자료(global·대행사)·전자서명·설정 */
export const GOVERNMENT_INDUSTRY_ADMIN_NAV: GovernmentAdminNavItem[] = [
  { to: GOVERNMENT_ROUTE_PATHS.adminRoot, label: '대시보드', end: true },
  { to: GOVERNMENT_ROUTE_PATHS.adminAgencies, label: '대행사 관리' },
  ...SIGNATURE_NAV_ITEMS,
  { to: GOVERNMENT_ROUTE_PATHS.adminNotices, label: '공지/전달사항' },
  RESOURCES_NAV,
  SETTINGS_NAV,
]

/** 대행사 관리자 — 직원·이용자·문의 */
export const GOVERNMENT_AGENCY_ADMIN_NAV: GovernmentAdminNavItem[] = [
  { to: GOVERNMENT_ROUTE_PATHS.adminRoot, label: '운영 대시보드', end: true },
  { to: GOVERNMENT_ROUTE_PATHS.adminUsers, label: '대행사 직원' },
  { to: GOVERNMENT_ROUTE_PATHS.adminProgramUsers, label: '이용자 관리' },
  { to: GOVERNMENT_ROUTE_PATHS.adminInquiries, label: '문의 관리' },
  { to: GOVERNMENT_ROUTE_PATHS.adminNotifications, label: '알림' },
  ...SIGNATURE_NAV_ITEMS,
  { to: GOVERNMENT_ROUTE_PATHS.adminNotices, label: '공지/전달사항' },
  RESOURCES_NAV,
  SETTINGS_NAV,
]

/** 대행사 직원 — 문의·공지·운영 업무 중심 */
export const GOVERNMENT_STAFF_NAV: GovernmentAdminNavItem[] = [
  { to: GOVERNMENT_ROUTE_PATHS.adminRoot, label: '운영 대시보드', end: true },
  { to: GOVERNMENT_ROUTE_PATHS.adminInquiries, label: '문의 관리' },
  { to: GOVERNMENT_ROUTE_PATHS.adminNotifications, label: '알림' },
  ...SIGNATURE_NAV_ITEMS,
  { to: GOVERNMENT_ROUTE_PATHS.adminNotices, label: '공지/전달사항' },
  RESOURCES_NAV,
  { to: '/government/admin/settings', label: '내 정보' },
]

/** @deprecated — 레이아웃에서 역할별 배열 조합 */
export const GOVERNMENT_ADMIN_NAV: GovernmentAdminNavItem[] = GOVERNMENT_INDUSTRY_ADMIN_NAV

/** @deprecated — `GOVERNMENT_AGENCY_ADMIN_NAV` 사용 */
export const GOVERNMENT_USER_MANAGER_NAV: GovernmentAdminNavItem[] = GOVERNMENT_AGENCY_ADMIN_NAV
