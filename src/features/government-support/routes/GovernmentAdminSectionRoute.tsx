import { Navigate, Outlet } from 'react-router-dom'
import { canManageGovernmentUsers, resolveGovernmentAccessState } from '../lib/governmentAccess'
import {
  canManageGovernmentNotices,
  canManageGovernmentSignatures,
  isGovernmentOperationalAccount,
  resolveGovernmentHomePath,
} from '../lib/governmentHome'
import { useGovernmentAccessContext } from '../context/GovernmentAccessContext'
import GovernmentAdminForbiddenCard from '../components/GovernmentAdminForbiddenCard'

function GovernmentAdminGateLoading() {
  return (
    <div
      className="government-admin-gate government-admin-white-theme"
      data-testid="government-admin-page"
    >
      <div className="gov-status-loading">권한을 확인하는 중…</div>
    </div>
  )
}

function GovernmentAdminGateDenied({ message }: { message: string }) {
  return (
    <div
      className="government-admin-gate government-admin-white-theme"
      data-testid="government-admin-page"
    >
      <GovernmentAdminForbiddenCard message={message} />
    </div>
  )
}

function useAdminSectionAccess(hasToken = true) {
  const { loading, summary } = useGovernmentAccessContext()
  const accessState = resolveGovernmentAccessState(summary, loading, hasToken)
  return { loading, summary, accessState }
}

/** 업종·super 전용 (대행사 관리 등) */
export function GovernmentAdminIndustryRoute() {
  const { summary, accessState } = useAdminSectionAccess()
  if (accessState === 'loading') return <GovernmentAdminGateLoading />
  if (!summary?.isGovernmentIndustryAdmin && !summary?.isSuperAdmin) {
    return <Navigate to={resolveGovernmentHomePath(summary)} replace />
  }
  return <Outlet />
}

/** 이용자·직원 관리 */
export function GovernmentAdminUserManagerRoute() {
  const { summary, accessState } = useAdminSectionAccess()
  if (accessState === 'loading') return <GovernmentAdminGateLoading />
  if (!canManageGovernmentUsers(summary)) {
    return <Navigate to={resolveGovernmentHomePath(summary)} replace />
  }
  return <Outlet />
}

/** 대행사 운영(공지·요청서류·문의 등) */
export function GovernmentAdminOperationalRoute() {
  const { summary, accessState } = useAdminSectionAccess()
  if (accessState === 'loading') return <GovernmentAdminGateLoading />
  if (!isGovernmentOperationalAccount(summary)) {
    return <Navigate to={resolveGovernmentHomePath(summary)} replace />
  }
  return <Outlet />
}

/** 공지·자료 — 업종 관리자(global) + 대행사 관리자·직원 */
export function GovernmentAdminNoticesRoute() {
  const { summary, accessState } = useAdminSectionAccess()
  if (accessState === 'loading') return <GovernmentAdminGateLoading />
  if (!canManageGovernmentNotices(summary)) {
    return (
      <GovernmentAdminGateDenied message="공지·자료 관리는 운영 관리자·대행사 관리자·직원만 이용할 수 있습니다." />
    )
  }
  return <Outlet />
}

/** 전자서명 템플릿·PDF 좌표 — 업종·super·대행사 관리자·직원 */
export function GovernmentAdminSignatureRoute() {
  const { summary, accessState } = useAdminSectionAccess()
  if (accessState === 'loading') return <GovernmentAdminGateLoading />
  if (!canManageGovernmentSignatures(summary)) {
    return (
      <GovernmentAdminGateDenied message="전자서명 관리는 운영 관리자·대행사 관리자·직원만 이용할 수 있습니다." />
    )
  }
  return <Outlet />
}
