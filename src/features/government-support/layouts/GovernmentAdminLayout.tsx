import { useMemo } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { GOVERNMENT_APP_TITLE } from '../../../config/governmentAppMeta'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import useIsMobile from '../../../hooks/useIsMobile'
import { useAuth } from '../../auth/AuthProvider'
import {
  GOVERNMENT_ADMIN_SIGNATURE_PDF_NEW_PATH,
  GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH,
  GOVERNMENT_AGENCY_ADMIN_NAV,
  GOVERNMENT_INDUSTRY_ADMIN_NAV,
  GOVERNMENT_STAFF_NAV,
  type GovernmentAdminNavItem,
} from '../config/governmentAdminNav'
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'
import { buildGovernmentAdminMobileMenu } from '../config/governmentAppMenu'
import GovernmentMobileWorkspaceShell from '../components/GovernmentMobileWorkspaceShell'
import GovernmentWorkspaceChrome from '../components/GovernmentWorkspaceChrome'
import { canManageGovernmentUsers, isGovernmentProgramUser } from '../lib/governmentAccess'
import { canAccessUserOwnedWorkspace, canManageGovernmentSignatures } from '../lib/governmentHome'
import { useGovernmentAccessShared } from '../context/GovernmentAccessContext'
import '../government-support.css'
import '../government-admin-theme.css'

function filterSignatureNavItems(items: GovernmentAdminNavItem[], allowSignatureSetup: boolean) {
  if (allowSignatureSetup) return items
  return items.filter(
    (item) =>
      item.to !== GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH &&
      item.to !== GOVERNMENT_ADMIN_SIGNATURE_PDF_NEW_PATH,
  )
}

function useGovernmentAdminNavItems(summary: ReturnType<typeof useGovernmentAccessShared>['summary']) {
  const allowSignatureSetup = canManageGovernmentSignatures(summary)
  return useMemo(() => {
    const items: GovernmentAdminNavItem[] = []
    const isIndustry = Boolean(summary?.isSuperAdmin || summary?.isGovernmentIndustryAdmin)
    const isAgencyAdmin = canManageGovernmentUsers(summary)
    const isStaffOnly =
      !isIndustry &&
      !isAgencyAdmin &&
      (summary?.governmentStaffTenantIds?.length ?? 0) > 0 &&
      !isGovernmentProgramUser(summary)

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
    return items
  }, [summary, allowSignatureSetup])
}

export default function GovernmentAdminLayout() {
  useDocumentTitle(`${GOVERNMENT_APP_TITLE} · 관리`)
  const { token, logout } = useAuth()
  const { summary } = useGovernmentAccessShared(token)
  const isMobile = useIsMobile()
  const showWorkspaceLink = canAccessUserOwnedWorkspace(summary)
  const navItems = useGovernmentAdminNavItems(summary)
  const mobileMenuItems = useMemo(() => buildGovernmentAdminMobileMenu(summary), [summary])

  if (isMobile) {
    return (
      <main
        className={`page government-page government-admin-layout government-admin-layout--mobile government-admin-white-theme ${isMobile ? 'government-page--mobile' : 'government-page--pc'}`}
      >
        <GovernmentMobileWorkspaceShell
          title="정부지원 CRM · 관리"
          menuItems={mobileMenuItems}
          onLogout={logout}
          headerExtra={
            showWorkspaceLink ? (
              <Link to="/government/my-applications" className="government-mobile-workspace-shell__workspace-link">
                내 사업장
              </Link>
            ) : null
          }
        >
          <div className="government-admin-layout__content">
            <Outlet />
          </div>
        </GovernmentMobileWorkspaceShell>
      </main>
    )
  }

  return (
    <main
      className={`page government-page government-admin-layout government-admin-layout--insurance-shell government-admin-layout--pc-admin government-admin-white-theme ${isMobile ? 'government-page--mobile' : 'government-page--pc'}`}
    >
      <GovernmentWorkspaceChrome
        brand={`${GOVERNMENT_APP_TITLE} · 관리`}
        navItems={navItems}
        onLogout={() => logout()}
        workspaceLink={
          showWorkspaceLink ? { to: GOVERNMENT_ROUTE_PATHS.myApplications, label: '내 사업장/신청' } : null
        }
      >
        <Outlet />
      </GovernmentWorkspaceChrome>
    </main>
  )
}
