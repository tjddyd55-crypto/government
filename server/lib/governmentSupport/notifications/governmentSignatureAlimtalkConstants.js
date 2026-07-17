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
 *   | 'missing_sign_token'
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

/**
 * 승인 템플릿(UJ_4754) 내부 표준 변수 키.
 * 업체명·요청일·서명기한·서명URL·문서명은 포함하지 않는다.
 */
export const GOV_SIGNATURE_ALIMTALK_INTERNAL_VARIABLE_KEYS = [
  'customerName',
  'managerName',
  'managerPhone',
  'signToken',
]

export const GOV_SIGNATURE_ALIMTALK_DEFAULT_EXPIRY_DAYS = 7
export const GOV_SIGNATURE_ALIMTALK_MAX_EXPIRY_DAYS = 30
