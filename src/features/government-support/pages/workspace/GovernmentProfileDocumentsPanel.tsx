import { useAuth } from '../../../auth/AuthProvider'
import GovernmentDocumentsTab from '../../components/GovernmentDocumentsTab'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'

export default function GovernmentProfileDocumentsPanel() {
  const { token } = useAuth()
  const ws = useGovernmentProfileWorkspaceContext()

  if (!ws.selectedProfileIdFromPath) {
    return <p className="government-page__muted">사업장을 먼저 선택해 주세요.</p>
  }

  if (!token?.trim()) {
    return <p className="government-page__muted">로그인이 필요합니다.</p>
  }

  return (
    <section className="customer-workspace-home">
      <h3 className="customer-workspace-home__title">서류관리</h3>
      <p className="customer-workspace-home__desc">
        필수 서류 체크리스트 상태를 관리하고 정부지원 전용 R2 경로에 업로드합니다.
      </p>
      <GovernmentDocumentsTab
        token={token}
        documents={ws.documents}
        onReload={ws.reloadDetail}
        onFeedback={(msg) => ws.setFeedback(msg)}
      />
      {ws.feedback ? <p className="customer-workspace-home__selected">{ws.feedback}</p> : null}
    </section>
  )
}
