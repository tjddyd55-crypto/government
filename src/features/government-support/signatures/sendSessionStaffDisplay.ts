/** FC·USER 발송 내역 화면용 상태 라벨·날짜 포맷 */

export type StaffSessionDateParts = { date: string; time: string }

/** 표 시각: 첫 줄 YYYY.MM.DD, 둘째 줄 오전/오후 시:분 */
export function formatStaffSessionDateParts(value: string | Date | null | undefined): StaffSessionDateParts | null {
  if (value == null) {
    return null
  }
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) {
    return null
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const date = `${y}.${m}.${day}`
  const time = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })
  return { date, time }
}

export function formatStaffSessionDate(value: string | Date | null | undefined): string {
  if (value == null) {
    return '—'
  }
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) {
    return '—'
  }
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 증빙 해시 표시 — 최대 12자 prefix */
export function formatEvidenceHashForTable(prefix: string | null | undefined, maxLen = 12): string {
  if (prefix == null || String(prefix).trim() === '') {
    return ''
  }
  const p = String(prefix).trim()
  const cap = Math.max(1, Math.min(maxLen, 12))
  return p.length <= cap ? p : p.slice(0, cap)
}

export function staffDocumentStatusLabel(status: string): string {
  const s = String(status ?? '').trim()
  if (s === 'pending' || s === 'sent') {
    return '대기 중'
  }
  if (s === 'viewed' || s === 'opened') {
    return '열람됨'
  }
  if (s === 'signing') {
    return '작성 중'
  }
  if (s === 'signed') {
    return '서명 완료'
  }
  if (s === 'completed') {
    return '완료'
  }
  if (s === 'cancelled') {
    return '취소됨'
  }
  if (s === 'expired') {
    return '만료됨'
  }
  if (s === 'failed') {
    return '실패'
  }
  return s ? '처리 중' : '—'
}

export function staffSendSessionDisplayLabel(
  sessionStatus: string,
  opts?: { hasSignedNotCompleted?: boolean },
): string {
  const st = String(sessionStatus ?? '')
  const signedPending = Boolean(opts?.hasSignedNotCompleted)
  if (st === 'cancelled') {
    return '취소됨'
  }
  if (st === 'expired') {
    return '만료됨'
  }
  if (st === 'completed') {
    return '완료'
  }
  if (st === 'pending' || st === 'sent') {
    return '발송됨'
  }
  if (st === 'opened') {
    return '열람됨'
  }
  if (st === 'signed') {
    return '서명 완료'
  }
  if (st === 'failed') {
    return '실패'
  }
  if (st === 'identity_verified') {
    return '인증 완료'
  }
  if (st === 'signing') {
    return signedPending ? '서명 완료' : '작성 중'
  }
  return st ? '처리 중' : '—'
}
