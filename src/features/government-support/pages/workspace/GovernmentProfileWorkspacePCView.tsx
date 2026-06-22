import { Outlet } from 'react-router-dom'
import { EmptyState } from '../../../../components/feedback'
import { useAuth } from '../../../auth/AuthProvider'
import { createGovernmentProfileWorkspacePathHelpers } from '../../config/governmentProfileWorkspaceTabs'
import GovernmentProfileListPanelPCView from './GovernmentProfileListPanelPCView'
import GovernmentProfileWorkspaceHeader from './GovernmentProfileWorkspaceHeader'
import GovernmentProfileWorkspaceTabs from './GovernmentProfileWorkspaceTabs'
import GovernmentProfileWorkspaceRightDocumentsPanel from './GovernmentProfileWorkspaceRightDocumentsPanel'
import type { GovernmentProfileWorkspaceLayoutViewProps } from './governmentProfileWorkspaceViewProps'

export default function GovernmentProfileWorkspacePCView({
  pathname,
  workspaceBasePath,
  selectedProfileId,
  selectedProfile,
  selectedProfileLabel,
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
  onClickCustomerApp,
}: GovernmentProfileWorkspaceLayoutViewProps) {
  const { token } = useAuth()
  const paths = createGovernmentProfileWorkspacePathHelpers(workspaceBasePath)
  const isIndexPath = paths.isIndexPath(pathname)

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
    <div
      className="government-profile-workspace government-profile-workspace--pc government-profile-workspace-pc government-profile-workspace--full-width"
      data-layout="pc-three-column"
    >
      <aside className="government-profile-workspace-pc__left" aria-label="사업장 목록">
        <GovernmentProfileListPanelPCView />
      </aside>

      <section className="government-profile-workspace-pc__center" aria-label="사업장 상세">
        <GovernmentProfileWorkspaceHeader
          variant="pc"
          selectedProfileId={selectedProfileId}
          selectedProfile={selectedProfile}
          selectedProfileLabel={selectedProfileLabel}
          onClickCustomerApp={onClickCustomerApp}
        />
        <GovernmentProfileWorkspaceTabs variant="pc" {...tabProps} />
        <div className="government-profile-workspace-pc__body">
          {selectedProfileId || isIndexPath ? (
            <Outlet key={selectedProfileId ?? 'profile-index'} context={{ selectedProfileId }} />
          ) : (
            <EmptyState message="사업장을 선택해 주세요." />
          )}
        </div>
      </section>

      <aside className="government-profile-workspace-pc__right" aria-label="문서 관리">
        {selectedProfileId && token?.trim() ? (
          <GovernmentProfileWorkspaceRightDocumentsPanel token={token} profileId={selectedProfileId} />
        ) : (
          <div className="government-profile-workspace-right-documents-panel government-profile-workspace-right-documents-panel--empty">
            <p className="government-profile-workspace-right-documents-panel__empty">
              사업장을 선택하면 문서를 관리할 수 있습니다.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
