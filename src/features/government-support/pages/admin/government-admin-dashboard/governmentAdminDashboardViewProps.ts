export type { GovernmentAdminDashboardViewProps } from '../../hooks/useGovernmentAdminDashboardState'

export function formatDashboardDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

export function documentRequestStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return '제출 대기'
    case 'partial':
      return '일부 제출'
    case 'completed':
      return '제출 완료'
    default:
      return status
  }
}

export function inquiryStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return '미답변'
    case 'replied':
      return '답변 완료'
    case 'closed':
      return '종료'
    default:
      return status
  }
}

export function signatureStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return '발송 대기'
    case 'completed':
      return '서명 완료'
    case 'expired':
      return '만료'
    case 'cancelled':
      return '취소'
    default:
      return status
  }
}
