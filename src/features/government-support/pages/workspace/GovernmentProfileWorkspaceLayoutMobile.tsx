import { useMemo } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router-dom'
import Modal from '../../../../components/ui/Modal'
import {
  GOVERNMENT_PROFILE_WORKSPACE_BASE_PATH,
  isGovernmentProfileWorkspaceSideDetailPath,
  labelForGovernmentProfileWorkspaceTab,
  parseGovernmentProfileWorkspaceTab,
} from '../../config/governmentProfileWorkspaceTabs'
import type { GovernmentProfileWorkspaceLayoutViewProps } from './governmentProfileWorkspaceViewProps'

function resolveMobileSheetTitle(pathname: string): string {
  const m = pathname.match(/^\/government\/my-applications\/[^/]+\/([^/]+)/)
  if (!m?.[1]) {
    return '상세'
  }
  return labelForGovernmentProfileWorkspaceTab(parseGovernmentProfileWorkspaceTab(m[1]))
}

export default function GovernmentProfileWorkspaceLayoutMobile(props: GovernmentProfileWorkspaceLayoutViewProps) {
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

  if (isMobileDetailRoute && outlet) {
    const title = resolveMobileSheetTitle(location.pathname)
    return (
      <Modal open onClose={handleClose} ariaLabel={title} panelClassName="workspace-mobile-outlet-modal">
        <div className="workspace-mobile-outlet-modal__header">
          <span className="workspace-mobile-outlet-modal__spacer" aria-hidden />
          <h2 className="workspace-mobile-outlet-modal__title">{title}</h2>
          <button type="button" className="workspace-mobile-outlet-modal__close" onClick={handleClose}>
            닫기
          </button>
        </div>
        <div className="workspace-mobile-outlet-modal__body">{outlet}</div>
      </Modal>
    )
  }

  return null
}
