import type { GovernmentAdminInquiriesViewProps } from '../../../hooks/useGovernmentAdminInquiriesState'
import GovernmentAdminInquiriesBody from './GovernmentAdminInquiriesBody'

export default function GovernmentAdminInquiriesPCView(props: GovernmentAdminInquiriesViewProps) {
  return <GovernmentAdminInquiriesBody {...props} variant="pc" />
}
