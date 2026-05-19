import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { canManageGovernmentUsers, resolveGovernmentAccessState } from '../lib/governmentAccess'
import { useGovernmentAccess } from '../hooks/useGovernmentAccess'

type GovernmentProtectedRouteProps = {
  requireAdmin?: boolean
  /** 업종 관리자·super·대행사 관리자(사용자 관리 전용) */
  requireUserManager?: boolean
}

/**
 * government-support 인증·멤버십 게이트 (플랫폼 /admin/platform 과 분리).
 */
export default function GovernmentProtectedRoute({
  requireAdmin = false,
  requireUserManager = false,
}: GovernmentProtectedRouteProps) {
  const { token, isAuthenticated } = useAuth()
  const { loading, summary } = useGovernmentAccess(token)
  const state = resolveGovernmentAccessState(summary, loading, Boolean(isAuthenticated && token))

  if (!isAuthenticated || !token) {
    return <Navigate to="/government/login" replace />
  }
  if (state === 'loading') {
    return (
      <main className="page government-page government-page--gate">
        <p className="government-page__muted">권한을 확인하는 중…</p>
      </main>
    )
  }
  if (
    !summary?.isGovernmentTenantMember &&
    !summary?.isGovernmentIndustryAdmin &&
    !summary?.isSuperAdmin
  ) {
    return (
      <main className="page government-page government-page--gate">
        <h1 className="government-page__title">접근할 수 없습니다</h1>
        <p className="government-page__muted">
          government-support 업종 멤버십이 필요합니다. 관리자에게 문의하세요.
        </p>
      </main>
    )
  }
  if (requireAdmin && !summary?.isGovernmentIndustryAdmin && !summary?.isSuperAdmin) {
    return <Navigate to="/government/workspace" replace />
  }
  if (requireUserManager && !canManageGovernmentUsers(summary)) {
    return <Navigate to="/government/workspace" replace />
  }
  return <Outlet />
}
