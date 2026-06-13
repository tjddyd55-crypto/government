/** 이용자 문의/요청 유형 — API title prefix 로 저장 */
export const GOVERNMENT_USER_INQUIRY_TYPES = [
  { value: 'inconvenience', label: '프로그램 불편사항' },
  { value: 'feature', label: '기능 요청' },
  { value: 'usage', label: '사용 문의' },
  { value: 'bug', label: '오류 신고' },
  { value: 'other', label: '기타' },
] as const

export type GovernmentUserInquiryType = (typeof GOVERNMENT_USER_INQUIRY_TYPES)[number]['value']

export function labelForGovernmentUserInquiryType(value: string): string {
  return GOVERNMENT_USER_INQUIRY_TYPES.find((t) => t.value === value)?.label ?? value
}

export function buildGovernmentUserInquiryTitle(type: string, title: string): string {
  const label = labelForGovernmentUserInquiryType(type)
  const trimmed = title.trim()
  if (trimmed) return `[${label}] ${trimmed}`
  return label
}

export function parseGovernmentUserInquiryTypeFromTitle(title: string | null | undefined): {
  typeLabel: string
  displayTitle: string
} {
  const raw = String(title ?? '').trim()
  const match = raw.match(/^\[(.+?)\]\s*(.*)$/)
  if (!match) return { typeLabel: '문의', displayTitle: raw || '문의' }
  return { typeLabel: match[1], displayTitle: match[2].trim() || match[1] }
}

function inquiryStatusMeta(status: string): { label: string; className: string } {
  switch (status) {
    case 'closed':
      return { label: '완료', className: 'government-user-inquiry-status government-user-inquiry-status--done' }
    case 'replied':
      return { label: '답변됨', className: 'government-user-inquiry-status government-user-inquiry-status--replied' }
    default:
      return { label: '대기', className: 'government-user-inquiry-status government-user-inquiry-status--pending' }
  }
}

export { inquiryStatusMeta as governmentUserInquiryStatusMeta }
