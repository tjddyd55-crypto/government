import { FormButton } from '../../../../../components/form'
import {
  formatGovNotificationDateTime,
  type GovernmentAdminNotificationsViewProps,
} from '../../../hooks/useGovernmentAdminNotificationsState'

export default function GovernmentAdminNotificationsPCView(props: GovernmentAdminNotificationsViewProps) {
  const { loading, error, items, pendingReadId, pendingReadAll, onRowClick, onReadAll } = props

  return (
    <main className="page government-admin-notifications-page government-admin-notifications-page--pc page--with-back">
      <header className="government-admin-notifications-page__head">
        <h1 className="government-admin-notifications-page__title">알림</h1>
        <p className="government-admin-notifications-page__lede">
          요청서류 제출, 문의, 전자서명, 신규 가입 등 운영 알림을 확인합니다.
        </p>
        {items.some((n) => !n.isRead) ? (
          <FormButton
            htmlType="button"
            className="government-admin-notifications-page__read-all"
            disabled={pendingReadAll}
            onClick={() => void onReadAll()}
          >
            {pendingReadAll ? '처리 중…' : '모두 읽음'}
          </FormButton>
        ) : null}
      </header>

      {loading ? <p className="government-admin-page__msg">불러오는 중…</p> : null}
      {!loading && error ? (
        <p className="government-admin-page__error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <p className="government-admin-page__muted">알림이 없습니다.</p>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ul className="government-admin-notifications-page__list" role="list">
          {items.map((n) => {
            const unread = !n.isRead
            return (
              <li key={n.id}>
                <FormButton
                  htmlType="button"
                  className={[
                    'government-admin-notifications-page__row',
                    unread ? 'government-admin-notifications-page__row--unread' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={pendingReadId === n.id}
                  onClick={() => void onRowClick(n)}
                >
                  <div className="government-admin-notifications-page__row-title">{n.title || n.message}</div>
                  <div className="government-admin-notifications-page__row-message">{n.message}</div>
                  <div className="government-admin-notifications-page__row-meta">
                    {formatGovNotificationDateTime(n.createdAt)}
                  </div>
                </FormButton>
              </li>
            )
          })}
        </ul>
      ) : null}
    </main>
  )
}
