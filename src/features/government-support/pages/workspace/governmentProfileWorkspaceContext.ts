import { createContext, useContext } from 'react'
import type { useGovernmentWorkspaceState } from '../../hooks/useGovernmentWorkspaceState'

export type GovernmentProfileWorkspaceContextValue = ReturnType<typeof useGovernmentWorkspaceState> & {
  selectedProfileIdFromPath: string | null
  expandedProfileId: string | null
  onSelectProfile: (profileId: string) => void
  onToggleProfileCard: (profileId: string) => void
  filesRefreshNonce: number
  bumpFilesRefresh: () => void
  documentCategoriesVersion: number
  listProfileDocumentCategories: (profileId: string) => string[]
  addProfileDocumentCategory: (
    profileId: string,
    name: string,
  ) => { ok: true; name: string } | { ok: false; error: string }
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
