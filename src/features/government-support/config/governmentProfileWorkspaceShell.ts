import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'

export type GovernmentProfileWorkspaceVariant = 'user' | 'agencyAdmin'

export type GovernmentProfileWorkspaceShell = {
  variant: GovernmentProfileWorkspaceVariant
  basePath: string
  documentTitle: string
  listTitle: string
  listSubtitle: string
  showOwnerGroups: boolean
  showOwnerFilter: boolean
  showTenantFilter: boolean
  canAddProfile: boolean
  canDeleteProfile: boolean
}

export const GOVERNMENT_USER_PROFILE_WORKSPACE_SHELL: GovernmentProfileWorkspaceShell = {
  variant: 'user',
  basePath: GOVERNMENT_ROUTE_PATHS.myApplications,
  documentTitle: '정부지원 CRM · 내 사업장/신청',
  listTitle: '내 사업장/신청',
  listSubtitle: '',
  showOwnerGroups: false,
  showOwnerFilter: false,
  showTenantFilter: false,
  canAddProfile: true,
  canDeleteProfile: true,
}

export const GOVERNMENT_AGENCY_ADMIN_CUSTOMERS_SHELL: GovernmentProfileWorkspaceShell = {
  variant: 'agencyAdmin',
  basePath: GOVERNMENT_ROUTE_PATHS.adminCustomers,
  documentTitle: '정부지원 CRM · 고객 관리',
  listTitle: '고객 관리',
  listSubtitle: '',
  showOwnerGroups: true,
  showOwnerFilter: true,
  showTenantFilter: true,
  canAddProfile: true,
  canDeleteProfile: false,
}
