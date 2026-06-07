import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { canManageGovernmentSignatures, resolveGovernmentHomePath } from '../lib/governmentHome'
import { useGovernmentAccess } from '../hooks/useGovernmentAccess'

/** 대행사 관리자·직원 전자서명 준비(템플릿·PDF 좌표·발송) — 업종 관리자 제외 */
export function GovernmentSignatureAdminRoute() {
  const { token, isAuthenticated } = useAuth()
  const { loading, summary } = useGovernmentAccess(token)

  if (!isAuthenticated || !token) {
    return <Navigate to="/government/login" replace />
  }
  if (loading) {
    return (
      <main className="page government-page government-page--gate">
        <p className="government-page__muted">권한을 확인하는 중…</p>
      </main>
    )
  }
  if (!canManageGovernmentSignatures(summary)) {
    return <Navigate to={resolveGovernmentHomePath(summary)} replace />
  }
  return <Outlet />
}
