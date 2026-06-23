import type { ReactNode } from 'react'
import GovernmentProfileListExpandDetail from '../GovernmentProfileListExpandDetail'
import type { GovCustomerStatusOption, GovSupportProfile } from '../../../types/governmentProfile.types'
import {
  GovernmentCustomerCardStatusSelect,
  GovernmentCustomerCardTextFields,
  useGovernmentCustomerCardDisplay,
} from './GovernmentCustomerCardFields'
import '../../../government-customer-list-pc.css'
import '../../../government-customer-card.css'

type GovernmentCustomerCardPCBaseProps = {
  profile: GovSupportProfile
  selected: boolean
  statusOptions: GovCustomerStatusOption[]
  onStatusChange: (optionId: string | null) => void
}

export type GovernmentCustomerCardPCCompactProps = GovernmentCustomerCardPCBaseProps & {
  compact: true
  onSelect: () => void
}

export type GovernmentCustomerCardPCExpandProps = GovernmentCustomerCardPCBaseProps & {
  compact?: false
  expanded: boolean
  deleting: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  showDelete?: boolean
}

export type GovernmentCustomerCardPCProps =
  | GovernmentCustomerCardPCCompactProps
  | GovernmentCustomerCardPCExpandProps

function GovernmentCustomerCardPCSummaryRow({
  profile,
  selected,
  statusOptions,
  onStatusChange,
  summaryButton,
  showChevron,
  chevron,
}: {
  profile: GovSupportProfile
  selected: boolean
  statusOptions: GovCustomerStatusOption[]
  onStatusChange: (optionId: string | null) => void
  summaryButton: ReactNode
  showChevron: boolean
  chevron?: ReactNode
}) {
  return (
    <div
      className={`government-profile-list-card__summary-row government-customer-card__summary-row${
        selected ? ' government-profile-list-card__summary-row--active' : ''
      }${showChevron ? ' government-customer-card__summary-row--expand' : ''}`}
    >
      {summaryButton}
      <GovernmentCustomerCardStatusSelect
        profile={profile}
        statusOptions={statusOptions}
        onStatusChange={onStatusChange}
      />
      {showChevron ? chevron : null}
    </div>
  )
}

export default function GovernmentCustomerCardPC(props: GovernmentCustomerCardPCProps) {
  const { profile, selected, statusOptions, onStatusChange } = props
  const profileId = profile.id
  const { title, phone, businessType } = useGovernmentCustomerCardDisplay(profile)

  if (props.compact) {
    return (
      <li
        className={`record-card customer-card government-customer-card government-customer-card--pc government-profile-list-card government-customer-card--compact${
          selected ? ' government-profile-list-card--active' : ''
        }`}
        data-profile-id={profileId}
        data-profile-selected={selected ? 'true' : 'false'}
      >
        <div className="government-profile-list-card__main government-customer-card__main">
          <GovernmentCustomerCardPCSummaryRow
            profile={profile}
            selected={selected}
            statusOptions={statusOptions}
            onStatusChange={onStatusChange}
            showChevron={false}
            summaryButton={
              <button
                type="button"
                className="government-customer-card__summary government-customer-card__summary--compact"
                aria-current={selected ? 'true' : undefined}
                aria-label={`${title} 선택`}
                onClick={props.onSelect}
              >
                <GovernmentCustomerCardTextFields title={title} phone={phone} businessType={businessType} />
              </button>
            }
          />
        </div>
      </li>
    )
  }

  const { expanded, deleting, onToggle, onEdit, onDelete, showDelete = true } = props

  return (
    <li
      className={`record-card customer-card customer-expand-card government-customer-card government-customer-card--pc government-profile-list-card transition-all duration-150 ease-out${
        selected ? ' government-profile-list-card--active' : ''
      }${expanded ? ' customer-expand-card--focal government-profile-list-card--expanded' : ''}`}
      data-profile-id={profileId}
      data-profile-selected={selected ? 'true' : 'false'}
      data-profile-expanded={expanded ? 'true' : 'false'}
    >
      <div className="customer-expand-card__main government-profile-list-card__main">
        <GovernmentCustomerCardPCSummaryRow
          profile={profile}
          selected={selected}
          statusOptions={statusOptions}
          onStatusChange={onStatusChange}
          showChevron
          summaryButton={
            <button
              type="button"
              className="customer-expand-summary customer-expand-summary--toggle government-customer-card__summary"
              aria-expanded={expanded}
              aria-controls={`government-profile-expand-${profileId}`}
              aria-label={`${title} 상세 ${expanded ? '접기' : '펼치기'}`}
              onClick={onToggle}
            >
              <GovernmentCustomerCardTextFields title={title} phone={phone} businessType={businessType} />
            </button>
          }
          chevron={
            <button
              type="button"
              className="customer-expand-summary__hint government-profile-list-card__chevron government-customer-card__chevron"
              aria-expanded={expanded}
              aria-label={`${title} 상세 ${expanded ? '접기' : '펼치기'}`}
              onClick={(event) => {
                event.stopPropagation()
                onToggle()
              }}
            >
              {expanded ? '▲' : '▼'}
            </button>
          }
        />

        {expanded ? (
          <div id={`government-profile-expand-${profileId}`} className="government-profile-list-card__detail-wrap">
            <GovernmentProfileListExpandDetail
              profile={profile}
              onEdit={onEdit}
              onDelete={onDelete}
              deleting={deleting}
              showDelete={showDelete}
            />
          </div>
        ) : null}
      </div>
    </li>
  )
}
