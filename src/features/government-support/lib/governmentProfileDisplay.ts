/** 사업장/신청 목록·expanded 카드 표시용 (민감정보 마스킹) */

export function maskBusinessNumber(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length < 7) {
    return raw.trim() || '—'
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}**-${digits.slice(7)}`
  }
  return `${digits.slice(0, 3)}-**-${digits.slice(-4)}`
}

export function formatGovProfileDateTime(value: string | undefined | null): string {
  const raw = String(value ?? '').trim()
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function displayGovField(value: string | undefined | null): string {
  const trimmed = String(value ?? '').trim()
  return trimmed || '—'
}
