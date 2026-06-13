import { useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { GOVERNMENT_APP_TITLE } from '../../../config/governmentAppMeta'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import useIsMobile from '../../../hooks/useIsMobile'
import { useAuth } from '../../auth/AuthProvider'
import { GOVERNMENT_USER_NAV } from '../config/governmentUserNav'
import { buildGovernmentUserMobileMenu } from '../config/governmentAppMenu'
import GovernmentMobileWorkspaceShell from '../components/GovernmentMobileWorkspaceShell'
import GovernmentWorkspaceBreadcrumb from '../components/GovernmentWorkspaceBreadcrumb'
import GovernmentWorkspaceChrome from '../components/GovernmentWorkspaceChrome'
import {
  GovernmentUserChromeContext,
  type GovernmentUserChromeContextValue,
} from '../context/governmentUserChromeContext'
import '../government-support.css'
import '../government-user-pc-theme.css'
import '../government-user-ops-pages.css'

export default function GovernmentUserLayout() {
  useDocumentTitle(GOVERNMENT_APP_TITLE)
  const { logout } = useAuth()
  const isMobile = useIsMobile()
  const mobileMenuItems = buildGovernmentUserMobileMenu()
  const [workspaceBreadcrumbSuffix, setWorkspaceBreadcrumbSuffix] = useState<string | null>(null)

  const chromeContextValue = useMemo<GovernmentUserChromeContextValue>(
    () => ({
      setWorkspaceBreadcrumbSuffix,
    }),
    [],
  )

  if (isMobile) {
    return (
      <main
        className={`page government-page government-user-layout government-user-layout--mobile government-user-white-theme ${isMobile ? 'government-page--mobile' : 'government-page--pc'}`}
      >
        <GovernmentMobileWorkspaceShell
          title="정부지원 CRM"
          menuItems={mobileMenuItems}
          onLogout={logout}
        >
          <div className="government-user-layout__content">
            <Outlet />
          </div>
        </GovernmentMobileWorkspaceShell>
      </main>
    )
  }

  return (
    <GovernmentUserChromeContext.Provider value={chromeContextValue}>
      <main
        className={`page government-page government-user-layout government-user-layout--insurance-shell government-user-layout--pc-user government-user-white-theme ${isMobile ? 'government-page--mobile' : 'government-page--pc'}`}
      >
        <GovernmentWorkspaceChrome
          variant="user"
          brand={GOVERNMENT_APP_TITLE}
          navItems={GOVERNMENT_USER_NAV}
          onLogout={() => logout()}
          breadcrumb={<GovernmentWorkspaceBreadcrumb workspaceSuffix={workspaceBreadcrumbSuffix} />}
        >
          <div className="government-user-pc-page">
            <Outlet />
          </div>
        </GovernmentWorkspaceChrome>
      </main>
    </GovernmentUserChromeContext.Provider>
  )
}
