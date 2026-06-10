import { Outlet } from 'react-router-dom'
import { GOVERNMENT_APP_TITLE } from '../../../config/governmentAppMeta'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import useIsMobile from '../../../hooks/useIsMobile'
import { useAuth } from '../../auth/AuthProvider'
import { GOVERNMENT_USER_NAV } from '../config/governmentUserNav'
import { buildGovernmentUserMobileMenu } from '../config/governmentAppMenu'
import GovernmentMobileWorkspaceShell from '../components/GovernmentMobileWorkspaceShell'
import GovernmentWorkspaceChrome from '../components/GovernmentWorkspaceChrome'
import '../government-support.css'

export default function GovernmentUserLayout() {
  useDocumentTitle(GOVERNMENT_APP_TITLE)
  const { logout } = useAuth()
  const isMobile = useIsMobile()
  const mobileMenuItems = buildGovernmentUserMobileMenu()

  if (isMobile) {
    return (
      <main
        className={`page government-page government-user-layout government-user-layout--mobile ${isMobile ? 'government-page--mobile' : 'government-page--pc'}`}
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
    <main
      className={`page government-page government-user-layout government-user-layout--insurance-shell ${isMobile ? 'government-page--mobile' : 'government-page--pc'}`}
    >
      <GovernmentWorkspaceChrome
        brand={GOVERNMENT_APP_TITLE}
        navItems={GOVERNMENT_USER_NAV}
        onLogout={() => logout()}
      >
        <Outlet />
      </GovernmentWorkspaceChrome>
    </main>
  )
}
