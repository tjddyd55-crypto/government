import GovernmentProfileWorkspaceTabsPCView from './GovernmentProfileWorkspaceTabsPCView'
import GovernmentProfileWorkspaceTabsMobileView from './GovernmentProfileWorkspaceTabsMobileView'
import type { GovernmentProfileWorkspaceTabsProps } from './governmentProfileWorkspaceTabHandlers'

export type { GovernmentProfileWorkspaceTabsProps } from './governmentProfileWorkspaceTabHandlers'

type WorkspaceTabsProps = GovernmentProfileWorkspaceTabsProps & {
  variant: 'pc' | 'mobile'
}

export default function GovernmentProfileWorkspaceTabs({ variant, ...props }: WorkspaceTabsProps) {
  if (variant === 'mobile') {
    return <GovernmentProfileWorkspaceTabsMobileView {...props} />
  }
  return <GovernmentProfileWorkspaceTabsPCView {...props} />
}
