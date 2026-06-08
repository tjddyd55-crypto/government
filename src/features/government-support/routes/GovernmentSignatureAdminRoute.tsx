import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { resolveGovernmentAccessState } from '../lib/governmentAccess'
import { canManageGovernmentSignatures, resolveGovernmentHomePath } from '../lib/governmentHome'
import { useGovernmentAccess } from '../hooks/useGovernmentAccess'

/** 대행사 관리자·직원 전자서명 준비(템플릿·PDF 좌표·발송) — 업종 관리자 제외 */
export function GovernmentSignatureAdminRoute() {
  const { token } = useAuth()
  const { loading, summary } = useGovernmentAccess(token)
  const hasToken = Boolean(token?.trim())
  const accessState = resolveGovernmentAccessState(summary, loading, hasToken)

  if (accessState === 'loading') {
    return (
      <main className="page government-page government-page--gate">
        <p className="government-page__muted">권한을 확인하는 중…</p>
      </main>
    )
  }

  if (accessState === 'denied') {
    if (!hasToken) {
      return <Navigate to="/government/login" replace />
    }
    return (
      <main className="page government-page government-page--gate">
        <h1 className="government-page__title">접근할 수 없습니다</h1>
        <p className="government-page__muted">government-support 멤버십 정보를 불러오지 못했습니다.</p>
      </main>
    )
  }

  if (!canManageGovernmentSignatures(summary)) {
    return <Navigate to={resolveGovernmentHomePath(summary)} replace />
  }

  return <Outlet />
}
