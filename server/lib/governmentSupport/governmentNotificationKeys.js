/**
 * 정부지원 CRM 알림 eventType / targetType SSOT (서버).
 * DB에 저장된 값과 동일 — 변경 금지.
 * @module governmentNotificationKeys
 */

export const GOV_NOTIFICATION_EVENT_TYPES = Object.freeze([
  'document_request_submitted',
  'inquiry_created',
  'inquiry_replied',
  'signature_completed',
  'program_user_joined',
  'inquiry_assigned',
  'document_request_assigned',
])

export const GOV_NOTIFICATION_TARGET_TYPES = Object.freeze({
  DOCUMENT_REQUEST: 'document_request',
  INQUIRY: 'inquiry',
  SIGNATURE_SESSION: 'signature_session',
  PROGRAM_USER: 'program_user',
})

export const GOV_NOTIFICATION_TARGET_URLS = Object.freeze({
  DOCUMENT_REQUESTS: '/government/admin/document-requests',
  INQUIRIES: '/government/admin/inquiries',
  ADMIN_HOME: '/government/admin',
  PROGRAM_USERS: '/government/admin/program-users',
})
