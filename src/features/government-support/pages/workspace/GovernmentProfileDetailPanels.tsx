import { EmptyState } from '../../../../components/feedback'
import type { GovernmentProfileWorkspaceTab } from '../../config/governmentProfileWorkspaceTabs'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'
import GovernmentProfileMemosPanel from './GovernmentProfileMemosPanel'
import GovernmentProfileConsultationsPanel from './GovernmentProfileConsultationsPanel'
import GovernmentProfileProgressPanel from './GovernmentProfileProgressPanel'
import GovernmentProfileFilesPanel from './GovernmentProfileFilesPanel'
import GovernmentProfileDocumentsPanel from './GovernmentProfileDocumentsPanel'
import GovernmentProfileEdocPanel from './GovernmentProfileEdocPanel'
import GovernmentProfileApplicationsPanel from './GovernmentProfileApplicationsPanel'
import GovernmentProfileSignaturesPanel from './GovernmentProfileSignaturesPanel'
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

  if (tab === 'documents') {
    return <GovernmentProfileDocumentsPanel />
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
