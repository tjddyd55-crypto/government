import { useMemo, useState } from 'react'
import GovernmentCustomerCardMobile from './GovernmentCustomerCardMobile'
import GovernmentCustomerGroupSection from './GovernmentCustomerGroupSection'
import { groupGovernmentProfilesByOwner } from '../../../lib/groupGovernmentProfilesByOwner'
import { orderGovernmentOwnerGroupsWithSelectedFirst, orderGovernmentProfilesWithSelectedFirst } from '../../../lib/orderGovernmentProfilesWithSelectedFirst'
import { isSameGovProfileId, normalizeGovProfileId } from '../../../lib/governmentProfileDocumentCategories'
import type { GovCustomerStatusOption, GovSupportProfile } from '../../../types/governmentProfile.types'

export type GovernmentProfileListCardsMobileProps = {
  profiles: GovSupportProfile[]
  showOwnerGroups: boolean
  selectedProfileIdFromPath: string | null
  statusOptions: GovCustomerStatusOption[]
  onSelect: (profileId: string) => void
  onStatusChange: (profileId: string, optionId: string | null) => void
}

function renderCard(
  row: GovSupportProfile,
  props: Omit<GovernmentProfileListCardsMobileProps, 'profiles' | 'showOwnerGroups'>,
) {
  const profileId = normalizeGovProfileId(row.id)
  const pathId = normalizeGovProfileId(props.selectedProfileIdFromPath)
  const selected = isSameGovProfileId(profileId, pathId)

  return (
    <GovernmentCustomerCardMobile
      key={profileId}
      compact
      profile={row}
      selected={selected}
      statusOptions={props.statusOptions}
      onSelect={() => props.onSelect(profileId)}
      onStatusChange={(optionId) => void props.onStatusChange(profileId, optionId)}
    />
  )
}

export default function GovernmentProfileListCardsMobile({
  profiles,
  showOwnerGroups,
  ...cardProps
}: GovernmentProfileListCardsMobileProps) {
  const groups = useMemo(
    () =>
      showOwnerGroups
        ? orderGovernmentOwnerGroupsWithSelectedFirst(
            groupGovernmentProfilesByOwner(profiles),
            cardProps.selectedProfileIdFromPath,
          )
        : [],
    [profiles, showOwnerGroups, cardProps.selectedProfileIdFromPath],
  )
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const orderedProfiles = useMemo(
    () => orderGovernmentProfilesWithSelectedFirst(profiles, cardProps.selectedProfileIdFromPath),
    [profiles, cardProps.selectedProfileIdFromPath],
  )

  if (!showOwnerGroups) {
    return <>{orderedProfiles.map((row) => renderCard(row, cardProps))}</>
  }

  return (
    <>
      {groups.map((group) => {
        const collapsed = collapsedGroups[group.ownerUserId] === true
        return (
          <GovernmentCustomerGroupSection
            key={group.ownerUserId}
            group={group}
            collapsed={collapsed}
            onToggleCollapse={() =>
              setCollapsedGroups((prev) => ({
                ...prev,
                [group.ownerUserId]: !collapsed,
              }))
            }
          >
            {group.profiles.map((row) => renderCard(row, cardProps))}
          </GovernmentCustomerGroupSection>
        )
      })}
    </>
  )
}
