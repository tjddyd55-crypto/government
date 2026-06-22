import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'

/** URL path tab → useGovernmentWorkspaceState 내부 탭 */
export type GovernmentProfileWorkspaceTab =
  | 'basic'
  | 'files'
  | 'documents'
  | 'edoc'
  | 'consultations'
  | 'memos'
  | 'progress'
  | 'signatures'
  | 'applications'

export const GOVERNMENT_USER_PROFILE_WORKSPACE_BASE_PATH = GOVERNMENT_ROUTE_PATHS.myApplications
export const GOVERNMENT_ADMIN_CUSTOMERS_WORKSPACE_BASE_PATH = GOVERNMENT_ROUTE_PATHS.adminCustomers

/** @deprecated GOVERNMENT_USER_PROFILE_WORKSPACE_BASE_PATH 사용 */
export const GOVERNMENT_PROFILE_WORKSPACE_BASE_PATH = GOVERNMENT_USER_PROFILE_WORKSPACE_BASE_PATH

export const GOVERNMENT_PROFILE_WORKSPACE_TABS: { id: GovernmentProfileWorkspaceTab; label: string }[] = [
  { id: 'basic', label: '기본정보' },
  { id: 'files', label: '서류/파일' },
  { id: 'documents', label: '서류관리' },
  { id: 'edoc', label: '전자문서' },
  { id: 'consultations', label: '상담 이력' },
  { id: 'memos', label: '메모' },
  { id: 'progress', label: '진행상황' },
  { id: 'signatures', label: '전자서명' },
  { id: 'applications', label: '신청 관리' },
]

export const GOVERNMENT_PROFILE_WORKSPACE_TAB_IDS = GOVERNMENT_PROFILE_WORKSPACE_TABS.map((t) => t.id)

export type GovernmentProfileWorkspacePathHelpers = {
  basePath: string
  workspacePath: (profileId: string, tab: GovernmentProfileWorkspaceTab) => string
  parseProfileIdFromPath: (pathname: string) => string | null
  resolveActiveTab: (pathname: string) => GovernmentProfileWorkspaceTab | null
  isIndexPath: (pathname: string) => boolean
  isSideDetailPath: (pathname: string) => boolean
}

function escapeBasePathForRegex(basePath: string): string {
  return basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createGovernmentProfileWorkspacePathHelpers(
  basePath: string,
): GovernmentProfileWorkspacePathHelpers {
  const escaped = escapeBasePathForRegex(basePath)
  const sideDetailTabRe = new RegExp(
    `^${escaped}/[^/]+/(?:${GOVERNMENT_PROFILE_WORKSPACE_TAB_IDS.join('|')})(?:/|$)`,
  )
  const profileIdRe = new RegExp(`^${escaped}/([^/]+)`)
  const tabRe = new RegExp(`^${escaped}/[^/]+/([^/]+)`)

  return {
    basePath,
    workspacePath(profileId: string, tab: GovernmentProfileWorkspaceTab) {
      return `${basePath}/${encodeURIComponent(profileId)}/${tab}`
    },
    parseProfileIdFromPath(pathname: string) {
      const m = pathname.match(profileIdRe)
      if (!m?.[1]) return null
      try {
        return decodeURIComponent(m[1])
      } catch {
        return m[1]
      }
    },
    resolveActiveTab(pathname: string) {
      const m = pathname.match(tabRe)
      if (!m?.[1]) return null
      return parseGovernmentProfileWorkspaceTab(m[1])
    },
    isIndexPath(pathname: string) {
      return pathname === basePath || pathname === `${basePath}/`
    },
    isSideDetailPath(pathname: string) {
      return sideDetailTabRe.test(pathname)
    },
  }
}

export const governmentUserProfileWorkspacePaths = createGovernmentProfileWorkspacePathHelpers(
  GOVERNMENT_USER_PROFILE_WORKSPACE_BASE_PATH,
)

export const governmentAdminCustomersWorkspacePaths = createGovernmentProfileWorkspacePathHelpers(
  GOVERNMENT_ADMIN_CUSTOMERS_WORKSPACE_BASE_PATH,
)

export function parseGovernmentProfileWorkspaceTab(raw: string | undefined): GovernmentProfileWorkspaceTab {
  const t = String(raw ?? '').trim().toLowerCase()
  if (GOVERNMENT_PROFILE_WORKSPACE_TABS.some((x) => x.id === t)) {
    return t as GovernmentProfileWorkspaceTab
  }
  return 'basic'
}

export function labelForGovernmentProfileWorkspaceTab(tab: GovernmentProfileWorkspaceTab): string {
  return GOVERNMENT_PROFILE_WORKSPACE_TABS.find((x) => x.id === tab)?.label ?? '작업 영역'
}

export function governmentProfileWorkspacePath(profileId: string, tab: GovernmentProfileWorkspaceTab): string {
  return governmentUserProfileWorkspacePaths.workspacePath(profileId, tab)
}

export function isGovernmentProfileWorkspaceSideDetailPath(pathname: string): boolean {
  return governmentUserProfileWorkspacePaths.isSideDetailPath(pathname)
}

export function isGovernmentProfileWorkspaceSideDetailPathForBase(
  pathname: string,
  basePath: string,
): boolean {
  return createGovernmentProfileWorkspacePathHelpers(basePath).isSideDetailPath(pathname)
}
