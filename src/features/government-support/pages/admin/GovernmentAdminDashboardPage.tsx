import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import { useAuth } from '../../../auth/AuthProvider'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'
import {
  useGovernmentAdminDashboardState,
  type GovernmentAdminDashboardViewProps,
} from '../../hooks/useGovernmentAdminDashboardState'
import GovernmentAdminDashboardMobileView from './government-admin-dashboard/GovernmentAdminDashboardMobileView'
import GovernmentAdminDashboardPCView from './government-admin-dashboard/GovernmentAdminDashboardPCView'

export default function GovernmentAdminDashboardPage() {
  const { token } = useAuth()
  const { summary: accessSummary } = useGovernmentAccess(token)
  const viewProps = useGovernmentAdminDashboardState(token, accessSummary)

  return (
    <ResponsiveLayout<GovernmentAdminDashboardViewProps>
      PC={GovernmentAdminDashboardPCView}
      Mobile={GovernmentAdminDashboardMobileView}
      viewProps={viewProps}
    />
  )
}
