import type { GovernmentAdminCustomersViewProps } from '../../../hooks/useGovernmentAdminCustomersState'
import GovernmentAdminCustomersBody from './GovernmentAdminCustomersBody'

export default function GovernmentAdminCustomersMobileView(props: GovernmentAdminCustomersViewProps) {
  return <GovernmentAdminCustomersBody {...props} variant="mobile" />
}
