/**
 * 정부지원 CRM 알림 eventType / targetType SSOT (서버).
 * DB에 저장된 값과 동일 — 변경 금지.
 * @module governmentNotificationKeys
 */

export const GOV_NOTIFICATION_EVENT_TYPES = Object.freeze({
  DOCUMENT_REQUEST_SUBMITTED: 'document_request_submitted',
  INQUIRY_CREATED: 'inquiry_created',
  INQUIRY_REPLIED: 'inquiry_replied',
  SIGNATURE_COMPLETED: 'signature_completed',
  PROGRAM_USER_JOINED: 'program_user_joined',
  INQUIRY_ASSIGNED: 'inquiry_assigned',
  DOCUMENT_REQUEST_ASSIGNED: 'document_request_assigned',
})

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
