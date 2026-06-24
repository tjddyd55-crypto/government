import { GOVERNMENT_APP_TITLE } from '../../../../config/governmentAppMeta'
import GovernmentAdminPageShell from '../../components/GovernmentAdminPageShell'
import GovernmentAdminCustomerStatusSettings from './GovernmentAdminCustomerStatusSettings'

export default function GovernmentAdminSettingsPage() {
  return (
    <GovernmentAdminPageShell
      title="설정"
      description={`${GOVERNMENT_APP_TITLE} 운영 설정을 관리합니다.`}
      testId="government-admin-settings-page"
    >
      <GovernmentAdminCustomerStatusSettings />
    </GovernmentAdminPageShell>
  )
}
