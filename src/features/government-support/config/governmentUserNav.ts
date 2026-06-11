/** 정부지원 CRM 이용자(program user) 전용 네비게이션 */
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'

export type GovernmentUserNavItem = {
  to: string
  label: string
  end?: boolean
}

export const GOVERNMENT_USER_NAV: GovernmentUserNavItem[] = [
  { to: GOVERNMENT_ROUTE_PATHS.workspace, label: '홈', end: true },
  { to: GOVERNMENT_ROUTE_PATHS.myApplications, label: '내 사업장/신청' },
  { to: GOVERNMENT_ROUTE_PATHS.signatures, label: '전자서명' },
  { to: GOVERNMENT_ROUTE_PATHS.notices, label: '공지사항' },
  { to: GOVERNMENT_ROUTE_PATHS.resources, label: '자료실' },
  { to: GOVERNMENT_ROUTE_PATHS.me, label: '내 정보' },
]
