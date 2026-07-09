import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import FormButton from '../../../components/form/FormButton'
import { useAuth } from '../../auth/AuthProvider'
import { useGovernmentAccess } from '../hooks/useGovernmentAccess'
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'
import { resolveGovernmentHomePath } from '../lib/governmentHome'
import {
  governmentGaAccessGateErrorMessage,
  resolveGovernmentGaAccessGatePhase,
} from '../lib/governmentGaSessionAccessGate'

type GovernmentGaSessionAccessGateProps = {
  token: string | null
  loginPath?: string
}

/**
 * GOVERNMENT_CRM GA 세션의 me/access 확인 — loading / error / denied / redirect 분기.
 * HomeRedirect · GovernmentInsuranceRouteGuard 공용.
 */
export default function GovernmentGaSessionAccessGate({
  token,
  loginPath = GOVERNMENT_ROUTE_PATHS.login,
}: GovernmentGaSessionAccessGateProps) {
  const { logout } = useAuth()
  const trimmedToken = typeof token === 'string' ? token.trim() : ''
  const { loading, error, summary, reload } = useGovernmentAccess(trimmedToken || null)

  const phase = resolveGovernmentGaAccessGatePhase({
    loading,
    error,
    summary,
    hasToken: Boolean(trimmedToken),
  })

  useEffect(() => {
    if (phase !== 'auth_redirect') {
      return
    }
    logout()
  }, [logout, phase])

  if (phase === 'loading') {
    return (
      <main className="page government-page government-page--gate">
        <p className="government-page__muted">권한을 확인하는 중…</p>
      </main>
    )
  }

  if (phase === 'auth_redirect') {
    return <Navigate to={loginPath} replace />
  }

  if (phase === 'error') {
    return (
      <main className="page government-page government-page--gate">
        <h1 className="government-page__title">권한 확인 실패</h1>
        <p className="government-page__muted">{governmentGaAccessGateErrorMessage(error)}</p>
        <div className="government-page__gate-actions">
          <FormButton htmlType="button" variant="secondary" onClick={() => void reload()}>
            다시 시도
          </FormButton>
        </div>
      </main>
    )
  }

  if (phase === 'denied') {
    const deniedMessage =
      error instanceof ApiError && error.status === 403
        ? '접근 권한이 없습니다.'
        : 'government-support 업종 멤버십이 필요합니다. 관리자에게 문의하세요.'
    return (
      <main className="page government-page government-page--gate">
        <h1 className="government-page__title">접근할 수 없습니다</h1>
        <p className="government-page__muted">{deniedMessage}</p>
      </main>
    )
  }

  if (phase === 'redirect' && summary) {
    return <Navigate to={resolveGovernmentHomePath(summary)} replace />
  }

  return (
    <main className="page government-page government-page--gate">
      <h1 className="government-page__title">권한 확인 실패</h1>
      <p className="government-page__muted">권한 확인에 실패했습니다. 다시 시도해 주세요.</p>
      <div className="government-page__gate-actions">
        <FormButton htmlType="button" variant="secondary" onClick={() => void reload()}>
          다시 시도
        </FormButton>
      </div>
    </main>
  )
}
