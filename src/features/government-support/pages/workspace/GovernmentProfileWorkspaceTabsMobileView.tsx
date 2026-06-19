import { GOVERNMENT_PROFILE_WORKSPACE_TABS } from '../../config/governmentProfileWorkspaceTabs'
import { tabHandlerForId, type GovernmentProfileWorkspaceTabsProps } from './governmentProfileWorkspaceTabHandlers'

export default function GovernmentProfileWorkspaceTabsMobileView(props: GovernmentProfileWorkspaceTabsProps) {
  const { activeTab, selectedProfileId } = props
  const disabled = !selectedProfileId

  return (
    <nav
      className="government-profile-workspace-tabs government-profile-workspace-tabs--mobile government-profile-mobile-detail__tabs"
      aria-label="사업장 작업 탭"
    >
      <div className="government-profile-workspace-tabs__scroll" role="tablist">
        {GOVERNMENT_PROFILE_WORKSPACE_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`government-profile-workspace-tabs__item government-profile-mobile-detail__tab${isActive ? ' government-profile-workspace-tabs__item--active government-profile-mobile-detail__tab--active' : ''}`}
              disabled={disabled}
              onClick={tabHandlerForId(tab.id, props)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
