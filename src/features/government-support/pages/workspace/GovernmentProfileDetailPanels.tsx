import { Link } from 'react-router-dom'
import { EmptyState } from '../../../../components/feedback'
import type { GovernmentProfileWorkspaceTab } from '../../config/governmentProfileWorkspaceTabs'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'
import GovernmentProfileMemosPanel from './GovernmentProfileMemosPanel'
import GovernmentProfileConsultationsPanel from './GovernmentProfileConsultationsPanel'
import GovernmentProfileProgressPanel from './GovernmentProfileProgressPanel'
import GovernmentProfileFilesPanel from './GovernmentProfileFilesPanel'
import GovernmentProfileApplicationsPanel from './GovernmentProfileApplicationsPanel'
import GovernmentProfileBasicInfoPanel from '../../profileBasicInfo/GovernmentProfileBasicInfoPanel'

type GovernmentProfileDetailPanelsProps = {
  tab: GovernmentProfileWorkspaceTab
}

export default function GovernmentProfileDetailPanels({ tab }: GovernmentProfileDetailPanelsProps) {
  const ws = useGovernmentProfileWorkspaceContext()
  const p = ws.selected
  if (!p) {
    return <EmptyState message="사업장을 선택해 주세요." />
  }

  if (tab === 'basic') {
    return <GovernmentProfileBasicInfoPanel />
  }

  if (tab === 'files') {
    return <GovernmentProfileFilesPanel />
  }

  if (tab === 'consultations') {
    return <GovernmentProfileConsultationsPanel />
  }

  if (tab === 'memos') {
    return <GovernmentProfileMemosPanel />
  }

  if (tab === 'progress') {
    return <GovernmentProfileProgressPanel />
  }

  if (tab === 'signatures') {
    return (
      <div>
        <p className="government-page__muted">
          전자서명 발송·내역은 전자서명 메뉴에서 이어서 처리합니다.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <Link to="/government/signatures/send" className="dark-link">
            전자서명 발송
          </Link>
          {' · '}
          <Link to="/government/signatures" className="dark-link">
            발송 내역
          </Link>
        </p>
      </div>
    )
  }

  if (tab === 'applications') {
    return <GovernmentProfileApplicationsPanel />
  }

  return <EmptyState message="준비 중입니다." />
}
