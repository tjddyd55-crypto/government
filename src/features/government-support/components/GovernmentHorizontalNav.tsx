import { NavLink, useLocation } from 'react-router-dom'

export type GovernmentHorizontalNavItem = {
  to: string
  label: string
  end?: boolean
  matchPrefix?: string
}

function isNavItemActive(pathname: string, item: GovernmentHorizontalNavItem): boolean {
  if (item.matchPrefix) {
    return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`)
  }
  if (item.end) {
    return pathname === item.to
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

type GovernmentHorizontalNavProps = {
  items: GovernmentHorizontalNavItem[]
  className?: string
  ariaLabel?: string
}

/** 보험 PC 상단 네비(pc-top-navigation__item)와 동일한 가로 탭 패턴 */
export default function GovernmentHorizontalNav({
  items,
  className,
  ariaLabel = '메뉴',
}: GovernmentHorizontalNavProps) {
  const { pathname } = useLocation()

  return (
    <nav className={['government-horizontal-nav', className].filter(Boolean).join(' ')} aria-label={ariaLabel}>
      <div className="government-horizontal-nav__items">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`government-horizontal-nav__item${active ? ' government-horizontal-nav__item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="government-horizontal-nav__item-label">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
