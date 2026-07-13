/** 카카오 알림톡 발송 API 응답 notification 블록 */
export type GovernmentSignatureSendNotificationResult = {
  status: 'sent' | 'failed' | 'skipped'
  channel: 'kakao_alimtalk'
  provider: 'aligo'
  providerCode?: string | null
  providerMessage?: string | null
  retryable?: boolean
  errorCategory?: string | null
}

export type GovernmentSignatureNotificationSummary = {
  notificationStatus: 'not_requested' | 'sent' | 'failed' | 'skipped'
  notificationSentAt?: string | null
  notificationRecipientPhoneMasked?: string | null
  notificationRetryCount?: number
  notificationErrorCategory?: string | null
  notificationProviderCode?: string | null
  notificationDryRun?: boolean
  canResend?: boolean
}

export type GovernmentSignatureCustomerNotifyMode = 'kakao_alimtalk' | 'link_only'

export const GOVERNMENT_SIGNATURE_MAX_EXPIRY_DAYS = 30
export const GOVERNMENT_SIGNATURE_DEFAULT_EXPIRY_DAYS = 7
