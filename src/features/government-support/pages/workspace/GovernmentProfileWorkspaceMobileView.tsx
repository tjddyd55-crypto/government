import { useMemo } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router-dom'
import Modal from '../../../../components/ui/Modal'
import {
  createGovernmentProfileWorkspacePathHelpers,
  labelForGovernmentProfileWorkspaceTab,
  parseGovernmentProfileWorkspaceTab,
} from '../../config/governmentProfileWorkspaceTabs'
import { isGovernmentProfileCreateSegment } from '../../lib/governmentProfileCreateFlow'
import GovernmentProfileListPanelMobileView from './GovernmentProfileListPanelMobileView'
import GovernmentProfileWorkspaceTabs from './GovernmentProfileWorkspaceTabs'
import { useGovernmentProfileWorkspaceContextOptional } from './governmentProfileWorkspaceContext'
import type { GovernmentProfileWorkspaceLayoutViewProps } from './governmentProfileWorkspaceViewProps'

function resolveMobileSheetTitle(pathname: string, basePath: string): string {
  const paths = createGovernmentProfileWorkspacePathHelpers(basePath)
  const tab = paths.resolveActiveTab(pathname)
  if (!tab) {
    return '상세'
  }
  return labelForGovernmentProfileWorkspaceTab(tab)
}

export default function GovernmentProfileWorkspaceMobileView({
  workspaceBasePath,
  selectedProfileId,
  isCreatingProfile,
  activeTab,
  onClickBasic,
  onClickFiles,
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
  const workspaceCtx = useGovernmentProfileWorkspaceContextOptional()
  const paths = useMemo(
    () => createGovernmentProfileWorkspacePathHelpers(workspaceBasePath),
    [workspaceBasePath],
  )

  const isMobileDetailRoute = useMemo(
    () => paths.isSideDetailPath(location.pathname),
    [location.pathname, paths],
  )

  const handleClose = () => {
    if (isCreatingProfile || isGovernmentProfileCreateSegment(selectedProfileId)) {
      workspaceCtx?.cancelProfileCreate()
      return
    }
    navigate(workspaceBasePath, { replace: true })
  }

  const tabProps = {
    activeTab,
    selectedProfileId,
    onClickBasic,
    onClickFiles,
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
          ariaLabel={resolveMobileSheetTitle(location.pathname, workspaceBasePath)}
          panelClassName="workspace-mobile-outlet-modal government-profile-workspace-mobile-modal government-profile-mobile-detail"
        >
          <div className="workspace-mobile-outlet-modal__header government-profile-mobile-detail__header">
            <span className="workspace-mobile-outlet-modal__spacer" aria-hidden />
            <h2 className="workspace-mobile-outlet-modal__title government-profile-mobile-detail__title">
              {resolveMobileSheetTitle(location.pathname, workspaceBasePath)}
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
