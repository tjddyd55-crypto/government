import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FormButton } from '../../../../components/form'
import { useDocumentTitle } from '../../../../hooks/useDocumentTitle'
import { useAuth } from '../../../auth/AuthProvider'
import {
  buildGovernmentUserHomeMenu,
  isGovernmentMobileMenuPathActive,
} from '../../config/governmentAppMenu'
import type { GaTenantDashboardMenuEntry } from '../../../dashboard/gaTenantMenu'

export default function GovernmentUserHomePage() {
  useDocumentTitle('정부지원 CRM · 홈')
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const displayName = user?.displayName?.trim() || user?.username || '이용자'

  const menuItems = useMemo(() => buildGovernmentUserHomeMenu(), [])

  return (
    <main className="page dashboard-page--centered government-user-home-page">
      <div className="dashboard-menu-shell">
        <header className="page-header dashboard-page__header">
          <h1>안녕하세요, {displayName}님</h1>
          <p className="government-page__muted government-user-home-page__lede">
            사업장 등록·신청 관리·공지·자료를 이용자 메뉴에서 이용할 수 있습니다.
          </p>
        </header>

        <section className="dashboard-menu-card">
          <h2 className="dashboard-section-title visually-hidden">이용자 메뉴</h2>
          <nav className="menu-card" aria-label="이용자 메뉴">
            {menuItems.map((entry, idx) => renderMenuEntry(entry, idx, location.pathname, navigate))}
          </nav>
        </section>
      </div>
    </main>
  )
}

function renderMenuEntry(
  entry: GaTenantDashboardMenuEntry,
  idx: number,
  pathname: string,
  navigate: ReturnType<typeof useNavigate>,
) {
  if (entry.type === 'divider') {
    return (
      <div
        key={`gov-home-divider-${idx}`}
        className="menu-card__divider my-3 border-t border-[var(--border-default)]"
        role="presentation"
      />
    )
  }
  if (entry.type === 'section') {
    return (
      <div key={`gov-home-section-${idx}`} className="menu-card__section" role="presentation">
        {entry.label}
      </div>
    )
  }
  const isActive =
    Boolean(entry.path) && entry.path !== '#' && isGovernmentMobileMenuPathActive(pathname, entry.path)
  return (
    <FormButton
      key={`${entry.path}-${entry.label}-${idx}`}
      htmlType="button"
      variant="action"
      className={`menu-item${isActive ? ' active' : ''}`}
      onClick={() => {
        if (!entry.path.trim() || entry.path === '#') return
        navigate(entry.path)
      }}
    >
      <span className="menu-item__label">{entry.label}</span>
    </FormButton>
  )
}
