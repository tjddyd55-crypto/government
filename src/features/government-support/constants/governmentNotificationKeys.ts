/**
 * 정부지원 알림 eventType / targetType SSOT (프론트 — 서버 governmentNotificationKeys.js 와 동기화).
 */

export const GOVERNMENT_NOTIFICATION_EVENT_TYPES = {
  DOCUMENT_REQUEST_SUBMITTED: 'document_request_submitted',
  INQUIRY_CREATED: 'inquiry_created',
  INQUIRY_REPLIED: 'inquiry_replied',
  SIGNATURE_COMPLETED: 'signature_completed',
  PROGRAM_USER_JOINED: 'program_user_joined',
  INQUIRY_ASSIGNED: 'inquiry_assigned',
  DOCUMENT_REQUEST_ASSIGNED: 'document_request_assigned',
} as const

export type GovernmentNotificationEventType =
  (typeof GOVERNMENT_NOTIFICATION_EVENT_TYPES)[keyof typeof GOVERNMENT_NOTIFICATION_EVENT_TYPES]

export const GOVERNMENT_NOTIFICATION_TARGET_TYPES = {
  DOCUMENT_REQUEST: 'document_request',
  INQUIRY: 'inquiry',
  SIGNATURE_SESSION: 'signature_session',
  PROGRAM_USER: 'program_user',
} as const

export type GovernmentNotificationTargetType =
  (typeof GOVERNMENT_NOTIFICATION_TARGET_TYPES)[keyof typeof GOVERNMENT_NOTIFICATION_TARGET_TYPES]

export const GOVERNMENT_NOTIFICATION_TARGET_URLS = {
  DOCUMENT_REQUESTS: '/government/admin/document-requests',
  INQUIRIES: '/government/admin/inquiries',
  ADMIN_HOME: '/government/admin',
  PROGRAM_USERS: '/government/admin/program-users',
} as const
