import { createContext, useContext } from 'react'
import type { GovernmentProfileWorkspaceShell } from '../../config/governmentProfileWorkspaceShell'
import type { GovernmentProfileWorkspacePathHelpers } from '../../config/governmentProfileWorkspaceTabs'
import type { useGovernmentWorkspaceState } from '../../hooks/useGovernmentWorkspaceState'
import type { GovCustomerStatusOption, GovProfileFileCategory } from '../../types/governmentProfile.types'

export type GovernmentProfileWorkspaceContextValue = ReturnType<typeof useGovernmentWorkspaceState> & {
  shell: GovernmentProfileWorkspaceShell
  paths: GovernmentProfileWorkspacePathHelpers
  selectedProfileIdFromPath: string | null
  expandedProfileId: string | null
  onSelectProfile: (profileId: string) => void
  onToggleProfileCard: (profileId: string) => void
  filesRefreshNonce: number
  bumpFilesRefresh: () => void
  documentCategoriesVersion: number
  listProfileDocumentCategories: (profileId: string) => GovProfileFileCategory[]
  refreshProfileFileCategories: (profileId: string) => Promise<void>
  addProfileDocumentCategory: (
    profileId: string,
    name: string,
  ) => Promise<
    { ok: true; name: string; category: GovProfileFileCategory } | { ok: false; error: string }
  >
  /** null = 미분류 업로드 */
  getUploadCategoryName: (profileId: string) => string | null
  setUploadCategoryName: (profileId: string, categoryName: string | null) => void
  listSearch: string
  listCustomerStatusFilter: string
  listBusinessTypeFilter: string
  listOwnerUserFilter: string
  statusOptions: GovCustomerStatusOption[]
  ownerOptions: Array<{ id: string; label: string }>
  tenantOptions: Array<{ id: string; name: string }>
  listTenantId: string
  setListSearch: (value: string) => void
  setListCustomerStatusFilter: (value: string) => void
  setListBusinessTypeFilter: (value: string) => void
  setListOwnerUserFilter: (value: string) => void
  setListTenantId: (value: string) => void
  requestAddProfile: () => void
}

export const GovernmentProfileWorkspaceContext = createContext<GovernmentProfileWorkspaceContextValue | null>(
  null,
)

export function useGovernmentProfileWorkspaceContext(): GovernmentProfileWorkspaceContextValue {
  const ctx = useContext(GovernmentProfileWorkspaceContext)
  if (!ctx) {
    throw new Error('useGovernmentProfileWorkspaceContext must be used within GovernmentProfileWorkspaceLayout')
  }
  return ctx
}

export function useGovernmentProfileWorkspaceContextOptional(): GovernmentProfileWorkspaceContextValue | null {
  return useContext(GovernmentProfileWorkspaceContext)
}
