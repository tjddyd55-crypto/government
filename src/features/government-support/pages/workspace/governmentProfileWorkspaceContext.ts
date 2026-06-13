import { createContext, useContext } from 'react'
import type { useGovernmentWorkspaceState } from '../../hooks/useGovernmentWorkspaceState'
import type { GovProfileFileCategory } from '../../types/governmentProfile.types'

export type GovernmentProfileWorkspaceContextValue = ReturnType<typeof useGovernmentWorkspaceState> & {
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
