import { FormButton } from '../../../../../components/form'
import {
  formatGovNotificationDateTime,
  type GovernmentAdminNotificationsViewProps,
} from '../../../hooks/useGovernmentAdminNotificationsState'

type GovernmentAdminNotificationsContentProps = GovernmentAdminNotificationsViewProps & {
  variant: 'pc' | 'mobile'
}

/** 보험 NotificationsPlaceholderPage + NotificationList 패턴에 맞춘 알림 본문 */
export default function GovernmentAdminNotificationsContent({
  variant,
  loading,
  error,
  items,
  pendingReadId,
  pendingReadAll,
  onRowClick,
  onReadAll,
}: GovernmentAdminNotificationsContentProps) {
  return (
    <>
      <div className="government-admin-notifications-content__head">
        <h1 className="government-admin-notifications-content__title">알림</h1>
        {items.some((n) => !n.isRead) ? (
          <FormButton
            htmlType="button"
            variant="secondary"
            className="gov-btn gov-btn--secondary gov-btn--sm government-admin-notifications-page__read-all"
            disabled={pendingReadAll}
            onClick={() => void onReadAll()}
          >
            {pendingReadAll ? '처리 중…' : '모두 읽음'}
          </FormButton>
        ) : null}
      </div>

      {variant === 'pc' ? (
        <p className="government-admin-notifications-content__lead">
          요청서류 제출, 문의, 전자서명, 신규 가입 등 운영 알림을 확인합니다.
        </p>
      ) : null}

      {loading ? <p className="government-admin-notifications-content__status">불러오는 중…</p> : null}
      {!loading && error ? (
        <p className="government-admin-notifications-content__error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <div className="government-admin-notifications-content__empty">알림이 없습니다.</div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="government-admin-notifications-content__panel">
          <ul className="government-admin-notifications-content__list" role="list">
            {items.map((n) => {
              const unread = !n.isRead
              return (
                <li key={n.id}>
                  <FormButton
                    htmlType="button"
                    className={[
                      'government-admin-notifications-content__row',
                      unread ? 'government-admin-notifications-content__row--unread' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={pendingReadId === n.id}
                    onClick={() => void onRowClick(n)}
                  >
                    <div className="government-admin-notifications-content__row-title">
                      {n.title || n.message}
                    </div>
                    {n.title ? (
                      <div className="government-admin-notifications-content__row-message">{n.message}</div>
                    ) : null}
                    <div className="government-admin-notifications-content__row-time">
                      {formatGovNotificationDateTime(n.createdAt)}
                    </div>
                  </FormButton>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </>
  )
}
