import { useMemo } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router-dom'
import Modal from '../../../../components/ui/Modal'
import {
  GOVERNMENT_PROFILE_WORKSPACE_BASE_PATH,
  isGovernmentProfileWorkspaceSideDetailPath,
  labelForGovernmentProfileWorkspaceTab,
  parseGovernmentProfileWorkspaceTab,
} from '../../config/governmentProfileWorkspaceTabs'
import GovernmentProfileListPanelMobileView from './GovernmentProfileListPanelMobileView'
import GovernmentProfileWorkspaceTabs from './GovernmentProfileWorkspaceTabs'
import type { GovernmentProfileWorkspaceLayoutViewProps } from './governmentProfileWorkspaceViewProps'

function resolveMobileSheetTitle(pathname: string): string {
  const m = pathname.match(/^\/government\/my-applications\/[^/]+\/([^/]+)/)
  if (!m?.[1]) {
    return '상세'
  }
  return labelForGovernmentProfileWorkspaceTab(parseGovernmentProfileWorkspaceTab(m[1]))
}

export default function GovernmentProfileWorkspaceMobileView({
  selectedProfileId,
  activeTab,
  onClickBasic,
  onClickFiles,
  onClickDocuments,
  onClickEdoc,
  onClickConsultations,
  onClickMemos,
  onClickProgress,
  onClickSignatures,
  onClickApplications,
}: GovernmentProfileWorkspaceLayoutViewProps) {
  const outlet = useOutlet()
  const navigate = useNavigate()
  const location = useLocation()

  const isMobileDetailRoute = useMemo(
    () => isGovernmentProfileWorkspaceSideDetailPath(location.pathname),
    [location.pathname],
  )

  const handleClose = () => {
    navigate(GOVERNMENT_PROFILE_WORKSPACE_BASE_PATH, { replace: true })
  }

  const tabProps = {
    activeTab,
    selectedProfileId,
    onClickBasic,
    onClickFiles,
    onClickDocuments,
    onClickEdoc,
    onClickConsultations,
    onClickMemos,
    onClickProgress,
    onClickSignatures,
    onClickApplications,
  }

  return (
    <div className="government-profile-workspace government-profile-workspace--mobile government-profile-workspace-mobile">
      <GovernmentProfileListPanelMobileView />

      {isMobileDetailRoute && outlet ? (
        <Modal
          open
          onClose={handleClose}
          ariaLabel={resolveMobileSheetTitle(location.pathname)}
          panelClassName="workspace-mobile-outlet-modal government-profile-workspace-mobile-modal government-profile-mobile-detail"
        >
          <div className="workspace-mobile-outlet-modal__header government-profile-mobile-detail__header">
            <span className="workspace-mobile-outlet-modal__spacer" aria-hidden />
            <h2 className="workspace-mobile-outlet-modal__title government-profile-mobile-detail__title">
              {resolveMobileSheetTitle(location.pathname)}
            </h2>
            <button
              type="button"
              className="workspace-mobile-outlet-modal__close government-profile-mobile-detail__close"
              onClick={handleClose}
            >
              닫기
            </button>
          </div>
          <GovernmentProfileWorkspaceTabs variant="mobile" {...tabProps} />
          <div className="workspace-mobile-outlet-modal__body government-profile-mobile-detail__body">
            <div
              className={`government-profile-mobile-detail__content government-profile-mobile-detail__content--${activeTab}`}
            >
              {outlet}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
