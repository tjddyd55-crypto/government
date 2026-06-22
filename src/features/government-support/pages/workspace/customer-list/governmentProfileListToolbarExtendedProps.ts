import type { GovernmentProfileListToolbarProps } from './governmentProfileListToolbarProps'

export type GovernmentProfileListToolbarExtendedProps = GovernmentProfileListToolbarProps & {
  ownerUserId?: string
  ownerOptions?: Array<{ id: string; label: string }>
  onOwnerUserChange?: (value: string) => void
  tenantId?: string
  tenantOptions?: Array<{ id: string; name: string }>
  onTenantChange?: (value: string) => void
  showOwnerFilter?: boolean
  showTenantFilter?: boolean
}
