import { normalizeTenantRegistrationCode } from './normalizeTenantRegistrationCode'

/** 기관 코드 가입 경로 — `/government/join/:agencyCode` */
export function buildGovernmentAgencyJoinPath(agencyCode: string): string {
  const code = normalizeTenantRegistrationCode(agencyCode)
  return `/government/join/${code}`
}

/** 현재 origin 기준 전체 가입 URL (클립보드 복사용) */
export function buildGovernmentAgencyJoinUrl(agencyCode: string): string {
  const path = buildGovernmentAgencyJoinPath(agencyCode)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`
  }
  return path
}
