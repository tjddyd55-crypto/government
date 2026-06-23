import { progressStatusBadgeTone } from '../utils/governmentProfileProgressSummary'

export type GovStatusPillTone = 'neutral' | 'amber' | 'blue' | 'green' | 'red'

export function resolveGovStatusPillTone(label: string | undefined, value: string): GovStatusPillTone {
  const normalizedLabel = String(label ?? '').trim()
  const normalizedValue = String(value ?? '').trim()
  if (!normalizedValue || normalizedValue === '—') {
    return 'neutral'
  }

  if (normalizedLabel === '신청 상태' || normalizedLabel === '진행 상태') {
    return progressStatusBadgeTone(normalizedValue)
  }

  if (normalizedLabel === '상담 상태' || normalizedLabel === '서류 상태') {
    const lower = normalizedValue.toLowerCase()
    if (/완료|승인|정상/.test(normalizedValue)) return 'green'
    if (/대기|준비|진행/.test(normalizedValue)) return 'amber'
    if (/거절|반려|오류|실패/.test(normalizedValue)) return 'red'
    if (lower.includes('ing')) return 'blue'
    return 'neutral'
  }

  return 'neutral'
}
