/**
 * 정부지원 CRM route path SSOT (프론트).
 */

export const GOVERNMENT_ROUTE_PATHS = Object.freeze({
  root: '/government',
  login: '/government/login',
  signup: '/government/signup',
  workspace: '/government/workspace',
  myApplications: '/government/my-applications',
  myApplicationsIndex: '/government/my-applications/',
  regions: '/government/regions',
  me: '/government/me',
  notices: '/government/notices',
  resources: '/government/resources',
  inquiries: '/government/inquiries',
  inquiriesNew: '/government/inquiries/new',
  appRoot: '/government/app',
  appRequests: '/government/app/requests',
  appInquiries: '/government/app/inquiries',
  appInquiriesNew: '/government/app/inquiries/new',
  appProgress: '/government/app/progress',
  appSignatures: '/government/app/signatures',
  signatures: '/government/signatures',
  signaturesSend: '/government/signatures/send',
  adminRoot: '/government/admin',
  adminDocumentRequests: '/government/admin/document-requests',
  adminInquiries: '/government/admin/inquiries',
  adminNotices: '/government/admin/notices',
  adminResources: '/government/admin/resources',
  adminNotifications: '/government/admin/notifications',
  adminProgramUsers: '/government/admin/program-users',
  adminAgencies: '/government/admin/agencies',
  adminUsers: '/government/admin/users',
  adminSignatureTemplates: '/government/admin/signature-templates',
  adminSignaturePdfNew: '/government/admin/signature-templates/pdf/new',
})

export function governmentJoinPath(agencyCode: string): string {
  return `/government/join/${encodeURIComponent(agencyCode.trim())}`
}

export function governmentSignPublicPath(token: string): string {
  return `/government/sign/${encodeURIComponent(token)}`
}

export function governmentMyApplicationTabPath(profileId: string, tabSegment: string): string {
  return `/government/my-applications/${encodeURIComponent(profileId)}/${tabSegment}`
}

export function governmentAppRequestDetailPath(requestId: string | number): string {
  return `${GOVERNMENT_ROUTE_PATHS.appRequests}/${encodeURIComponent(String(requestId))}`
}

export function governmentAppInquiryDetailPath(inquiryId: string | number): string {
  return `${GOVERNMENT_ROUTE_PATHS.appInquiries}/${encodeURIComponent(String(inquiryId))}`
}

export function governmentUserInquiryDetailPath(inquiryId: string | number): string {
  return `${GOVERNMENT_ROUTE_PATHS.inquiries}/${encodeURIComponent(String(inquiryId))}`
}
