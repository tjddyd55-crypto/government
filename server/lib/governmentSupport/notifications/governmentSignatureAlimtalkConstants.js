/** @typedef {'sent' | 'failed' | 'skipped'} GovSignatureNotificationStatus */

/** @typedef {'kakao_alimtalk'} GovSignatureNotificationChannel */

/** @typedef {'aligo'} GovSignatureNotificationProvider */

/**
 * @typedef {(
 *   | 'invalid_phone'
 *   | 'missing_recipient'
 *   | 'missing_customer_name'
 *   | 'missing_company_name'
 *   | 'missing_contact'
 *   | 'missing_expiry'
 *   | 'missing_template'
 *   | 'missing_sender_key'
 *   | 'relay_auth_error'
 *   | 'provider_auth_error'
 *   | 'template_mismatch'
 *   | 'provider_rejected'
 *   | 'provider_timeout'
 *   | 'network_error'
 *   | 'disabled'
 *   | 'unknown'
 * )} GovSignatureAlimtalkErrorCategory
 */

export const GOV_SIGNATURE_ALIMTALK_CHANNEL = 'kakao_alimtalk'
export const GOV_SIGNATURE_ALIMTALK_PROVIDER = 'aligo'
export const GOV_SIGNATURE_ALIMTALK_PRODUCT = 'government'

/** 알림톡 내부 표준 변수 키 (dry-run 검증용, 문서명 제외) */
export const GOV_SIGNATURE_ALIMTALK_INTERNAL_VARIABLE_KEYS = [
  'customerName',
  'companyName',
  'requestedDate',
  'expiryDate',
  'managerName',
  'managerPhone',
]

export const GOV_SIGNATURE_ALIMTALK_DEFAULT_EXPIRY_DAYS = 7
export const GOV_SIGNATURE_ALIMTALK_MAX_EXPIRY_DAYS = 30
