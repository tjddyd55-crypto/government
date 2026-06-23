import GovernmentProfileListExpandDetail from '../GovernmentProfileListExpandDetail'
import {
  resolveGovernmentCustomerBusinessType,
  resolveGovernmentCustomerCardName,
  resolveGovernmentCustomerStatusLabel,
} from '../../../lib/governmentCustomerListDisplay'
import type { GovCustomerStatusOption, GovSupportProfile } from '../../../types/governmentProfile.types'
import '../../../government-customer-list-pc.css'

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

export default function GovernmentCustomerCardPC(props: GovernmentCustomerCardPCProps) {
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
        className={`record-card customer-card government-customer-card government-customer-card--pc government-profile-list-card government-customer-card--compact${
          selected ? ' government-profile-list-card--active' : ''
        }`}
        data-profile-id={profileId}
        data-profile-selected={selected ? 'true' : 'false'}
      >
        <div className="government-profile-list-card__main government-customer-card__main">
          <div
            className={`government-profile-list-card__summary-row government-customer-card__summary-row${
              selected ? ' government-profile-list-card__summary-row--active' : ''
            }`}
          >
            <button
              type="button"
              className="government-customer-card__summary government-customer-card__summary--compact"
              aria-current={selected ? 'true' : undefined}
              aria-label={`${title} 선택`}
              onClick={props.onSelect}
            >
              <span className="government-customer-card__primary">
                <strong className="government-customer-card__name">{title}</strong>
                <span className="government-customer-card__phone">{phone}</span>
                <span className="government-customer-card__business-type">{businessType}</span>
                <span className="government-customer-card__status">
                  <span
                    className="government-customer-card__status-dot"
                    style={{ backgroundColor: statusColor }}
                    aria-hidden
                  />
                  {statusLabel}
                </span>
              </span>
            </button>
            <select
              className="gov-form-control government-customer-card__status-select"
              value={profile.customerStatusOptionId ?? ''}
              onChange={(e) => onStatusChange(e.target.value || null)}
              aria-label={`${title} 고객상태`}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">상태 없음</option>
              {statusOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
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
        <div
          className={`government-profile-list-card__summary-row${
            selected ? ' government-profile-list-card__summary-row--active' : ''
          }`}
        >
          <button
            type="button"
            className="customer-expand-summary customer-expand-summary--toggle government-customer-card__summary"
            aria-expanded={expanded}
            aria-controls={`government-profile-expand-${profileId}`}
            aria-label={`${title} 상세 ${expanded ? '접기' : '펼치기'}`}
            onClick={onToggle}
          >
            <span className="government-customer-card__primary">
              <strong className="government-customer-card__name">{title}</strong>
              <span className="government-customer-card__phone">{phone}</span>
              <span className="government-customer-card__business-type">{businessType}</span>
              <span className="government-customer-card__status">
                <span
                  className="government-customer-card__status-dot"
                  style={{ backgroundColor: statusColor }}
                  aria-hidden
                />
                {statusLabel}
              </span>
            </span>
          </button>
          <select
            className="gov-form-control government-customer-card__status-select"
            value={profile.customerStatusOptionId ?? ''}
            onChange={(e) => onStatusChange(e.target.value || null)}
            aria-label={`${title} 고객상태`}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">상태 없음</option>
            {statusOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="customer-expand-summary__hint government-profile-list-card__chevron"
            aria-expanded={expanded}
            aria-label={`${title} 상세 ${expanded ? '접기' : '펼치기'}`}
            onClick={(event) => {
              event.stopPropagation()
              onToggle()
            }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>

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
