import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import { useAuth } from '../../../auth/AuthProvider'
import {
  useGovernmentAdminInquiriesState,
  type GovernmentAdminInquiriesViewProps,
} from '../../hooks/useGovernmentAdminInquiriesState'
import GovernmentAdminInquiriesMobileView from './government-admin-inquiries/GovernmentAdminInquiriesMobileView'
import GovernmentAdminInquiriesPCView from './government-admin-inquiries/GovernmentAdminInquiriesPCView'

export default function GovernmentAdminInquiriesPage() {
  const { token } = useAuth()
  const viewProps = useGovernmentAdminInquiriesState(token)

  return (
    <ResponsiveLayout<GovernmentAdminInquiriesViewProps>
      PC={GovernmentAdminInquiriesPCView}
      Mobile={GovernmentAdminInquiriesMobileView}
      viewProps={viewProps}
    />
  )
}
