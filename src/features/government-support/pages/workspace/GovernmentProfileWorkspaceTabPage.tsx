import { useParams } from 'react-router-dom'
import useIsMobile from '../../../../hooks/useIsMobile'
import { parseGovernmentProfileWorkspaceTab } from '../../config/governmentProfileWorkspaceTabs'
import GovernmentProfileDetailPanels from './GovernmentProfileDetailPanels'

export default function GovernmentProfileWorkspaceTabPage() {
  const { tab: rawTab } = useParams<{ profileId: string; tab: string }>()
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
