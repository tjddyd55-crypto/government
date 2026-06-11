import type { GaTenantDashboardMenuEntry } from '../../dashboard/gaTenantMenu'
import type { GovernmentAccessSummary } from '../api/governmentSupportApi'
import { canManageGovernmentUsers, isGovernmentProgramUser } from '../lib/governmentAccess'
import { canManageGovernmentSignatures } from '../lib/governmentHome'
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'
import {
  GOVERNMENT_ADMIN_SIGNATURE_PDF_NEW_PATH,
  GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH,
  GOVERNMENT_AGENCY_ADMIN_NAV,
  GOVERNMENT_INDUSTRY_ADMIN_NAV,
  GOVERNMENT_STAFF_NAV,
  type GovernmentAdminNavItem,
} from './governmentAdminNav'

function filterSignatureNavItems(items: GovernmentAdminNavItem[], allowSignatureSetup: boolean) {
  if (allowSignatureSetup) return items
  return items.filter(
    (item) =>
      item.to !== GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH &&
      item.to !== GOVERNMENT_ADMIN_SIGNATURE_PDF_NEW_PATH,
  )
}

function navToMenuEntries(items: GovernmentAdminNavItem[]): GaTenantDashboardMenuEntry[] {
  return items.map((item) => ({
    type: 'link' as const,
    label: item.label,
    path: item.to,
  }))
}

/** 정부지원 관리자(업종/대행사/직원) 모바일 드로어 메뉴 */
export function buildGovernmentAdminMobileMenu(
  summary: GovernmentAccessSummary | null,
): GaTenantDashboardMenuEntry[] {
  if (!summary || isGovernmentProgramUser(summary)) {
    return []
  }

  const items: GovernmentAdminNavItem[] = []
  const allowSignatureSetup = canManageGovernmentSignatures(summary)
  const isIndustry = Boolean(summary.isSuperAdmin || summary.isGovernmentIndustryAdmin)
  const isAgencyAdmin = canManageGovernmentUsers(summary)
  const isStaffOnly =
    !isIndustry &&
    !isAgencyAdmin &&
    (summary.governmentStaffTenantIds?.length ?? 0) > 0

  if (isIndustry) {
    items.push(...GOVERNMENT_INDUSTRY_ADMIN_NAV)
  }
  if (isAgencyAdmin) {
    for (const item of filterSignatureNavItems(GOVERNMENT_AGENCY_ADMIN_NAV, allowSignatureSetup)) {
      if (!items.some((x) => x.to === item.to)) {
        items.push(item)
      }
    }
  }
  if (isStaffOnly) {
    for (const item of filterSignatureNavItems(GOVERNMENT_STAFF_NAV, allowSignatureSetup)) {
      if (!items.some((x) => x.to === item.to)) {
        items.push(item)
      }
    }
  }

  return navToMenuEntries(items)
}

/** 정부지원 program user 모바일 드로어 메뉴 */
export function buildGovernmentUserMobileMenu(): GaTenantDashboardMenuEntry[] {
  return buildGovernmentUserHomeMenu()
}

/** 이용자 홈(/government/workspace) — 보험 DashboardPage menu-card SSOT 패턴 */
export function buildGovernmentUserHomeMenu(): GaTenantDashboardMenuEntry[] {
  return [
    { type: 'link', label: '내 사업장/신청', path: GOVERNMENT_ROUTE_PATHS.myApplications },
    { type: 'link', label: '요청서류', path: GOVERNMENT_ROUTE_PATHS.appRequests },
    { type: 'link', label: '문의', path: GOVERNMENT_ROUTE_PATHS.appInquiries },
    { type: 'link', label: '전자서명', path: GOVERNMENT_ROUTE_PATHS.appSignatures },
    { type: 'divider', label: '' },
    { type: 'link', label: '공지사항', path: GOVERNMENT_ROUTE_PATHS.notices },
    { type: 'link', label: '자료실', path: GOVERNMENT_ROUTE_PATHS.resources },
    { type: 'link', label: '내 정보', path: GOVERNMENT_ROUTE_PATHS.me },
  ]
}

export function isGovernmentMobileMenuPathActive(pathname: string, itemPath: string): boolean {
  if (itemPath === GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH) {
    return (
      pathname === itemPath ||
      pathname === `${itemPath}/new` ||
      /^\/government\/admin\/signature-templates\/[^/]+\/edit$/.test(pathname)
    )
  }
  if (itemPath === GOVERNMENT_ADMIN_SIGNATURE_PDF_NEW_PATH) {
    return pathname.startsWith(`${GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH}/pdf`)
  }
  if (itemPath === GOVERNMENT_ROUTE_PATHS.workspace) {
    return pathname === GOVERNMENT_ROUTE_PATHS.workspace
  }
  if (itemPath === GOVERNMENT_ROUTE_PATHS.myApplications) {
    return (
      pathname === GOVERNMENT_ROUTE_PATHS.myApplications ||
      pathname.startsWith(`${GOVERNMENT_ROUTE_PATHS.myApplications}/`)
    )
  }
  if (itemPath === GOVERNMENT_ROUTE_PATHS.appRequests) {
    return (
      pathname === GOVERNMENT_ROUTE_PATHS.appRequests ||
      pathname.startsWith(`${GOVERNMENT_ROUTE_PATHS.appRequests}/`)
    )
  }
  if (itemPath === GOVERNMENT_ROUTE_PATHS.appInquiries) {
    return (
      pathname === GOVERNMENT_ROUTE_PATHS.appInquiries ||
      pathname.startsWith(`${GOVERNMENT_ROUTE_PATHS.appInquiries}/`)
    )
  }
  if (itemPath === GOVERNMENT_ROUTE_PATHS.appSignatures) {
    return (
      pathname === GOVERNMENT_ROUTE_PATHS.appSignatures ||
      pathname.startsWith(`${GOVERNMENT_ROUTE_PATHS.appSignatures}/`)
    )
  }
  if (itemPath === GOVERNMENT_ROUTE_PATHS.notices) {
    return pathname === GOVERNMENT_ROUTE_PATHS.notices || pathname.startsWith(`${GOVERNMENT_ROUTE_PATHS.notices}/`)
  }
  if (itemPath === GOVERNMENT_ROUTE_PATHS.resources) {
    return pathname === GOVERNMENT_ROUTE_PATHS.resources || pathname.startsWith(`${GOVERNMENT_ROUTE_PATHS.resources}/`)
  }
  if (itemPath === GOVERNMENT_ROUTE_PATHS.me) {
    return pathname === GOVERNMENT_ROUTE_PATHS.me || pathname.startsWith(`${GOVERNMENT_ROUTE_PATHS.me}/`)
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}
