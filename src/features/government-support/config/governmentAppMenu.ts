import type { GaTenantDashboardMenuEntry } from '../../dashboard/gaTenantMenu'
import type { GovernmentAccessSummary } from '../api/governmentSupportApi'
import { canManageGovernmentUsers, isGovernmentProgramUser } from '../lib/governmentAccess'
import { canManageGovernmentSignatures } from '../lib/governmentHome'
import {
  GOVERNMENT_ADMIN_SIGNATURE_PDF_NEW_PATH,
  GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH,
  GOVERNMENT_AGENCY_ADMIN_NAV,
  GOVERNMENT_INDUSTRY_ADMIN_NAV,
  GOVERNMENT_STAFF_NAV,
  type GovernmentAdminNavItem,
} from './governmentAdminNav'
import { GOVERNMENT_USER_NAV } from './governmentUserNav'

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
  return GOVERNMENT_USER_NAV.map((item) => ({
    type: 'link' as const,
    label: item.label,
    path: item.to,
  }))
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
  if (itemPath === '/government/workspace') {
    return pathname === '/government/workspace'
  }
  if (itemPath === '/government/my-applications') {
    return pathname === '/government/my-applications' || pathname.startsWith('/government/my-applications/')
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}
