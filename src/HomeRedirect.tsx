import { Navigate } from 'react-router-dom'
import { useAuth } from './features/auth/AuthProvider'
import { resolveAuthLandingPath } from './features/auth/landing'
import useIsMobile from './hooks/useIsMobile'
import { isGovernmentProductApp } from './config/appProduct'
import { isGovernmentGaSession } from './features/government-support/lib/isGovernmentGaSession'
import GovernmentGaSessionAccessGate from './features/government-support/routes/GovernmentGaSessionAccessGate'
import { GOVERNMENT_ROUTE_PATHS } from './features/government-support/constants/governmentRouteKeys'

/**
 * 루트(`/`) 인덱스 라우트 진입 처리.
 *
 * - 비로그인: `/government/login`(정부지원 제품) 또는 `/login?required=1`
 * - 정부지원 GA 세션: `resolveGovernmentHomePath`
 * - 그 외: `resolveAuthLandingPath(isMobile, user.role)`
 */
export function PublicHomeEntry() {
  const { isAuthenticated, user, token } = useAuth()
  const isMobile = useIsMobile()
  const isGovernmentGa = isAuthenticated && isGovernmentGaSession(user)

  if (!isAuthenticated) {
    const loginPath = isGovernmentProductApp() ? '/government/login' : '/login?required=1'
    return <Navigate to={loginPath} replace />
  }

  if (isGovernmentGa) {
    return (
      <GovernmentGaSessionAccessGate token={token} loginPath={GOVERNMENT_ROUTE_PATHS.login} />
    )
  }

  return <Navigate to={resolveAuthLandingPath(isMobile, user?.role)} replace />
}
