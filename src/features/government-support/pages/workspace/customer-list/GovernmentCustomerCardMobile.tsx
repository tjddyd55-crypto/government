import GovernmentProfileListExpandDetail from '../GovernmentProfileListExpandDetail'
import type { GovCustomerStatusOption, GovSupportProfile } from '../../../types/governmentProfile.types'
import {
  GovernmentCustomerCardStatusSelect,
  GovernmentCustomerCardTextFields,
  useGovernmentCustomerCardDisplay,
} from './GovernmentCustomerCardFields'
import '../../../government-customer-list-mobile.css'
import '../../../government-customer-card.css'

type GovernmentCustomerCardMobileBaseProps = {
  profile: GovSupportProfile
  selected: boolean
  statusOptions: GovCustomerStatusOption[]
  onStatusChange: (optionId: string | null) => void
}

export type GovernmentCustomerCardMobileCompactProps = GovernmentCustomerCardMobileBaseProps & {
  compact: true
  onSelect: () => void
}

export type GovernmentCustomerCardMobileExpandProps = GovernmentCustomerCardMobileBaseProps & {
  compact?: false
  expanded: boolean
  deleting: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  showDelete?: boolean
}

export type GovernmentCustomerCardMobileProps =
  | GovernmentCustomerCardMobileCompactProps
  | GovernmentCustomerCardMobileExpandProps

export default function GovernmentCustomerCardMobile(props: GovernmentCustomerCardMobileProps) {
  const { profile, selected, statusOptions, onStatusChange } = props
  const profileId = profile.id
  const { title, phone, businessType } = useGovernmentCustomerCardDisplay(profile)

  const statusSelect = (
    <GovernmentCustomerCardStatusSelect
      profile={profile}
      statusOptions={statusOptions}
      onStatusChange={onStatusChange}
    />
  )

  if (props.compact) {
    return (
      <li
        className={`government-customer-card government-customer-card--mobile government-profile-list-card government-customer-card--compact${
          selected ? ' government-profile-list-card--active' : ''
        }`}
        data-profile-id={profileId}
        data-profile-selected={selected ? 'true' : 'false'}
      >
        <button type="button" className="government-customer-card__tap" onClick={props.onSelect}>
          <GovernmentCustomerCardTextFields title={title} phone={phone} businessType={businessType} />
        </button>
        {statusSelect}
      </li>
    )
  }

  const { expanded, deleting, onToggle, onEdit, onDelete, showDelete = true } = props

  return (
    <li
      className={`government-customer-card government-customer-card--mobile government-profile-list-card${
        selected ? ' government-profile-list-card--active' : ''
      }${expanded ? ' government-profile-list-card--expanded' : ''}`}
      data-profile-id={profileId}
    >
      <button type="button" className="government-customer-card__tap" onClick={onToggle}>
        <GovernmentCustomerCardTextFields title={title} phone={phone} businessType={businessType} />
      </button>
      {statusSelect}
      {expanded ? (
        <div className="government-profile-list-card__detail-wrap">
          <GovernmentProfileListExpandDetail
            profile={profile}
            onEdit={onEdit}
            onDelete={onDelete}
            deleting={deleting}
            showDelete={showDelete}
          />
        </div>
      ) : null}
    </li>
  )
}
