import type { GovernmentAccessSummary } from '../api/governmentSupportApi'
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'
import { canManageGovernmentUsers, isGovernmentProgramUser } from './governmentAccess'

/** 운영 계정(업종·대행사 관리자·직원) — 사업장/고객 워크스페이스 아님 */
export function isGovernmentOperationalAccount(summary: GovernmentAccessSummary | null): boolean {
  if (!summary || isGovernmentProgramUser(summary)) return false
  if (summary.isSuperAdmin || summary.isGovernmentIndustryAdmin) return true
  if ((summary.governmentAgencyAdminTenantIds?.length ?? 0) > 0) return true
  if ((summary.governmentStaffTenantIds?.length ?? 0) > 0) return true
  return false
}

/** 대행사 관리자·직원 — 전자서명 템플릿·발송 (업종 관리자 제외) */
export function canManageGovernmentSignatures(summary: GovernmentAccessSummary | null): boolean {
  if (!summary || isGovernmentProgramUser(summary)) return false
  if (summary.isSuperAdmin) return true
  if (summary.isGovernmentIndustryAdmin) return false
  if ((summary.governmentAgencyAdminTenantIds?.length ?? 0) > 0) return true
  if ((summary.governmentStaffTenantIds?.length ?? 0) > 0) return true
  return false
}

/** 공지·전달사항·자료실 — 업종 관리자(global) + 대행사 관리자·직원(소속 대행사) */
export function canManageGovernmentNotices(summary: GovernmentAccessSummary | null): boolean {
  if (!summary || isGovernmentProgramUser(summary)) return false
  if (summary.isSuperAdmin || summary.isGovernmentIndustryAdmin) return true
  if ((summary.governmentAgencyAdminTenantIds?.length ?? 0) > 0) return true
  if ((summary.governmentStaffTenantIds?.length ?? 0) > 0) return true
  return false
}

/** 사업장/고객/신청 워크스페이스 — 프로그램 이용자만 */
export function canAccessUserOwnedWorkspace(summary: GovernmentAccessSummary | null): boolean {
  return isGovernmentProgramUser(summary)
}

/** 로그인·게이트 후 기본 진입 경로 */
export function resolveGovernmentHomePath(summary: GovernmentAccessSummary | null): string {
  if (!summary) return GOVERNMENT_ROUTE_PATHS.login
  if (isGovernmentProgramUser(summary)) return GOVERNMENT_ROUTE_PATHS.myApplications
  if (summary.isSuperAdmin || summary.isGovernmentIndustryAdmin) return GOVERNMENT_ROUTE_PATHS.adminRoot
  if (canManageGovernmentUsers(summary)) return GOVERNMENT_ROUTE_PATHS.adminRoot
  if ((summary.governmentStaffTenantIds?.length ?? 0) > 0) return GOVERNMENT_ROUTE_PATHS.adminRoot
  return GOVERNMENT_ROUTE_PATHS.adminNotices
}
