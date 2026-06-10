import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import { useAuth } from '../../../auth/AuthProvider'
import {
  useGovernmentAdminDocumentRequestsState,
  type GovernmentAdminDocumentRequestsViewProps,
} from '../../hooks/useGovernmentAdminDocumentRequestsState'
import GovernmentAdminDocumentRequestsMobileView from './government-admin-document-requests/GovernmentAdminDocumentRequestsMobileView'
import GovernmentAdminDocumentRequestsPCView from './government-admin-document-requests/GovernmentAdminDocumentRequestsPCView'

export default function GovernmentAdminDocumentRequestsPage() {
  const { token } = useAuth()
  const viewProps = useGovernmentAdminDocumentRequestsState(token)

  return (
    <ResponsiveLayout<GovernmentAdminDocumentRequestsViewProps>
      PC={GovernmentAdminDocumentRequestsPCView}
      Mobile={GovernmentAdminDocumentRequestsMobileView}
      viewProps={viewProps}
    />
  )
}
