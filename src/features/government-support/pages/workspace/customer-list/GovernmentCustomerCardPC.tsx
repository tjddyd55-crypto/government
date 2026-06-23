import {
  resolveGovernmentCustomerBusinessType,
  resolveGovernmentCustomerCardName,
  resolveGovernmentCustomerStatusLabel,
} from '../../../lib/governmentCustomerListDisplay'
import type { GovCustomerStatusOption, GovSupportProfile } from '../../../types/governmentProfile.types'
import '../../../government-customer-list-pc.css'

export type GovernmentCustomerCardPCProps = {
  profile: GovSupportProfile
  selected: boolean
  statusOptions: GovCustomerStatusOption[]
  onSelect: () => void
  onStatusChange: (optionId: string | null) => void
}

export default function GovernmentCustomerCardPC({
  profile,
  selected,
  statusOptions,
  onSelect,
  onStatusChange,
}: GovernmentCustomerCardPCProps) {
  const profileId = profile.id
  const title = resolveGovernmentCustomerCardName(profile)
  const phone = profile.phone?.trim() || '연락처 없음'
  const businessType = resolveGovernmentCustomerBusinessType(profile)
  const statusLabel = resolveGovernmentCustomerStatusLabel(profile)
  const statusColor = profile.customerStatusColor || 'var(--gov-workspace-muted, #94a3b8)'

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
            onClick={onSelect}
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
