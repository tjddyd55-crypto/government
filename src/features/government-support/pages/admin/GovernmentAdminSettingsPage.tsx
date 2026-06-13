import GovernmentAdminPageShell from '../../components/GovernmentAdminPageShell'

export default function GovernmentAdminSettingsPage() {
  return (
    <GovernmentAdminPageShell
      title="설정"
      description="정부지원 CRM 운영 설정을 관리합니다."
      testId="government-admin-settings-page"
    >
      <div className="government-admin-empty-card">아직 설정 항목이 없습니다.</div>
    </GovernmentAdminPageShell>
  )
}
