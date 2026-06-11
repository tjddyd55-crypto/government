import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import { useDocumentTitle } from '../../../../hooks/useDocumentTitle'
import { useAuth } from '../../../auth/AuthProvider'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'
import { useGovernmentWorkspaceState } from '../../hooks/useGovernmentWorkspaceState'
import {
  governmentProfileWorkspacePath,
  parseGovernmentProfileWorkspaceTab,
} from '../../config/governmentProfileWorkspaceTabs'
import { GOVERNMENT_ROUTE_PATHS } from '../../constants/governmentRouteKeys'
import { useGovernmentUserChromeContextOptional } from '../../context/governmentUserChromeContext'
import GovernmentProfileWorkspacePCView from './GovernmentProfileWorkspacePCView'
import GovernmentProfileWorkspaceMobileView from './GovernmentProfileWorkspaceMobileView'
import {
  GovernmentProfileWorkspaceContext,
  type GovernmentProfileWorkspaceContextValue,
} from './governmentProfileWorkspaceContext'
import type { GovernmentProfileWorkspaceLayoutViewProps } from './governmentProfileWorkspaceViewProps'
import type { GovernmentProfileWorkspaceTab } from '../../config/governmentProfileWorkspaceTabs'
import '../../government-support.css'

function parseProfileIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/government\/my-applications\/([^/]+)/)
  if (!m?.[1]) {
    return null
  }
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

function resolveActiveTab(pathname: string): GovernmentProfileWorkspaceTab | null {
  const m = pathname.match(/^\/government\/my-applications\/[^/]+\/([^/]+)/)
  if (!m?.[1]) {
    return null
  }
  return parseGovernmentProfileWorkspaceTab(m[1])
}

export default function GovernmentProfileWorkspaceLayout() {
  useDocumentTitle('정부지원 CRM · 내 사업장/신청')
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()
  const { summary, reload: reloadAccess } = useGovernmentAccess(token)

  const defaultTenantId = useMemo(() => {
    if (!summary) return null
    if (summary.defaultWorkspaceTenantId) return summary.defaultWorkspaceTenantId
    if (summary.workspaceTenantIds.length > 0) return summary.workspaceTenantIds[0]
    return summary.governmentProgramUserTenantIds[0] ?? null
  }, [summary])

  const ws = useGovernmentWorkspaceState(token, defaultTenantId, {
    canCreateProfile: true,
    onProfilesChanged: () => void reloadAccess(),
  })

  const selectedProfileIdFromPath = useMemo(
    () => parseProfileIdFromPath(location.pathname),
    [location.pathname],
  )

  const activeTab = useMemo(() => resolveActiveTab(location.pathname), [location.pathname])

  const { selectedId, setSelectedId, ...wsRest } = ws

  useEffect(() => {
    if (selectedProfileIdFromPath && selectedProfileIdFromPath !== selectedId) {
      setSelectedId(selectedProfileIdFromPath)
    }
  }, [selectedProfileIdFromPath, selectedId, setSelectedId])

  const onSelectProfile = useCallback(
    (profileId: string) => {
      const tab = activeTab ?? 'basic'
      navigate(governmentProfileWorkspacePath(profileId, tab), { replace: true })
    },
    [activeTab, navigate],
  )

  const selectedProfile = useMemo(() => {
    if (selectedProfileIdFromPath) {
      return ws.profiles.find((p) => p.id === selectedProfileIdFromPath) ?? ws.selected
    }
    return ws.selected
  }, [selectedProfileIdFromPath, ws.profiles, ws.selected])

  const selectedProfileLabel = useMemo(() => {
    if (selectedProfile?.businessName?.trim()) {
      return selectedProfile.businessName.trim()
    }
    if (selectedProfile?.customerName?.trim()) {
      return selectedProfile.customerName.trim()
    }
    return selectedProfileIdFromPath ? '선택 사업장' : ''
  }, [selectedProfile, selectedProfileIdFromPath])

  const userChrome = useGovernmentUserChromeContextOptional()

  useEffect(() => {
    if (!userChrome) {
      return
    }
    userChrome.setWorkspaceBreadcrumbSuffix(
      selectedProfileIdFromPath && selectedProfileLabel ? selectedProfileLabel : null,
    )
    return () => {
      userChrome.setWorkspaceBreadcrumbSuffix(null)
    }
  }, [selectedProfileIdFromPath, selectedProfileLabel, userChrome])

  const moveToTab = useCallback(
    (tab: GovernmentProfileWorkspaceTab) => {
      if (!selectedProfileIdFromPath) {
        return
      }
      navigate(governmentProfileWorkspacePath(selectedProfileIdFromPath, tab), { replace: true })
    },
    [navigate, selectedProfileIdFromPath],
  )

  const [filesRefreshNonce, setFilesRefreshNonce] = useState(0)
  const bumpFilesRefresh = useCallback(() => {
    setFilesRefreshNonce((n) => n + 1)
  }, [])

  const contextValue = useMemo<GovernmentProfileWorkspaceContextValue>(
    () => ({
      ...wsRest,
      selectedId,
      setSelectedId,
      selectedProfileIdFromPath,
      onSelectProfile,
      filesRefreshNonce,
      bumpFilesRefresh,
    }),
    [wsRest, selectedId, setSelectedId, selectedProfileIdFromPath, onSelectProfile, filesRefreshNonce, bumpFilesRefresh],
  )

  const viewProps: GovernmentProfileWorkspaceLayoutViewProps = {
    pathname: location.pathname,
    selectedProfileId: selectedProfileIdFromPath,
    selectedProfile: selectedProfile ?? null,
    selectedProfileLabel,
    activeTab,
    onClickBasic: () => moveToTab('basic'),
    onClickFiles: () => moveToTab('files'),
    onClickDocuments: () => moveToTab('documents'),
    onClickEdoc: () => moveToTab('edoc'),
    onClickConsultations: () => moveToTab('consultations'),
    onClickMemos: () => moveToTab('memos'),
    onClickProgress: () => moveToTab('progress'),
    onClickSignatures: () => moveToTab('signatures'),
    onClickApplications: () => moveToTab('applications'),
    onClickCustomerApp: () => navigate(GOVERNMENT_ROUTE_PATHS.appRequests),
  }

  return (
    <GovernmentProfileWorkspaceContext.Provider value={contextValue}>
      <ResponsiveLayout<GovernmentProfileWorkspaceLayoutViewProps>
        PC={GovernmentProfileWorkspacePCView}
        Mobile={GovernmentProfileWorkspaceMobileView}
        viewProps={viewProps}
      />
    </GovernmentProfileWorkspaceContext.Provider>
  )
}
