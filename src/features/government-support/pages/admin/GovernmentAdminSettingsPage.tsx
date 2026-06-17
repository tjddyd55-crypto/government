import GovernmentAdminPageShell from '../../components/GovernmentAdminPageShell'
import GovernmentAdminCustomerStatusSettings from './GovernmentAdminCustomerStatusSettings'

export default function GovernmentAdminSettingsPage() {
  return (
    <GovernmentAdminPageShell
      title="설정"
      description="정부지원 CRM 운영 설정을 관리합니다."
      testId="government-admin-settings-page"
    >
      <GovernmentAdminCustomerStatusSettings />
    </GovernmentAdminPageShell>
  )
}
