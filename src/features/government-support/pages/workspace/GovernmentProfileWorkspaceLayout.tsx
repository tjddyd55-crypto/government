import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
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
import {
  createGovProfileFileCategory,
  fetchGovProfileFileCategories,
} from '../../api/governmentProfileFileCategoriesApi'
import {
  isGovProfileCardCollapsed,
  isSameGovProfileId,
  normalizeGovProfileId,
  setGovProfileCardCollapsed,
} from '../../lib/governmentProfileDocumentCategories'
import type { GovProfileFileCategory } from '../../types/governmentProfile.types'
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

  const prevPathProfileIdRef = useRef<string | null | undefined>(undefined)
  const expandedProfileIdRef = useRef<string | null>(null)
  const [expandedProfileId, setExpandedProfileIdRaw] = useState<string | null>(() => {
    if (!selectedProfileIdFromPath) return null
    return isGovProfileCardCollapsed(selectedProfileIdFromPath) ? null : selectedProfileIdFromPath
  })

  const setExpandedProfileId = useCallback((updater: SetStateAction<string | null>) => {
    setExpandedProfileIdRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      expandedProfileIdRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    expandedProfileIdRef.current = expandedProfileId
  }, [expandedProfileId])

  useEffect(() => {
    const pathId = normalizeGovProfileId(selectedProfileIdFromPath)
    if (prevPathProfileIdRef.current === undefined) {
      prevPathProfileIdRef.current = pathId || null
      if (pathId && !isGovProfileCardCollapsed(pathId)) {
        setExpandedProfileId(pathId)
      }
      return
    }
    const prevPathId = normalizeGovProfileId(prevPathProfileIdRef.current)
    if (isSameGovProfileId(pathId, prevPathId)) {
      return
    }
    prevPathProfileIdRef.current = pathId || null
    if (!pathId) {
      setExpandedProfileId(null)
      return
    }
    if (isGovProfileCardCollapsed(pathId)) {
      setExpandedProfileId(null)
      return
    }
    setExpandedProfileId(pathId)
  }, [selectedProfileIdFromPath, setExpandedProfileId])

  const onToggleProfileCard = useCallback(
    (profileId: string) => {
      const normalizedId = normalizeGovProfileId(profileId)
      if (!normalizedId) return

      const pathId = normalizeGovProfileId(selectedProfileIdFromPath)
      if (isSameGovProfileId(normalizedId, pathId)) {
        const prev = expandedProfileIdRef.current
        const next = isSameGovProfileId(prev, normalizedId) ? null : normalizedId
        setGovProfileCardCollapsed(normalizedId, next === null)
        setExpandedProfileId(next)
        return
      }

      setGovProfileCardCollapsed(normalizedId, false)
      const tab = activeTab ?? 'basic'
      setExpandedProfileId(normalizedId)
      navigate(governmentProfileWorkspacePath(normalizedId, tab), { replace: true })
    },
    [activeTab, navigate, selectedProfileIdFromPath, setExpandedProfileId],
  )

  const onSelectProfile = useCallback(
    (profileId: string) => {
      onToggleProfileCard(profileId)
    },
    [onToggleProfileCard],
  )

  const selectedProfile = useMemo(() => {
    if (selectedProfileIdFromPath) {
      return (
        ws.profiles.find((p) => isSameGovProfileId(p.id, selectedProfileIdFromPath)) ?? ws.selected
      )
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

  const [documentCategoriesVersion, setDocumentCategoriesVersion] = useState(0)
  const [profileFileCategoriesById, setProfileFileCategoriesById] = useState<
    Record<string, GovProfileFileCategory[]>
  >({})

  const refreshProfileFileCategories = useCallback(
    async (profileId: string) => {
      const id = String(profileId ?? '').trim()
      if (!token?.trim() || !id) {
        return
      }
      const rows = await fetchGovProfileFileCategories(token, id)
      setProfileFileCategoriesById((prev) => ({ ...prev, [id]: rows }))
      setDocumentCategoriesVersion((n) => n + 1)
    },
    [token],
  )

  const listProfileDocumentCategories = useCallback(
    (profileId: string) => profileFileCategoriesById[String(profileId ?? '').trim()] ?? [],
    [profileFileCategoriesById],
  )

  const addProfileDocumentCategory = useCallback(
    async (profileId: string, name: string) => {
      const id = String(profileId ?? '').trim()
      if (!token?.trim() || !id) {
        return { ok: false as const, error: '문서 분류를 추가할 수 없습니다.' }
      }
      try {
        const category = await createGovProfileFileCategory(token, id, name)
        await refreshProfileFileCategories(id)
        return { ok: true as const, name: category.name, category }
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : '문서 분류 추가에 실패했습니다.',
        }
      }
    },
    [refreshProfileFileCategories, token],
  )

  useEffect(() => {
    if (selectedProfileIdFromPath && token?.trim()) {
      void refreshProfileFileCategories(selectedProfileIdFromPath)
    }
  }, [selectedProfileIdFromPath, token, refreshProfileFileCategories])

  const [uploadCategoryByProfileId, setUploadCategoryByProfileId] = useState<Record<string, string | null>>({})

  const getUploadCategoryName = useCallback(
    (profileId: string) => {
      const id = normalizeGovProfileId(profileId)
      if (!id) return null
      return uploadCategoryByProfileId[id] ?? null
    },
    [uploadCategoryByProfileId],
  )

  const setUploadCategoryName = useCallback((profileId: string, categoryName: string | null) => {
    const id = normalizeGovProfileId(profileId)
    if (!id) return
    setUploadCategoryByProfileId((prev) => ({ ...prev, [id]: categoryName }))
  }, [])

  const contextValue = useMemo<GovernmentProfileWorkspaceContextValue>(
    () => ({
      ...wsRest,
      selectedId,
      setSelectedId,
      selectedProfileIdFromPath,
      expandedProfileId,
      onSelectProfile,
      onToggleProfileCard,
      filesRefreshNonce,
      bumpFilesRefresh,
      documentCategoriesVersion,
      listProfileDocumentCategories,
      refreshProfileFileCategories,
      addProfileDocumentCategory,
      getUploadCategoryName,
      setUploadCategoryName,
    }),
    [
      wsRest,
      selectedId,
      setSelectedId,
      selectedProfileIdFromPath,
      expandedProfileId,
      onSelectProfile,
      onToggleProfileCard,
      filesRefreshNonce,
      bumpFilesRefresh,
      documentCategoriesVersion,
      listProfileDocumentCategories,
      refreshProfileFileCategories,
      addProfileDocumentCategory,
      getUploadCategoryName,
      setUploadCategoryName,
    ],
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
