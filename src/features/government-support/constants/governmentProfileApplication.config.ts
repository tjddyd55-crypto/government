/** 보험 ClaimRequests STATUS_OPTIONS 대응 — 신청 상태 */
export const GOVERNMENT_PROFILE_APPLICATION_STATUSES = [
  { value: 'requested', label: '요청됨' },
  { value: 'processing', label: '처리중' },
  { value: 'done', label: '완료' },
  { value: 'rejected', label: '반려' },
  { value: 'canceled', label: '취소' },
] as const

export type GovernmentProfileApplicationStatus =
  (typeof GOVERNMENT_PROFILE_APPLICATION_STATUSES)[number]['value']

export const GOVERNMENT_PROFILE_APPLICATION_TYPES = [
  '정부지원금',
  '융자',
  '보증',
  '세제 혜택',
  '기타',
] as const

export const GOVERNMENT_PROFILE_APPLICATION_CONTENT_MAX = 20000
export const GOVERNMENT_PROFILE_APPLICATION_TITLE_MAX = 500

export function governmentProfileApplicationStatusLabel(status: string): string {
  return GOVERNMENT_PROFILE_APPLICATION_STATUSES.find((item) => item.value === status)?.label ?? status
}

export function governmentProfileApplicationStatusBadgeClass(status: string): string {
  switch (status) {
    case 'done':
      return 'claim-requests-page__badge claim-requests-page__badge--done'
    case 'processing':
      return 'claim-requests-page__badge claim-requests-page__badge--processing'
    case 'requested':
      return 'claim-requests-page__badge claim-requests-page__badge--requested'
    case 'rejected':
    case 'canceled':
      return 'claim-requests-page__badge claim-requests-page__badge--rejected'
    default:
      return 'claim-requests-page__badge'
  }
}

export function formatGovernmentProfileApplicationDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

export function governmentProfileApplicationListPreview(content: string, title: string): string {
  const raw = content.trim() || title.trim() || ''
  if (!raw) {
    return '내용 없음'
  }
  if (raw.length <= 140) {
    return raw
  }
  return `${raw.slice(0, 137)}…`
}
