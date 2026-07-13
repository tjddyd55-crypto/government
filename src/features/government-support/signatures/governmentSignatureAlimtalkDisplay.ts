import { formatSeoulYmd } from '../../todos/utils/formatSeoulYmd'
import type { GovernmentSignatureSendNotificationResult } from './governmentSignatureAlimtalkTypes'
import {
  GOVERNMENT_SIGNATURE_DEFAULT_EXPIRY_DAYS,
  GOVERNMENT_SIGNATURE_MAX_EXPIRY_DAYS,
} from './governmentSignatureAlimtalkTypes'

export function addSeoulCalendarDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() + days)
  const y2 = t.getUTCFullYear()
  const m2 = String(t.getUTCMonth() + 1).padStart(2, '0')
  const d2 = String(t.getUTCDate()).padStart(2, '0')
  return `${y2}-${m2}-${d2}`
}

export function defaultSignatureExpiryYmd(now = new Date()): string {
  return addSeoulCalendarDays(formatSeoulYmd(now), GOVERNMENT_SIGNATURE_DEFAULT_EXPIRY_DAYS)
}

export function minSignatureExpiryYmd(now = new Date()): string {
  return addSeoulCalendarDays(formatSeoulYmd(now), 1)
}

export function maxSignatureExpiryYmd(now = new Date()): string {
  return addSeoulCalendarDays(formatSeoulYmd(now), GOVERNMENT_SIGNATURE_MAX_EXPIRY_DAYS)
}

/** API expiresAt — 서울 달력일 종료 시각 */
export function signatureExpiryYmdToApiExpiresAt(ymd: string): string {
  return new Date(`${ymd}T23:59:59+09:00`).toISOString()
}

export function validateSignatureExpiryYmd(
  ymd: string,
  now = new Date(),
): { ok: true } | { ok: false; message: string } {
  const trimmed = String(ymd ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, message: '서명기한 날짜 형식이 올바르지 않습니다.' }
  }
  const min = minSignatureExpiryYmd(now)
  const max = maxSignatureExpiryYmd(now)
  if (trimmed < formatSeoulYmd(now)) {
    return { ok: false, message: '서명기한은 오늘 이후여야 합니다.' }
  }
  if (trimmed > max) {
    return { ok: false, message: `서명기한은 오늘부터 최대 ${GOVERNMENT_SIGNATURE_MAX_EXPIRY_DAYS}일까지 설정할 수 있습니다.` }
  }
  if (trimmed < min) {
    return { ok: false, message: '서명기한은 오늘 이후여야 합니다.' }
  }
  return { ok: true }
}

const ERROR_LABELS: Record<string, string> = {
  invalid_phone: '고객의 휴대폰 번호를 확인해 주세요.',
  missing_contact: '업체 문의 연락처가 설정되지 않았습니다.',
  missing_template: '알림톡 템플릿 설정을 확인해 주세요.',
  disabled: '현재 알림톡 발송이 비활성화되어 있습니다.',
  template_mismatch: '알림톡 템플릿 설정이 일치하지 않습니다.',
  provider_auth_error: '알림톡 발송 설정을 확인해 주세요.',
  relay_auth_error: '알림톡 발송 설정을 확인해 주세요.',
  provider_timeout: '알림톡 서버 연결에 실패했습니다. 다시 시도해 주세요.',
  network_error: '알림톡 서버 연결에 실패했습니다. 다시 시도해 주세요.',
  provider_rejected: '알림톡 발송이 거절되었습니다.',
  unknown: '알림톡 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
}

export function mapAlimtalkErrorCategoryToUserMessage(category: string | null | undefined): string {
  const key = String(category ?? '').trim()
  return ERROR_LABELS[key] ?? ERROR_LABELS.unknown
}

export type NotificationStatusLabelInput = {
  notificationStatus?: string | null
  notificationDryRun?: boolean
  notificationProviderCode?: string | null
}

export function notificationStatusDisplayLabel(input: NotificationStatusLabelInput): string {
  const st = String(input.notificationStatus ?? 'not_requested')
  if (st === 'not_requested') {
    return '미요청'
  }
  if (st === 'skipped') {
    return '발송 비활성'
  }
  if (st === 'failed') {
    return '발송 실패'
  }
  if (st === 'sent') {
    if (input.notificationDryRun || input.notificationProviderCode === 'DRY_RUN') {
      return '테스트 발송'
    }
    return '발송 완료'
  }
  return '발송 준비'
}

export function canShowResendAvailableBadge(canResend?: boolean): boolean {
  return Boolean(canResend)
}

export type SendResultBannerModel = {
  sessionCreated: true
  notification?: GovernmentSignatureSendNotificationResult | null
}

export function buildSendResultMessages(model: SendResultBannerModel): {
  sessionLine: string
  notificationLine: string
  tone: 'success' | 'warning' | 'info'
  showCopyLink: boolean
} {
  const sessionLine = '전자서명 요청이 생성되었습니다.'
  const n = model.notification
  if (!n) {
    return {
      sessionLine,
      notificationLine: '',
      tone: 'success',
      showCopyLink: true,
    }
  }
  if (n.status === 'sent') {
    const dry = n.providerCode === 'DRY_RUN'
    return {
      sessionLine,
      notificationLine: dry
        ? '알림톡 테스트 모드로 처리되었습니다. (실제 고객에게 발송되지 않습니다.)'
        : '카카오 알림톡을 발송했습니다.',
      tone: dry ? 'info' : 'success',
      showCopyLink: true,
    }
  }
  if (n.status === 'skipped') {
    return {
      sessionLine,
      notificationLine:
        n.errorCategory === 'disabled'
          ? '현재 알림톡 발송이 비활성화되어 링크만 생성되었습니다.'
          : '알림톡 발송이 건너뛰어졌습니다. 링크를 직접 전달해 주세요.',
      tone: 'info',
      showCopyLink: true,
    }
  }
  return {
    sessionLine,
    notificationLine: `전자서명 링크는 생성되었지만 알림톡 발송에 실패했습니다. ${mapAlimtalkErrorCategoryToUserMessage(n.errorCategory)}`,
    tone: 'warning',
    showCopyLink: true,
  }
}
