import type { GovernmentAdminDocumentRequestsViewProps } from '../../../hooks/useGovernmentAdminDocumentRequestsState'
import GovernmentAdminDocumentRequestsBody from './GovernmentAdminDocumentRequestsBody'

export default function GovernmentAdminDocumentRequestsMobileView(props: GovernmentAdminDocumentRequestsViewProps) {
  return <GovernmentAdminDocumentRequestsBody {...props} variant="mobile" />
}
