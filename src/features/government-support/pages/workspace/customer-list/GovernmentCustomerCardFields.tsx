import {
  resolveGovernmentCustomerBusinessType,
  resolveGovernmentCustomerCardName,
} from '../../../lib/governmentCustomerListDisplay'
import type { GovCustomerStatusOption, GovSupportProfile } from '../../../types/governmentProfile.types'

type GovernmentCustomerCardFieldsProps = {
  profile: GovSupportProfile
  statusOptions: GovCustomerStatusOption[]
  onStatusChange: (optionId: string | null) => void
  selectId?: string
}

export function useGovernmentCustomerCardDisplay(profile: GovSupportProfile) {
  return {
    title: resolveGovernmentCustomerCardName(profile),
    phone: profile.phone?.trim() || '연락처 없음',
    businessType: resolveGovernmentCustomerBusinessType(profile),
  }
}

export function GovernmentCustomerCardTextFields({
  title,
  phone,
  businessType,
}: {
  title: string
  phone: string
  businessType: string
}) {
  return (
    <>
      <span className="government-customer-card__name">{title}</span>
      <span className="government-customer-card__meta">
        <span className="government-customer-card__phone">{phone}</span>
        <span className="government-customer-card__meta-sep" aria-hidden>
          ·
        </span>
        <span className="government-customer-card__business-type">{businessType}</span>
      </span>
    </>
  )
}

export function GovernmentCustomerCardStatusSelect({
  profile,
  statusOptions,
  onStatusChange,
  selectId,
}: GovernmentCustomerCardFieldsProps) {
  const title = resolveGovernmentCustomerCardName(profile)
  return (
    <select
      id={selectId}
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
  )
}
