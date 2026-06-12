import type { GovernmentAdminNotificationsViewProps } from '../../../hooks/useGovernmentAdminNotificationsState'
import GovernmentAdminNotificationsContent from './GovernmentAdminNotificationsContent'

export default function GovernmentAdminNotificationsMobileView(props: GovernmentAdminNotificationsViewProps) {
  return (
    <main className="page notifications-placeholder-page government-admin-notifications-page government-admin-notifications-page--mobile page--with-back content-wrapper page-shell pb-6">
      <GovernmentAdminNotificationsContent {...props} variant="mobile" />
    </main>
  )
}
