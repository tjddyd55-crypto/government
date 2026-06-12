import type { GovernmentAdminNotificationsViewProps } from '../../../hooks/useGovernmentAdminNotificationsState'
import GovernmentAdminNotificationsContent from './GovernmentAdminNotificationsContent'

export default function GovernmentAdminNotificationsPCView(props: GovernmentAdminNotificationsViewProps) {
  return (
    <main className="page notifications-placeholder-page government-admin-notifications-page government-admin-notifications-page--pc page--with-back content-wrapper page-shell">
      <GovernmentAdminNotificationsContent {...props} variant="pc" />
    </main>
  )
}
