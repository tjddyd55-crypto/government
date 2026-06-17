import type { GovSupportProfile } from '../../types/governmentProfile.types'

export function resolveGovernmentCustomerCardName(profile: GovSupportProfile): string {
  const name = profile.customerName?.trim()
  if (name) return name
  const business = profile.businessName?.trim()
  if (business) return business
  return '이름 없음'
}

export function resolveGovernmentCustomerBusinessType(profile: GovSupportProfile): string {
  const type = profile.businessType?.trim()
  if (type) return type
  const category = profile.businessCategory?.trim()
  if (category) return category
  return '업종 미입력'
}

export function resolveGovernmentCustomerStatusLabel(profile: GovSupportProfile): string {
  return profile.customerStatusLabel?.trim() || '상태 없음'
}

export function collectGovernmentBusinessTypeOptions(profiles: GovSupportProfile[]): string[] {
  const set = new Set<string>()
  for (const row of profiles) {
    const type = resolveGovernmentCustomerBusinessType(row)
    if (type && type !== '업종 미입력') set.add(type)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'ko'))
}
