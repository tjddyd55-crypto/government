import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import { useAuth } from '../../../auth/AuthProvider'
import {
  useGovernmentAdminCustomersState,
  type GovernmentAdminCustomersViewProps,
} from '../../hooks/useGovernmentAdminCustomersState'
import GovernmentAdminCustomersMobileView from './government-admin-customers/GovernmentAdminCustomersMobileView'
import GovernmentAdminCustomersPCView from './government-admin-customers/GovernmentAdminCustomersPCView'

export default function GovernmentAdminCustomersPage() {
  const { token } = useAuth()
  const viewProps = useGovernmentAdminCustomersState(token)

  return (
    <ResponsiveLayout<GovernmentAdminCustomersViewProps>
      PC={GovernmentAdminCustomersPCView}
      Mobile={GovernmentAdminCustomersMobileView}
      viewProps={viewProps}
    />
  )
}
