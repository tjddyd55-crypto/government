import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import FormButton from '../../../components/form/FormButton'
import GovernmentHorizontalNav, { type GovernmentHorizontalNavItem } from './GovernmentHorizontalNav'

type GovernmentWorkspaceChromeProps = {
  brand: string
  navItems: GovernmentHorizontalNavItem[]
  onLogout: () => void
  workspaceLink?: { to: string; label: string } | null
  children: ReactNode
}

/** 보험 AppWorkspaceLayout + PCTopNavigation 과 동일한 상단 크롬(가로 메뉴 + 본문) */
export default function GovernmentWorkspaceChrome({
  brand,
  navItems,
  onLogout,
  workspaceLink,
  children,
}: GovernmentWorkspaceChromeProps) {
  return (
    <>
      <header className="government-workspace-chrome__header">
        <div className="government-workspace-chrome__brand-row">
          <div className="government-workspace-chrome__brand-group">
            <strong className="government-workspace-chrome__brand">{brand}</strong>
            {workspaceLink ? (
              <Link to={workspaceLink.to} className="government-workspace-chrome__workspace-link">
                {workspaceLink.label}
              </Link>
            ) : null}
          </div>
          <FormButton htmlType="button" variant="secondary" onClick={onLogout}>
            로그아웃
          </FormButton>
        </div>
        <GovernmentHorizontalNav items={navItems} className="government-workspace-chrome__nav" />
      </header>
      <div className="government-workspace-chrome__content">{children}</div>
    </>
  )
}
