import GovernmentProfileListExpandDetail from '../GovernmentProfileListExpandDetail'
import {
  resolveGovernmentCustomerBusinessType,
  resolveGovernmentCustomerCardName,
  resolveGovernmentCustomerStatusLabel,
} from '../../../lib/governmentCustomerListDisplay'
import type { GovCustomerStatusOption, GovSupportProfile } from '../../../types/governmentProfile.types'
import '../../../government-customer-list-mobile.css'

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
  const title = resolveGovernmentCustomerCardName(profile)
  const phone = profile.phone?.trim() || '연락처 없음'
  const businessType = resolveGovernmentCustomerBusinessType(profile)
  const statusLabel = resolveGovernmentCustomerStatusLabel(profile)
  const statusColor = profile.customerStatusColor || 'var(--gov-workspace-muted, #94a3b8)'

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
          <div className="government-customer-card__name">{title}</div>
          <div className="government-customer-card__phone">{phone}</div>
          <div className="government-customer-card__business-type">{businessType}</div>
          <div className="government-customer-card__status">
            <span className="government-customer-card__status-dot" style={{ backgroundColor: statusColor }} />
            {statusLabel}
          </div>
        </button>
        <select
          className="gov-form-control government-customer-card__status-select"
          value={profile.customerStatusOptionId ?? ''}
          onChange={(e) => onStatusChange(e.target.value || null)}
          aria-label={`${title} 고객상태`}
        >
          <option value="">상태 없음</option>
          {statusOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
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
        <div className="government-customer-card__name">{title}</div>
        <div className="government-customer-card__phone">{phone}</div>
        <div className="government-customer-card__business-type">{businessType}</div>
        <div className="government-customer-card__status">
          <span className="government-customer-card__status-dot" style={{ backgroundColor: statusColor }} />
          {statusLabel}
        </div>
      </button>
      <select
        className="gov-form-control government-customer-card__status-select"
        value={profile.customerStatusOptionId ?? ''}
        onChange={(e) => onStatusChange(e.target.value || null)}
        aria-label={`${title} 고객상태`}
      >
        <option value="">상태 없음</option>
        {statusOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
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
