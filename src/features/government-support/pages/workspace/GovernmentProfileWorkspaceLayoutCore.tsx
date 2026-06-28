import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import { useDocumentTitle } from '../../../../hooks/useDocumentTitle'
import useIsMobile from '../../../../hooks/useIsMobile'
import { useAuth } from '../../../auth/AuthProvider'
import { GovernmentAccessProvider } from '../../context/GovernmentAccessContext'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'
import { useGovernmentAgencyAdminListState } from '../../hooks/useGovernmentAgencyAdminListState'
import { useGovernmentProfileListState } from '../../hooks/useGovernmentProfileListState'
import { useGovernmentWorkspaceState } from '../../hooks/useGovernmentWorkspaceState'
import {
  createGovernmentProfileWorkspacePathHelpers,
  governmentAdminCustomersWorkspacePaths,
  governmentUserProfileWorkspacePaths,
  type GovernmentProfileWorkspacePathHelpers,
} from '../../config/governmentProfileWorkspaceTabs'
import {
  GOVERNMENT_AGENCY_ADMIN_CUSTOMERS_SHELL,
  GOVERNMENT_USER_PROFILE_WORKSPACE_SHELL,
  type GovernmentProfileWorkspaceShell,
} from '../../config/governmentProfileWorkspaceShell'
import { GOVERNMENT_ROUTE_PATHS } from '../../constants/governmentRouteKeys'
import { useGovernmentUserChromeContextOptional } from '../../context/governmentUserChromeContext'
import { createGovProfile } from '../../api/governmentProfilesApi'
import { GOVERNMENT_PROFILE_CREATE_SEGMENT, isGovernmentProfileCreateSegment } from '../../lib/governmentProfileCreateFlow'
import GovernmentProfileWorkspacePCView from './GovernmentProfileWorkspacePCView'
import GovernmentProfileWorkspaceMobileView from './GovernmentProfileWorkspaceMobileView'
import GovernmentProfileOwnerPickModal from './GovernmentProfileOwnerPickModal'
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
import { isGovProfileCardCollapsed, isSameGovProfileId, normalizeGovProfileId, setGovProfileCardCollapsed } from '../../lib/governmentProfileDocumentCategories'
import type { GovProfileFileCategory, GovSupportProfile } from '../../types/governmentProfile.types'
import '../../government-support.css'
import '../../government-profile-workspace-chrome.css'
import '../../government-status-pill.css'
import '../../government-profile-mobile-detail-theme.css'

export type GovernmentProfileWorkspaceLayoutCoreProps = {
  shell?: GovernmentProfileWorkspaceShell
  paths?: GovernmentProfileWorkspacePathHelpers
}

function GovernmentProfileWorkspaceDenied({ message }: { message: string }) {
  return (
    <main className="page government-page government-admin-page">
      <p className="government-page__muted">{message}</p>
    </main>
  )
}

export default function GovernmentProfileWorkspaceLayoutCore({
  shell: shellProp,
  paths: pathsProp,
}: GovernmentProfileWorkspaceLayoutCoreProps = {}) {
  const shell = shellProp ?? GOVERNMENT_USER_PROFILE_WORKSPACE_SHELL
  const paths = pathsProp ?? governmentUserProfileWorkspacePaths
  const isAgencyAdmin = shell.variant === 'agencyAdmin'
  const isMobile = useIsMobile()

  useDocumentTitle(shell.documentTitle)
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()
  const { summary, reload: reloadAccess } = useGovernmentAccess(token)

  const userListState = useGovernmentProfileListState(
    isAgencyAdmin ? null : token,
    isAgencyAdmin ? null : summary?.governmentProgramUserTenantIds?.[0] ?? summary?.defaultWorkspaceTenantId ?? null,
  )
  const adminListState = useGovernmentAgencyAdminListState(isAgencyAdmin ? token : null)

  const defaultTenantId = useMemo(() => {
    if (isAgencyAdmin) {
      return adminListState.effectiveTenantId || null
    }
    if (!summary) return null
    if (summary.defaultWorkspaceTenantId) return summary.defaultWorkspaceTenantId
    if (summary.workspaceTenantIds.length > 0) return summary.workspaceTenantIds[0]
    return summary.governmentProgramUserTenantIds[0] ?? null
  }, [isAgencyAdmin, adminListState.effectiveTenantId, summary])

  const listQuery = isAgencyAdmin ? adminListState.listQuery : userListState.listQuery

  const createProfileForAdmin = useCallback(
    async (
      authToken: string,
      tenantId: string | null,
      ownerUserId?: string | null,
      patch?: Partial<GovSupportProfile>,
    ) => {
      const ownerId = String(ownerUserId ?? '').trim()
      if (!ownerId) {
        throw new Error('담당 이용자를 선택해 주세요.')
      }
      const tid = tenantId ?? adminListState.effectiveTenantId
      return createGovProfile(authToken, tid, { ownerUserId: ownerId, ...(patch ?? {}) })
    },
    [adminListState.effectiveTenantId],
  )

  const ws = useGovernmentWorkspaceState(token, defaultTenantId, {
    canCreateProfile: shell.canAddProfile && (!isAgencyAdmin || adminListState.allowed),
    canDeleteProfile: shell.canDeleteProfile,
    onProfilesChanged: () => void reloadAccess(),
    listQuery,
    loadProfiles: isAgencyAdmin ? adminListState.loadProfiles : undefined,
    createProfile: isAgencyAdmin ? createProfileForAdmin : undefined,
  })

  const [ownerPickOpen, setOwnerPickOpen] = useState(false)
  const [profileCreateOwnerUserId, setProfileCreateOwnerUserId] = useState<string | null>(null)
  const profileCreateReturnPathRef = useRef<string | null>(null)
  const [autoEditBasicInfoProfileId, setAutoEditBasicInfoProfileId] = useState<string | null>(null)

  const clearAutoEditBasicInfoProfileId = useCallback(() => {
    setAutoEditBasicInfoProfileId(null)
  }, [])

  const selectedProfileIdFromPath = useMemo(
    () => paths.parseProfileIdFromPath(location.pathname),
    [location.pathname, paths],
  )

  const activeTab = useMemo(() => paths.resolveActiveTab(location.pathname), [location.pathname, paths])

  const isCreatingProfile = isGovernmentProfileCreateSegment(selectedProfileIdFromPath)

  const { selectedId, setSelectedId, ...wsRest } = ws

  useEffect(() => {
    if (selectedProfileIdFromPath && !isCreatingProfile && selectedProfileIdFromPath !== selectedId) {
      setSelectedId(selectedProfileIdFromPath)
    }
  }, [selectedProfileIdFromPath, selectedId, setSelectedId, isCreatingProfile])

  const prevPathProfileIdRef = useRef<string | null | undefined>(undefined)
  const expandedProfileIdRef = useRef<string | null>(null)
  const [expandedProfileId, setExpandedProfileIdRaw] = useState<string | null>(() => {
    if (isAgencyAdmin || !selectedProfileIdFromPath) return null
    return isGovProfileCardCollapsed(selectedProfileIdFromPath) ? null : selectedProfileIdFromPath
  })

  const setExpandedProfileId = useCallback((updater: SetStateAction<string | null>) => {
    setExpandedProfileIdRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      expandedProfileIdRef.current = next
      return next
    })
  }, [])

  const beginProfileCreate = useCallback(
    (ownerUserId?: string | null) => {
      if (!shell.canAddProfile) return

      const returnPath =
        selectedProfileIdFromPath && !isGovernmentProfileCreateSegment(selectedProfileIdFromPath)
          ? paths.workspacePath(selectedProfileIdFromPath, activeTab ?? 'basic')
          : paths.basePath
      profileCreateReturnPathRef.current = returnPath
      setProfileCreateOwnerUserId(ownerUserId ?? null)
      navigate(paths.workspacePath(GOVERNMENT_PROFILE_CREATE_SEGMENT, 'basic'), { replace: true })
    },
    [activeTab, navigate, paths, selectedProfileIdFromPath, shell.canAddProfile],
  )

  const cancelProfileCreate = useCallback(() => {
    setProfileCreateOwnerUserId(null)
    const returnPath = profileCreateReturnPathRef.current ?? paths.basePath
    profileCreateReturnPathRef.current = null
    navigate(returnPath, { replace: true })
  }, [navigate, paths.basePath])

  const completeProfileCreate = useCallback(
    (profileId: string) => {
      const normalizedId = normalizeGovProfileId(profileId)
      if (!normalizedId) return

      setProfileCreateOwnerUserId(null)
      profileCreateReturnPathRef.current = null

      if (!isAgencyAdmin) {
        setGovProfileCardCollapsed(normalizedId, false)
        setExpandedProfileId(normalizedId)
      }

      navigate(paths.workspacePath(normalizedId, 'basic'), { replace: true })
    },
    [isAgencyAdmin, navigate, paths, setExpandedProfileId],
  )

  const createProfileFromFormForContext = useCallback(
    async (patch: Partial<GovSupportProfile>) => {
      return ws.createProfileFromForm(patch, profileCreateOwnerUserId)
    },
    [profileCreateOwnerUserId, ws],
  )

  const requestAddProfile = useCallback(() => {
    if (!shell.canAddProfile) return
    if (isAgencyAdmin) {
      if (!adminListState.effectiveTenantId) {
        ws.setFeedback('대행사를 먼저 선택해 주세요.')
        return
      }
      if (adminListState.ownerOptions.length === 0) {
        ws.setFeedback('등록된 담당 이용자가 없습니다.')
        return
      }
      setOwnerPickOpen(true)
      return
    }
    beginProfileCreate()
  }, [
    shell.canAddProfile,
    isAgencyAdmin,
    adminListState.effectiveTenantId,
    adminListState.ownerOptions.length,
    ws,
    beginProfileCreate,
  ])

  const handleOwnerPickConfirm = useCallback(
    (ownerUserId: string) => {
      setOwnerPickOpen(false)
      beginProfileCreate(ownerUserId)
    },
    [beginProfileCreate],
  )

  useEffect(() => {
    expandedProfileIdRef.current = expandedProfileId
  }, [expandedProfileId])

  useEffect(() => {
    if (isAgencyAdmin) return
    if (isGovernmentProfileCreateSegment(selectedProfileIdFromPath)) return
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
  }, [isAgencyAdmin, selectedProfileIdFromPath, setExpandedProfileId])

  const onToggleProfileCard = useCallback(
    (profileId: string) => {
      if (isAgencyAdmin) return
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
      navigate(paths.workspacePath(normalizedId, tab), { replace: true })
    },
    [activeTab, isAgencyAdmin, navigate, paths, selectedProfileIdFromPath, setExpandedProfileId],
  )

  const onSelectProfile = useCallback(
    (profileId: string) => {
      if (isAgencyAdmin) {
        const normalizedId = normalizeGovProfileId(profileId)
        if (!normalizedId) return

        const pathId = normalizeGovProfileId(selectedProfileIdFromPath)
        if (isSameGovProfileId(normalizedId, pathId)) return

        const tab = activeTab ?? 'basic'
        navigate(paths.workspacePath(normalizedId, tab), { replace: true })
        return
      }
      onToggleProfileCard(profileId)
    },
    [activeTab, isAgencyAdmin, navigate, onToggleProfileCard, paths, selectedProfileIdFromPath],
  )

  const selectedProfile = useMemo(() => {
    if (isCreatingProfile) {
      return null
    }
    if (selectedProfileIdFromPath) {
      return (
        ws.profiles.find((p) => isSameGovProfileId(p.id, selectedProfileIdFromPath)) ?? ws.selected
      )
    }
    return ws.selected
  }, [isCreatingProfile, selectedProfileIdFromPath, ws.profiles, ws.selected])

  const selectedProfileLabel = useMemo(() => {
    if (isCreatingProfile) {
      return '신규 사업장 작성 중'
    }
    if (selectedProfile?.businessName?.trim()) {
      return selectedProfile.businessName.trim()
    }
    if (selectedProfile?.customerName?.trim()) {
      return selectedProfile.customerName.trim()
    }
    return selectedProfileIdFromPath ? '선택 사업장' : ''
  }, [isCreatingProfile, selectedProfile, selectedProfileIdFromPath])

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
      navigate(paths.workspacePath(selectedProfileIdFromPath, tab), { replace: true })
    },
    [navigate, paths, selectedProfileIdFromPath],
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
    if (selectedProfileIdFromPath && token?.trim() && !isCreatingProfile) {
      void refreshProfileFileCategories(selectedProfileIdFromPath)
    }
  }, [selectedProfileIdFromPath, token, refreshProfileFileCategories, isCreatingProfile])

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

  const listSearch = isAgencyAdmin ? adminListState.filters.search : userListState.filters.search
  const listCustomerStatusFilter = isAgencyAdmin
    ? adminListState.filters.customerStatusOptionId
    : userListState.filters.customerStatusOptionId
  const listBusinessTypeFilter = isAgencyAdmin
    ? adminListState.filters.businessType
    : userListState.filters.businessType
  const listOwnerUserFilter = isAgencyAdmin ? adminListState.filters.ownerUserId : ''
  const statusOptions = isAgencyAdmin ? adminListState.statusOptions : userListState.statusOptions
  const ownerOptions = isAgencyAdmin ? adminListState.ownerOptions : []
  const tenantOptions = isAgencyAdmin ? adminListState.tenantOptions : []
  const listTenantId = isAgencyAdmin ? adminListState.effectiveTenantId : ''

  const contextValue = useMemo<GovernmentProfileWorkspaceContextValue>(
    () => ({
      ...wsRest,
      shell,
      paths,
      selectedId,
      setSelectedId,
      selectedProfileIdFromPath,
      expandedProfileId: isAgencyAdmin ? null : expandedProfileId,
      onSelectProfile,
      onToggleProfileCard: isAgencyAdmin ? () => {} : onToggleProfileCard,
      filesRefreshNonce,
      bumpFilesRefresh,
      documentCategoriesVersion,
      listProfileDocumentCategories,
      refreshProfileFileCategories,
      addProfileDocumentCategory,
      getUploadCategoryName,
      setUploadCategoryName,
      listSearch,
      listCustomerStatusFilter,
      listBusinessTypeFilter,
      listOwnerUserFilter,
      statusOptions,
      ownerOptions,
      tenantOptions,
      listTenantId,
      setListSearch: isAgencyAdmin ? adminListState.setSearch : userListState.setSearch,
      setListCustomerStatusFilter: isAgencyAdmin
        ? adminListState.setCustomerStatusFilter
        : userListState.setCustomerStatusFilter,
      setListBusinessTypeFilter: isAgencyAdmin
        ? adminListState.setBusinessTypeFilter
        : userListState.setBusinessTypeFilter,
      setListOwnerUserFilter: isAgencyAdmin ? adminListState.setOwnerUserFilter : () => {},
      setListTenantId: isAgencyAdmin ? adminListState.setTenantId : () => {},
      requestAddProfile,
      isCreatingProfile,
      createProfileFromForm: createProfileFromFormForContext,
      completeProfileCreate,
      cancelProfileCreate,
      autoEditBasicInfoProfileId,
      clearAutoEditBasicInfoProfileId,
    }),
    [
      wsRest,
      shell,
      paths,
      selectedId,
      setSelectedId,
      selectedProfileIdFromPath,
      expandedProfileId,
      isAgencyAdmin,
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
      listSearch,
      listCustomerStatusFilter,
      listBusinessTypeFilter,
      listOwnerUserFilter,
      statusOptions,
      ownerOptions,
      tenantOptions,
      listTenantId,
      adminListState.setSearch,
      adminListState.setCustomerStatusFilter,
      adminListState.setBusinessTypeFilter,
      adminListState.setOwnerUserFilter,
      adminListState.setTenantId,
      userListState.setSearch,
      userListState.setCustomerStatusFilter,
      userListState.setBusinessTypeFilter,
      requestAddProfile,
      isCreatingProfile,
      createProfileFromFormForContext,
      completeProfileCreate,
      cancelProfileCreate,
      autoEditBasicInfoProfileId,
      clearAutoEditBasicInfoProfileId,
    ],
  )

  const viewProps: GovernmentProfileWorkspaceLayoutViewProps = {
    pathname: location.pathname,
    workspaceBasePath: paths.basePath,
    selectedProfileId: selectedProfileIdFromPath,
    selectedProfile: selectedProfile ?? null,
    selectedProfileLabel,
    isCreatingProfile,
    activeTab,
    onClickBasic: () => moveToTab('basic'),
    onClickFiles: () => moveToTab('files'),
    onClickEdoc: () => moveToTab('edoc'),
    onClickConsultations: () => moveToTab('consultations'),
    onClickMemos: () => moveToTab('memos'),
    onClickProgress: () => moveToTab('progress'),
    onClickSignatures: () => moveToTab('signatures'),
    onClickApplications: () => moveToTab('applications'),
    onClickCustomerApp: () => navigate(GOVERNMENT_ROUTE_PATHS.appRequests),
  }

  if (isAgencyAdmin && adminListState.accessLoading) {
    return <GovernmentProfileWorkspaceDenied message="권한을 확인하는 중…" />
  }

  if (isAgencyAdmin && !adminListState.allowed) {
    return (
      <GovernmentProfileWorkspaceDenied message="고객 관리는 대행사·업종 관리자만 이용할 수 있습니다." />
    )
  }

  const adminChromeClassName = isAgencyAdmin
    ? [
        'government-admin-customers-workspace',
        'government-profile-workspace-chrome',
        'government-user-white-theme',
        isMobile ? 'government-user-layout--mobile government-page--mobile' : 'government-user-layout--pc-user government-user-pc-page',
      ].join(' ')
    : ''

  const workspaceBody = (
    <GovernmentProfileWorkspaceContext.Provider value={contextValue}>
      <ResponsiveLayout<GovernmentProfileWorkspaceLayoutViewProps>
        PC={GovernmentProfileWorkspacePCView}
        Mobile={GovernmentProfileWorkspaceMobileView}
        viewProps={viewProps}
      />
      {isAgencyAdmin ? (
        <GovernmentProfileOwnerPickModal
          open={ownerPickOpen}
          ownerOptions={adminListState.ownerOptions}
          onClose={() => setOwnerPickOpen(false)}
          onConfirm={handleOwnerPickConfirm}
        />
      ) : null}
    </GovernmentProfileWorkspaceContext.Provider>
  )

  return adminChromeClassName ? (
    <div className={adminChromeClassName}>{workspaceBody}</div>
  ) : (
    workspaceBody
  )
}

/** 일반 이용자 workspace (기존 동작 유지) */
export function GovernmentUserProfileWorkspaceLayout() {
  return <GovernmentProfileWorkspaceLayoutCore />
}

/** 대행사·업종 관리자 고객 관리 workspace */
export function GovernmentAgencyAdminCustomersWorkspaceLayout() {
  const { token } = useAuth()
  return (
    <GovernmentAccessProvider token={token}>
      <GovernmentProfileWorkspaceLayoutCore
        shell={GOVERNMENT_AGENCY_ADMIN_CUSTOMERS_SHELL}
        paths={governmentAdminCustomersWorkspacePaths}
      />
    </GovernmentAccessProvider>
  )
}
