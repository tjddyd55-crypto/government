import { Navigate, useParams } from 'react-router-dom'
import useIsMobile from '../../../../hooks/useIsMobile'
import { parseGovernmentProfileWorkspaceTab } from '../../config/governmentProfileWorkspaceTabs'
import { isGovernmentProfileCreateSegment } from '../../lib/governmentProfileCreateFlow'
import GovernmentProfileDetailPanels from './GovernmentProfileDetailPanels'

export default function GovernmentProfileWorkspaceTabPage() {
  const { profileId, tab: rawTab } = useParams<{ profileId: string; tab: string }>()
  const legacySegment = String(rawTab ?? '').trim().toLowerCase()
  if (profileId && legacySegment === 'documents') {
    return <Navigate to="../files" replace relative="path" />
  }
  if (profileId && isGovernmentProfileCreateSegment(profileId)) {
    const createTab = parseGovernmentProfileWorkspaceTab(rawTab)
    if (createTab !== 'basic') {
      return <Navigate to="../basic" replace relative="path" />
    }
  }
  const tab = parseGovernmentProfileWorkspaceTab(rawTab)
  const isMobile = useIsMobile()
  const panels = <GovernmentProfileDetailPanels tab={tab} />

  if (!isMobile) {
    return panels
  }

  return (
    <div
      className={`government-profile-mobile-detail__section government-profile-mobile-detail__section--${tab}`}
      data-government-profile-tab={tab}
    >
      {panels}
    </div>
  )
}
