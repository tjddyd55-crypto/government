import { useNavigate } from 'react-router-dom'
import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import { useAuth } from '../../../auth/AuthProvider'
import {
  useGovernmentAdminNotificationsState,
  type GovernmentAdminNotificationsViewProps,
} from '../../hooks/useGovernmentAdminNotificationsState'
import GovernmentAdminNotificationsMobileView from './government-admin-notifications/GovernmentAdminNotificationsMobileView'
import GovernmentAdminNotificationsPCView from './government-admin-notifications/GovernmentAdminNotificationsPCView'

export default function GovernmentAdminNotificationsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const viewProps = useGovernmentAdminNotificationsState(token, navigate)

  return (
    <ResponsiveLayout<GovernmentAdminNotificationsViewProps>
      PC={GovernmentAdminNotificationsPCView}
      Mobile={GovernmentAdminNotificationsMobileView}
      viewProps={viewProps}
    />
  )
}
