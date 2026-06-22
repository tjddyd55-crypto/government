import type { GovSupportProfile } from '../types/governmentProfile.types'

export type GovernmentProfileOwnerGroup = {
  ownerUserId: string
  ownerLabel: string
  ownerLoginId: string | null
  profiles: GovSupportProfile[]
}

const UNKNOWN_OWNER_ID = '__unknown_owner__'
const UNKNOWN_OWNER_LABEL = '미지정 담당자'

function resolveOwnerLabel(profile: GovSupportProfile): string {
  const display = profile.ownerDisplayName?.trim()
  if (display) return display
  const login = profile.ownerUsername?.trim()
  if (login) return login
  return UNKNOWN_OWNER_LABEL
}

function resolveOwnerLoginId(profile: GovSupportProfile): string | null {
  const login = profile.ownerUsername?.trim()
  return login || null
}

function resolveOwnerUserId(profile: GovSupportProfile): string {
  const id = String(profile.ownerUserId ?? '').trim()
  return id || UNKNOWN_OWNER_ID
}

/**
 * 대행사 관리자 고객 목록 — ownerUserId 기준 그룹 (빈 그룹은 호출 전 필터링).
 */
export function groupGovernmentProfilesByOwner(profiles: GovSupportProfile[]): GovernmentProfileOwnerGroup[] {
  const byOwner = new Map<string, GovernmentProfileOwnerGroup>()

  for (const profile of profiles) {
    const ownerUserId = resolveOwnerUserId(profile)
    const existing = byOwner.get(ownerUserId)
    if (existing) {
      existing.profiles.push(profile)
      continue
    }
    byOwner.set(ownerUserId, {
      ownerUserId,
      ownerLabel: resolveOwnerLabel(profile),
      ownerLoginId: resolveOwnerLoginId(profile),
      profiles: [profile],
    })
  }

  return [...byOwner.values()].sort((a, b) => {
    if (a.ownerUserId === UNKNOWN_OWNER_ID) return 1
    if (b.ownerUserId === UNKNOWN_OWNER_ID) return -1
    return a.ownerLabel.localeCompare(b.ownerLabel, 'ko')
  })
}

export function formatGovernmentOwnerGroupTitle(group: GovernmentProfileOwnerGroup): string {
  const loginSuffix = group.ownerLoginId && group.ownerLoginId !== group.ownerLabel
    ? ` (${group.ownerLoginId})`
    : ''
  return `${group.ownerLabel}${loginSuffix} · 고객 ${group.profiles.length}명`
}
