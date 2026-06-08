import { useAuth } from '../../../auth/AuthProvider'
import GovernmentEdocTab from '../../components/GovernmentEdocTab'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'

export default function GovernmentProfileEdocPanel() {
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
      <h3 className="customer-workspace-home__title">전자문서</h3>
      <p className="customer-workspace-home__desc">
        정부지원 전자문서 발송 이력을 등록·조회합니다. 보험 전자서명 모듈과 분리되어 있습니다.
      </p>
      <GovernmentEdocTab
        token={token}
        profileId={ws.selectedProfileIdFromPath}
        links={ws.edocLinks}
        onReload={ws.reloadDetail}
        onFeedback={(msg) => ws.setFeedback(msg)}
      />
      {ws.feedback ? <p className="customer-workspace-home__selected">{ws.feedback}</p> : null}
    </section>
  )
}
