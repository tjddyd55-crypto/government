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

export function parseGovernmentProfileWorkspaceTab(raw: string | undefined): GovernmentProfileWorkspaceTab {
  const t = String(raw ?? '').trim().toLowerCase()
  if (GOVERNMENT_PROFILE_WORKSPACE_TABS.some((x) => x.id === t)) {
    return t as GovernmentProfileWorkspaceTab
  }
  return 'basic'
}

export function governmentProfileWorkspacePath(profileId: string, tab: GovernmentProfileWorkspaceTab): string {
  return `/government/my-applications/${encodeURIComponent(profileId)}/${tab}`
}
