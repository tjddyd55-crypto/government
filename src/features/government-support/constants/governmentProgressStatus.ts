/** 진행상황 탭 SSOT — 운영 6단계 (DB migration 없음, UI·신규 입력 기준) */
export const GOVERNMENT_PROGRESS_STATUS_VALUES = [
  '서류준비중',
  '서류발급 완료',
  '접수대기',
  '접수중',
  '심사중',
  '최종승인',
] as const

export type GovernmentProgressStatus = (typeof GOVERNMENT_PROGRESS_STATUS_VALUES)[number]

export const GOVERNMENT_PROGRESS_STATUS_LABELS: Record<GovernmentProgressStatus, string> = {
  서류준비중: '서류준비중',
  '서류발급 완료': '서류발급 완료',
  접수대기: '접수대기',
  접수중: '접수중',
  심사중: '심사중',
  최종승인: '최종승인',
}

export const GOVERNMENT_PROGRESS_STATUS_OPTIONS = GOVERNMENT_PROGRESS_STATUS_VALUES.map((value) => ({
  value,
  label: GOVERNMENT_PROGRESS_STATUS_LABELS[value],
}))

const LEGACY_PROGRESS_STATUS_MAP: Record<string, GovernmentProgressStatus> = {
  '상담 접수': '서류준비중',
  '정보 확인 중': '서류준비중',
  '상품 검토': '서류준비중',
  '서류 요청': '서류준비중',
  '서류 수집 중': '서류준비중',
  '서류 검토': '서류준비중',
  '보완 요청': '서류준비중',
  '부결': '서류준비중',
  '접수 가능': '접수대기',
  '접수 준비': '접수대기',
  '전자문서 발송': '서류발급 완료',
  '전자서명 완료': '서류발급 완료',
  '접수 완료': '접수중',
  '심사 중': '심사중',
  심사중: '심사중',
  승인: '최종승인',
  '수임료 청구': '최종승인',
  '수임료 완료': '최종승인',
  종료: '최종승인',
}

function normalizeStatusKey(raw: string): string {
  return raw.replace(/\s+/g, '').toLowerCase()
}

function inferProgressStatusFromKeywords(raw: string): GovernmentProgressStatus | null {
  const norm = normalizeStatusKey(raw)
  if (!norm) return null
  if (/최종|승인|완료|종료|수임/.test(norm) && !/미완|불완|미승|불승|부결|반려/.test(norm)) {
    return '최종승인'
  }
  if (/심사|검토/.test(norm)) return '심사중'
  if (/접수중|접수진행|접수완료/.test(norm)) return '접수중'
  if (/접수대기|접수예정|접수준비|접수가능/.test(norm)) return '접수대기'
  if (/발급|전자문서|전자서명/.test(norm)) return '서류발급 완료'
  if (/서류|보완|준비|상담|정보|수집|부결|반려/.test(norm)) return '서류준비중'
  return null
}

/** legacy·공백 변형 포함 — 화면 표시·select value용 canonical 6값 반환 */
export function normalizeGovernmentProgressStatus(raw: string | null | undefined): GovernmentProgressStatus {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return GOVERNMENT_PROGRESS_STATUS_VALUES[0]
  if ((GOVERNMENT_PROGRESS_STATUS_VALUES as readonly string[]).includes(trimmed)) {
    return trimmed as GovernmentProgressStatus
  }
  const direct = LEGACY_PROGRESS_STATUS_MAP[trimmed]
  if (direct) return direct
  const compact = trimmed.replace(/\s+/g, '')
  for (const [legacy, mapped] of Object.entries(LEGACY_PROGRESS_STATUS_MAP)) {
    if (legacy.replace(/\s+/g, '') === compact) return mapped
  }
  const inferred = inferProgressStatusFromKeywords(trimmed)
  if (inferred) return inferred
  return GOVERNMENT_PROGRESS_STATUS_VALUES[0]
}

export function getGovernmentProgressStatusLabel(raw: string | null | undefined): string {
  const normalized = normalizeGovernmentProgressStatus(raw)
  return GOVERNMENT_PROGRESS_STATUS_LABELS[normalized]
}
