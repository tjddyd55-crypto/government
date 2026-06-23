import type { ReactNode } from 'react'
import { formatGovernmentOwnerGroupTitle, type GovernmentProfileOwnerGroup } from '../../../lib/groupGovernmentProfilesByOwner'

export type GovernmentCustomerGroupSectionProps = {
  group: GovernmentProfileOwnerGroup
  collapsed?: boolean
  onToggleCollapse?: () => void
  children: ReactNode
}

export default function GovernmentCustomerGroupSection({
  group,
  collapsed = false,
  onToggleCollapse,
  children,
}: GovernmentCustomerGroupSectionProps) {
  const title = formatGovernmentOwnerGroupTitle(group)

  return (
    <li className="government-customer-owner-group">
      <div className="government-customer-owner-group__header">
        <h2 className="government-customer-owner-group__title">{title}</h2>
        {onToggleCollapse ? (
          <button
            type="button"
            className="government-customer-owner-group__toggle gov-btn gov-btn--secondary gov-btn--sm"
            aria-expanded={!collapsed}
            onClick={onToggleCollapse}
          >
            {collapsed ? '펼치기' : '접기'}
          </button>
        ) : null}
      </div>
      {!collapsed ? (
        <ul className="government-customer-owner-group__list">{children}</ul>
      ) : null}
    </li>
  )
}
