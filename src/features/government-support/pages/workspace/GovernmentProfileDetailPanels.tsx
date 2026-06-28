import { EmptyState } from '../../../../components/feedback'
import type { GovernmentProfileWorkspaceTab } from '../../config/governmentProfileWorkspaceTabs'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'
import GovernmentProfileMemosPanel from './GovernmentProfileMemosPanel'
import GovernmentProfileConsultationsPanel from './GovernmentProfileConsultationsPanel'
import GovernmentProfileProgressPanel from './GovernmentProfileProgressPanel'
import GovernmentProfileFilesPanel from './GovernmentProfileFilesPanel'
import GovernmentProfileEdocPanel from './GovernmentProfileEdocPanel'
import GovernmentProfileApplicationsPanel from './GovernmentProfileApplicationsPanel'
import GovernmentProfileSignaturesPanel from './GovernmentProfileSignaturesPanel'
import GovernmentProfileBasicInfoPanel from '../../profileBasicInfo/GovernmentProfileBasicInfoPanel'
import GovernmentProfileCreatePanel from '../../profileBasicInfo/GovernmentProfileCreatePanel'

type GovernmentProfileDetailPanelsProps = {
  tab: GovernmentProfileWorkspaceTab
}

export default function GovernmentProfileDetailPanels({ tab }: GovernmentProfileDetailPanelsProps) {
  const ws = useGovernmentProfileWorkspaceContext()

  if (ws.isCreatingProfile) {
    if (tab === 'basic') {
      return <GovernmentProfileCreatePanel />
    }
    return <EmptyState message="신규 사업장은 기본정보 탭에서 등록할 수 있습니다." />
  }

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

  if (tab === 'edoc') {
    return <GovernmentProfileEdocPanel />
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
    return <GovernmentProfileSignaturesPanel />
  }

  if (tab === 'applications') {
    return <GovernmentProfileApplicationsPanel />
  }

  return <EmptyState message="표시할 내용이 없습니다." />
}
