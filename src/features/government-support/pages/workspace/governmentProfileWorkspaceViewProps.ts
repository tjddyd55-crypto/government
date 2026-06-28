import type { GovSupportProfile } from '../../types/governmentProfile.types'
import type { GovernmentProfileWorkspaceTab } from '../../config/governmentProfileWorkspaceTabs'

export type GovernmentProfileWorkspaceLayoutViewProps = {
  pathname: string
  workspaceBasePath: string
  selectedProfileId: string | null
  selectedProfile: GovSupportProfile | null
  selectedProfileLabel: string
  activeTab: GovernmentProfileWorkspaceTab | null
  onClickBasic: () => void
  onClickFiles: () => void
  onClickEdoc: () => void
  onClickConsultations: () => void
  onClickMemos: () => void
  onClickProgress: () => void
  onClickSignatures: () => void
  onClickApplications: () => void
  onClickCustomerApp: () => void
}
