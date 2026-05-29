import { ApiError } from '../../../lib/apiClient'

const API_ERROR_CODES: Record<string, string> = {
  DB_ERROR: '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  INVALID_TOKEN: '유효하지 않거나 만료된 전자서명 링크입니다.',
  FORBIDDEN: '접근 권한이 없습니다.',
  NOT_FOUND: '문서를 찾을 수 없습니다.',
}

function isLikelyInternalMessage(message: string): boolean {
  const u = message.toUpperCase()
  return (
    u.includes('DB_ERROR') ||
    u.includes('DATABASE') ||
    u.includes('ECONN') ||
    u.includes('ETIMEDOUT') ||
    u.includes('SQL') ||
    u.includes('PG::') ||
    u.includes('OBJECTKEY') ||
    u.includes('FILEKEY') ||
    u.includes('PRESIGN') ||
    u.includes('/API/') ||
    u.includes('UNDEFINED') ||
    u.includes('[OBJECT OBJECT]')
  )
}

/** API/예외 → 이용자·담당자 화면용 문구 */
export function mapGovernmentSignatureApiError(
  e: unknown,
  fallback = '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
): string {
  if (e instanceof ApiError) {
    const codeKey = String(e.code ?? '').trim().toUpperCase()
    if (codeKey && API_ERROR_CODES[codeKey]) {
      return API_ERROR_CODES[codeKey]
    }
    const msgKey = String(e.message ?? '').trim().toUpperCase()
    if (msgKey && API_ERROR_CODES[msgKey]) {
      return API_ERROR_CODES[msgKey]
    }
    if (e.status === 403) {
      return API_ERROR_CODES.FORBIDDEN
    }
    if (e.status === 404) {
      return API_ERROR_CODES.NOT_FOUND
    }
    if (e.status >= 500) {
      return API_ERROR_CODES.DB_ERROR
    }
    return mapGovernmentSignatureErrorMessage(e.message, fallback)
  }
  if (e instanceof Error) {
    return mapGovernmentSignatureErrorMessage(e.message, fallback)
  }
  return fallback
}

export function mapGovernmentSignatureErrorMessage(
  raw: string | null | undefined,
  fallback = '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
): string {
  const msg = String(raw ?? '').trim()
  if (!msg || msg === 'undefined' || msg === 'null') {
    return fallback
  }
  const upper = msg.toUpperCase()
  for (const [code, label] of Object.entries(API_ERROR_CODES)) {
    if (upper === code || upper.includes(code)) {
      return label
    }
  }
  if (isLikelyInternalMessage(msg)) {
    return fallback
  }
  return msg
}

/** 공개 서명·필드 라벨 — fieldKey 등 내부 키는 노출하지 않음 */
export function publicSignatureFieldLabel(label: string | null | undefined): string {
  const t = String(label ?? '').trim()
  return t || '항목'
}

/** 발송·템플릿 폼 라벨 — label 없을 때 fieldKey 대신 일반 문구 */
export function formatSenderFieldLabel(label: string | null | undefined): string {
  return publicSignatureFieldLabel(label)
}

/** 사업장 선택 보조 문구 — profileId 노출 없이 사업장번호만 */
export function formatGovernmentProfilePickMeta(profile: { customerCode?: string | null }): string {
  const code = String(profile.customerCode ?? '').trim()
  return code ? `사업장번호 ${code}` : '—'
}

export function formatIdentityStatusLabel(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim().toLowerCase()
  if (!s) {
    return '—'
  }
  if (s === 'verified' || s === 'identity_verified') {
    return '인증 완료'
  }
  if (s === 'pending') {
    return '대기 중'
  }
  if (s === 'failed') {
    return '실패'
  }
  return '인증 전'
}
