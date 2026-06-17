import type { GovernmentAdminCustomersViewProps } from '../../../hooks/useGovernmentAdminCustomersState'
import GovernmentAdminCustomersBody from './GovernmentAdminCustomersBody'

export default function GovernmentAdminCustomersPCView(props: GovernmentAdminCustomersViewProps) {
  return <GovernmentAdminCustomersBody {...props} variant="pc" />
}
