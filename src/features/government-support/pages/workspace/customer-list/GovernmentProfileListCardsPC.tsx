import { useMemo, useState } from 'react'
import GovernmentCustomerCardPC from './GovernmentCustomerCardPC'
import GovernmentCustomerGroupSection from './GovernmentCustomerGroupSection'
import { groupGovernmentProfilesByOwner } from '../../../lib/groupGovernmentProfilesByOwner'
import { isSameGovProfileId, normalizeGovProfileId } from '../../../lib/governmentProfileDocumentCategories'
import type { GovCustomerStatusOption, GovSupportProfile } from '../../../types/governmentProfile.types'

export type GovernmentProfileListCardsPCProps = {
  profiles: GovSupportProfile[]
  showOwnerGroups: boolean
  selectedProfileIdFromPath: string | null
  expandedProfileId: string | null
  deletingId: string | null
  statusOptions: GovCustomerStatusOption[]
  canDeleteProfile: boolean
  onToggle: (profileId: string) => void
  onEdit: (profile: GovSupportProfile) => void
  onDelete: (profile: GovSupportProfile) => void
  onStatusChange: (profileId: string, optionId: string | null) => void
}

function renderCard(
  row: GovSupportProfile,
  props: Omit<GovernmentProfileListCardsPCProps, 'profiles' | 'showOwnerGroups'>,
) {
  const profileId = normalizeGovProfileId(row.id)
  const pathId = normalizeGovProfileId(props.selectedProfileIdFromPath)
  const selected = isSameGovProfileId(profileId, pathId)
  const expanded = isSameGovProfileId(profileId, props.expandedProfileId)

  return (
    <GovernmentCustomerCardPC
      key={profileId}
      profile={row}
      selected={selected}
      expanded={expanded}
      deleting={isSameGovProfileId(props.deletingId, profileId)}
      statusOptions={props.statusOptions}
      onToggle={() => props.onToggle(profileId)}
      onEdit={() => props.onEdit(row)}
      onDelete={props.canDeleteProfile ? () => props.onDelete(row) : () => {}}
      onStatusChange={(optionId) => void props.onStatusChange(profileId, optionId)}
      showDelete={props.canDeleteProfile}
    />
  )
}

export default function GovernmentProfileListCardsPC({
  profiles,
  showOwnerGroups,
  ...cardProps
}: GovernmentProfileListCardsPCProps) {
  const groups = useMemo(
    () => (showOwnerGroups ? groupGovernmentProfilesByOwner(profiles) : []),
    [profiles, showOwnerGroups],
  )
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  if (!showOwnerGroups) {
    return (
      <>
        {profiles.map((row) => renderCard(row, cardProps))}
      </>
    )
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
