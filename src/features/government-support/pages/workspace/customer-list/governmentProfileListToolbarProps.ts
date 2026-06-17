import type { GovCustomerStatusOption } from '../../types/governmentProfile.types'

export type GovernmentProfileListToolbarProps = {
  search: string
  customerStatusOptionId: string
  businessType: string
  businessTypeOptions: string[]
  statusOptions: GovCustomerStatusOption[]
  onSearchChange: (value: string) => void
  onCustomerStatusChange: (value: string) => void
  onBusinessTypeChange: (value: string) => void
  onAddProfile: () => void
}
