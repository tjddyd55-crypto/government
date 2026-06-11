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

export const GOVERNMENT_PROFILE_WORKSPACE_BASE_PATH = '/government/my-applications'

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

const SIDE_DETAIL_TAB_RE = new RegExp(
  `^/government/my-applications/[^/]+/(?:${GOVERNMENT_PROFILE_WORKSPACE_TAB_IDS.join('|')})(?:/|$)`,
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
  return `${GOVERNMENT_PROFILE_WORKSPACE_BASE_PATH}/${encodeURIComponent(profileId)}/${tab}`
}

export function isGovernmentProfileWorkspaceSideDetailPath(pathname: string): boolean {
  return SIDE_DETAIL_TAB_RE.test(pathname)
}
