import type { GovernmentAdminDocumentRequestsViewProps } from '../../../hooks/useGovernmentAdminDocumentRequestsState'
import GovernmentAdminDocumentRequestsBody from './GovernmentAdminDocumentRequestsBody'

export default function GovernmentAdminDocumentRequestsPCView(props: GovernmentAdminDocumentRequestsViewProps) {
  return <GovernmentAdminDocumentRequestsBody {...props} variant="pc" />
}
