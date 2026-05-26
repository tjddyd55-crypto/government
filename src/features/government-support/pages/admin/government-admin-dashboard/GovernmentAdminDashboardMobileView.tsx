import { PlatformHubSection, OperationalDashboardBody } from './GovernmentAdminDashboardPCView'
import type { GovernmentAdminDashboardViewProps } from './governmentAdminDashboardViewProps'

export default function GovernmentAdminDashboardMobileView(props: GovernmentAdminDashboardViewProps) {
  const isPlatform = props.variant === 'platform'

  return (
    <main className="page platform-admin-page government-admin-dashboard-page government-admin-dashboard-page--mobile platform-admin-page--mobile page--with-back">
      <header className="platform-admin-page__head">
        <h1 className="platform-admin-page__title">
          {isPlatform ? '정부지원 CRM 관리' : '운영 대시보드'}
        </h1>
        <p className="platform-admin-page__lede">
          {isPlatform
            ? '대행사·운영 공지/자료 관리'
            : '요청서류·문의·전자서명·이용자 요약'}
        </p>
      </header>
      {isPlatform ? (
        <PlatformHubSection cards={props.platformCards} />
      ) : (
        <OperationalDashboardBody {...props} />
      )}
    </main>
  )
}
