import { type ReactNode, useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate, useMatch } from 'react-router-dom'
import FormButton from '../../../../components/form/FormButton'
import { useAuth } from '../../../auth/AuthProvider'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'
import '../../../customer-app/customer-app.css'

type Props = {
  children: ReactNode
  title?: string
}

const TABS = [
  { to: '/government/app/requests', label: '요청서류', match: (p: string) => p.startsWith('/government/app/requests') },
  { to: '/government/app/progress', label: '진행상황', match: (p: string) => p.startsWith('/government/app/progress') },
  { to: '/government/app/inquiries', label: '문의', match: (p: string) => p.startsWith('/government/app/inquiries') },
  { to: '/government/app/signatures', label: '전자서명', match: (p: string) => p.startsWith('/government/app/signatures') },
] as const

export default function GovernmentCustomerAppShell({ children, title = '정부지원 고객앱' }: Props) {
  const navigate = useNavigate()
  const hideInquiryCta = Boolean(useMatch('/government/app/inquiries/new'))
  const { token } = useAuth()
  const { summary } = useGovernmentAccess(token)
  const [headerName, setHeaderName] = useState('정부지원 CRM')

  useEffect(() => {
    if (summary?.programUserTenantName?.trim()) {
      setHeaderName(summary.programUserTenantName.trim())
    }
  }, [summary])

  return (
    <div className={`customer-app-shell${hideInquiryCta ? ' customer-app-shell--no-cta' : ''}`}>
      <header className="customer-app-header">
        <div className="customer-app-header__row">
          <div className="customer-app-header__identity">
            <span className="customer-app-header__name">{headerName}</span>
            <span className="customer-app-header__sep" aria-hidden>
              {' '}
              ·{' '}
            </span>
            <span className="customer-app-header__phone-line">요청서류 · 진행 · 문의 · 전자서명</span>
          </div>
          <div className="customer-app-header__actions">
            <button
              type="button"
              className="customer-app-header__action-btn customer-app-header__action-btn--close"
              onClick={() => navigate('/government/my-applications')}
            >
              닫기
            </button>
          </div>
        </div>
      </header>

      <main className="customer-app-main" aria-label={title}>
        {children}
      </main>

      <div className="customer-app-shell__bottom">
        <div className="customer-app-shell__bottom-inner">
          {!hideInquiryCta ? (
            <div className="customer-app-shell__cta-wrap">
              <FormButton
                htmlType="button"
                variant="primary"
                className="customer-app-shell__cta-button"
                fullWidth
                onClick={() => navigate('/government/app/inquiries/new')}
              >
                문의하기
              </FormButton>
            </div>
          ) : null}
          <nav className="customer-app-tabbar" aria-label="고객앱 주요 메뉴">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) => `customer-app-tabbar__item${isActive ? ' is-active' : ''}`}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}

export function GovernmentCustomerAppBottomNavOnly() {
  const { pathname } = useLocation()
  return (
    <nav className="customer-app-tabbar" aria-label="고객앱 주요 메뉴">
      {TABS.map((tab) => {
        const active = tab.match(pathname)
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`customer-app-tabbar__item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
