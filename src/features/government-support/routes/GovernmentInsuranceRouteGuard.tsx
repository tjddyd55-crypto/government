import { useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { isGovernmentGaSession } from '../lib/isGovernmentGaSession'
import GovernmentGaSessionAccessGate from './GovernmentGaSessionAccessGate'

type GovernmentInsuranceRouteGuardProps = {
  children: React.ReactNode
}

/**
 * 보험 AppWorkspaceLayout 진입 차단 — GOVERNMENT_CRM GA 세션은 /government/* 로 보낸다.
 */
export default function GovernmentInsuranceRouteGuard({ children }: GovernmentInsuranceRouteGuardProps) {
  const { isAuthenticated, user, token } = useAuth()
  const location = useLocation()
  const isGovernmentGa = isAuthenticated && isGovernmentGaSession(user)

  if (location.pathname.startsWith('/government')) {
    return children
  }

  if (!isGovernmentGa) {
    return children
  }

  return <GovernmentGaSessionAccessGate token={token} />
}
