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
    { type: 'link', label: '내 사업장/신청', path: '/government/my-applications' },
    { type: 'link', label: '요청서류', path: '/government/app/requests' },
    { type: 'link', label: '문의', path: '/government/app/inquiries' },
    { type: 'link', label: '전자서명', path: '/government/app/signatures' },
    { type: 'divider', label: '' },
    { type: 'link', label: '공지사항', path: '/government/notices' },
    { type: 'link', label: '자료실', path: '/government/resources' },
    { type: 'link', label: '내 정보', path: '/government/me' },
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
  if (itemPath === '/government/workspace') {
    return pathname === '/government/workspace'
  }
  if (itemPath === '/government/my-applications') {
    return pathname === '/government/my-applications' || pathname.startsWith('/government/my-applications/')
  }
  if (itemPath === '/government/app/requests') {
    return pathname === '/government/app/requests' || pathname.startsWith('/government/app/requests/')
  }
  if (itemPath === '/government/app/inquiries') {
    return pathname === '/government/app/inquiries' || pathname.startsWith('/government/app/inquiries/')
  }
  if (itemPath === '/government/app/signatures') {
    return pathname === '/government/app/signatures' || pathname.startsWith('/government/app/signatures/')
  }
  if (itemPath === '/government/notices') {
    return pathname === '/government/notices' || pathname.startsWith('/government/notices/')
  }
  if (itemPath === '/government/resources') {
    return pathname === '/government/resources' || pathname.startsWith('/government/resources/')
  }
  if (itemPath === '/government/me') {
    return pathname === '/government/me' || pathname.startsWith('/government/me/')
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}
