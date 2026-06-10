import type { GovernmentAdminInquiriesViewProps } from '../../../hooks/useGovernmentAdminInquiriesState'
import GovernmentAdminInquiriesBody from './GovernmentAdminInquiriesBody'

export default function GovernmentAdminInquiriesMobileView(props: GovernmentAdminInquiriesViewProps) {
  return <GovernmentAdminInquiriesBody {...props} variant="mobile" />
}
