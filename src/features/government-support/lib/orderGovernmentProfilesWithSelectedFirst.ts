import { isSameGovProfileId, normalizeGovProfileId } from './governmentProfileDocumentCategories'
import type { GovernmentProfileOwnerGroup } from './groupGovernmentProfilesByOwner'
import type { GovSupportProfile } from '../types/governmentProfile.types'

/**
 * 필터/검색 결과 유지 — 선택 고객만 맨 앞으로 stable sort.
 * 중복 렌더링 없음.
 */
export function orderGovernmentProfilesWithSelectedFirst(
  profiles: GovSupportProfile[],
  selectedProfileId: string | null | undefined,
): GovSupportProfile[] {
  const selectedId = normalizeGovProfileId(selectedProfileId ?? null)
  if (!selectedId || profiles.length < 2) return profiles

  const selectedIndex = profiles.findIndex((profile) => isSameGovProfileId(profile.id, selectedId))
  if (selectedIndex <= 0) return profiles

  const selected = profiles[selectedIndex]
  return [selected, ...profiles.filter((_, index) => index !== selectedIndex)]
}

/** 유저별 그룹 — 선택 고객 그룹을 최상단, 그룹 내 선택 고객도 최상단 */
export function orderGovernmentOwnerGroupsWithSelectedFirst(
  groups: GovernmentProfileOwnerGroup[],
  selectedProfileId: string | null | undefined,
): GovernmentProfileOwnerGroup[] {
  const selectedId = normalizeGovProfileId(selectedProfileId ?? null)

  const withOrderedProfiles = groups.map((group) => ({
    ...group,
    profiles: orderGovernmentProfilesWithSelectedFirst(group.profiles, selectedId),
  }))

  if (!selectedId || withOrderedProfiles.length < 2) return withOrderedProfiles

  const groupIndex = withOrderedProfiles.findIndex((group) =>
    group.profiles.some((profile) => isSameGovProfileId(profile.id, selectedId)),
  )
  if (groupIndex <= 0) return withOrderedProfiles

  const selectedGroup = withOrderedProfiles[groupIndex]
  return [
    selectedGroup,
    ...withOrderedProfiles.filter((_, index) => index !== groupIndex),
  ]
}
