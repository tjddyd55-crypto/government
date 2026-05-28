import { apiRequest } from '../../../lib/apiClient'

export type GovernmentAdminDashboardRecentDocumentRequest = {
  id: string
  title: string
  status: string
  profileDisplayName: string
  updatedAt: string
}

export type GovernmentAdminDashboardRecentInquiry = {
  id: string
  title: string
  status: string
  profileDisplayName: string
  updatedAt: string
}

export type GovernmentAdminDashboardRecentSignature = {
  id: string
  status: string
  profileDisplayName: string
  sentAt: string | null
  completedAt: string | null
  updatedAt: string
}

export type GovernmentAdminDashboardRecentProgramUser = {
  id: string
  username: string
  displayName: string
  createdAt: string
}

export type GovernmentAdminDashboardRecentProfile = {
  id: string
  businessName: string
  createdAt: string
}

export type GovernmentAdminDashboardSummary = {
  pendingDocumentRequests: number
  submittedDocumentRequests: number
  openInquiries: number
  unansweredInquiries: number
  inProgressInquiries: number
  sentSignatures: number
  completedSignatures: number
  completedSignaturesNeedingReview: number
  cancelledSignatures: number
  expiredSignatures: number
  programUsersCount: number
  profilesCount: number
  recentDocumentRequests: GovernmentAdminDashboardRecentDocumentRequest[]
  recentInquiries: GovernmentAdminDashboardRecentInquiry[]
  recentSignatures: GovernmentAdminDashboardRecentSignature[]
  recentProgramUsers: GovernmentAdminDashboardRecentProgramUser[]
  recentProfiles: GovernmentAdminDashboardRecentProfile[]
}

function unwrapSummary(raw: unknown): GovernmentAdminDashboardSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const row = o.data && typeof o.data === 'object' ? (o.data as Record<string, unknown>) : o
  if (typeof row.pendingDocumentRequests !== 'number') return null
  return row as unknown as GovernmentAdminDashboardSummary
}

export async function fetchGovernmentAdminDashboardSummary(
  token: string,
): Promise<GovernmentAdminDashboardSummary> {
  const raw = await apiRequest<unknown>('/government-support/admin/dashboard/summary', { token })
  const summary = unwrapSummary(raw)
  if (!summary) {
    throw new Error('운영 대시보드 요약을 불러오지 못했습니다.')
  }
  return summary
}
