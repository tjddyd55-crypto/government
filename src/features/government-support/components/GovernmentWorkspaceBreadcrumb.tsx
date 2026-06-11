import { Link, useLocation } from 'react-router-dom'
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'
import { GOVERNMENT_USER_NAV } from '../config/governmentUserNav'

type Props = {
  workspaceSuffix: string | null
}

function resolveSectionLabel(pathname: string): string | null {
  if (
    pathname === GOVERNMENT_ROUTE_PATHS.myApplications ||
    pathname.startsWith(`${GOVERNMENT_ROUTE_PATHS.myApplications}/`)
  ) {
    return '내 사업장/신청'
  }

  const matched = GOVERNMENT_USER_NAV.find((item) => {
    if (item.matchPrefix) {
      return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`)
    }
    if (item.end) {
      return pathname === item.to
    }
    return pathname === item.to || pathname.startsWith(`${item.to}/`)
  })

  return matched?.label ?? null
}

/** PC 이용자 shell — topbar 아래 breadcrumb 행 */
export default function GovernmentWorkspaceBreadcrumb({ workspaceSuffix }: Props) {
  const { pathname } = useLocation()
  const sectionLabel = resolveSectionLabel(pathname)

  if (!sectionLabel) {
    return null
  }

  const onWorkspacePath =
    pathname === GOVERNMENT_ROUTE_PATHS.myApplications ||
    pathname.startsWith(`${GOVERNMENT_ROUTE_PATHS.myApplications}/`)

  return (
    <nav className="government-workspace-breadcrumb" aria-label="현재 위치">
      <ol className="government-workspace-breadcrumb__list">
        <li className="government-workspace-breadcrumb__item">
          {onWorkspacePath ? (
            <Link to={GOVERNMENT_ROUTE_PATHS.myApplications} className="government-workspace-breadcrumb__link">
              {sectionLabel}
            </Link>
          ) : (
            <span className="government-workspace-breadcrumb__text">{sectionLabel}</span>
          )}
        </li>
        {onWorkspacePath && workspaceSuffix ? (
          <li className="government-workspace-breadcrumb__item government-workspace-breadcrumb__item--current">
            <span className="government-workspace-breadcrumb__sep" aria-hidden>
              /
            </span>
            <span className="government-workspace-breadcrumb__current">{workspaceSuffix}</span>
          </li>
        ) : null}
      </ol>
    </nav>
  )
}
