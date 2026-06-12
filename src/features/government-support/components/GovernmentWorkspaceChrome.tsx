import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import GovernmentHorizontalNav, { type GovernmentHorizontalNavItem } from './GovernmentHorizontalNav'

type GovernmentWorkspaceChromeProps = {
  brand: string
  navItems: GovernmentHorizontalNavItem[]
  onLogout: () => void
  workspaceLink?: { to: string; label: string } | null
  /** 이용자 PC: 보험형 단일 topbar. 관리자는 legacy 2행 chrome 유지 */
  variant?: 'user' | 'admin'
  breadcrumb?: ReactNode
  children: ReactNode
}

export default function GovernmentWorkspaceChrome({
  brand,
  navItems,
  onLogout,
  workspaceLink,
  variant = 'admin',
  breadcrumb,
  children,
}: GovernmentWorkspaceChromeProps) {
  if (variant === 'user') {
    return (
      <div className="government-user-pc-shell government-workspace-chrome government-workspace-chrome--user">
        <header className="government-workspace-topbar government-workspace-chrome__topbar">
          <div className="government-workspace-topbar__brand" aria-label="브랜드">
            <strong className="government-workspace-topbar__brand-text">{brand}</strong>
          </div>
          <GovernmentHorizontalNav
            items={navItems}
            className="government-workspace-topbar__nav"
            ariaLabel="이용자 메뉴"
          />
          <div className="government-workspace-topbar__actions">
            <button type="button" className="gov-btn gov-btn--topbar" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </header>
        {breadcrumb}
        <div className="government-workspace-chrome__content">{children}</div>
      </div>
    )
  }

  return (
    <div className="government-admin-pc-shell government-workspace-chrome government-workspace-chrome--admin government-workspace-chrome--admin-shell">
      <header className="government-workspace-topbar government-workspace-chrome__topbar">
        <div className="government-workspace-topbar__brand" aria-label="브랜드">
          <strong className="government-workspace-topbar__brand-text">{brand}</strong>
        </div>
        <GovernmentHorizontalNav
          items={navItems}
          className="government-workspace-topbar__nav"
          ariaLabel="관리 메뉴"
        />
        <div className="government-workspace-topbar__actions">
          {workspaceLink ? (
            <Link to={workspaceLink.to} className="government-workspace-chrome__workspace-link--topbar">
              {workspaceLink.label}
            </Link>
          ) : null}
          <button type="button" className="gov-btn gov-btn--topbar" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>
      <div className="government-workspace-chrome__content">
        <div className="government-admin-pc-page">{children}</div>
      </div>
    </div>
  )
}
