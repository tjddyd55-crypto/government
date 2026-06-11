import { type ReactNode, useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate, useMatch } from 'react-router-dom'
import FormButton from '../../../../components/form/FormButton'
import { useAuth } from '../../../auth/AuthProvider'
import { GOVERNMENT_ROUTE_PATHS } from '../../constants/governmentRouteKeys'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'
import '../../../customer-app/customer-app.css'

type Props = {
  children: ReactNode
  title?: string
}

const TABS = [
  {
    to: GOVERNMENT_ROUTE_PATHS.appRequests,
    label: '요청서류',
    match: (p: string) => p.startsWith(GOVERNMENT_ROUTE_PATHS.appRequests),
  },
  {
    to: GOVERNMENT_ROUTE_PATHS.appProgress,
    label: '진행상황',
    match: (p: string) => p.startsWith(GOVERNMENT_ROUTE_PATHS.appProgress),
  },
  {
    to: GOVERNMENT_ROUTE_PATHS.appInquiries,
    label: '문의',
    match: (p: string) => p.startsWith(GOVERNMENT_ROUTE_PATHS.appInquiries),
  },
  {
    to: GOVERNMENT_ROUTE_PATHS.appSignatures,
    label: '전자서명',
    match: (p: string) => p.startsWith(GOVERNMENT_ROUTE_PATHS.appSignatures),
  },
] as const

export default function GovernmentCustomerAppShell({ children, title = '정부지원 고객앱' }: Props) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const hideInquiryCta = Boolean(useMatch(GOVERNMENT_ROUTE_PATHS.appInquiriesNew))
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
              onClick={() => navigate(GOVERNMENT_ROUTE_PATHS.myApplications)}
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
                onClick={() => navigate(GOVERNMENT_ROUTE_PATHS.appInquiriesNew)}
              >
                문의하기
              </FormButton>
            </div>
          ) : null}
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
