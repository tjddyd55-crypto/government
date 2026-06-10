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
  const titleClass =
    variant === 'pc'
      ? 'text-xl font-semibold text-[#f8fafc]'
      : 'text-lg font-semibold text-[#f8fafc]'

  return (
    <>
      <div className="flex flex-wrap items-start gap-2">
        <h1 className={titleClass}>알림</h1>
        {items.some((n) => !n.isRead) ? (
          <FormButton
            htmlType="button"
            variant="secondary"
            className="government-admin-notifications-page__read-all ml-auto shrink-0"
            disabled={pendingReadAll}
            onClick={() => void onReadAll()}
          >
            {pendingReadAll ? '처리 중…' : '모두 읽음'}
          </FormButton>
        ) : null}
      </div>

      {variant === 'pc' ? (
        <p className="mt-1 text-sm text-[#94a3b8] leading-relaxed">
          요청서류 제출, 문의, 전자서명, 신규 가입 등 운영 알림을 확인합니다.
        </p>
      ) : null}

      {loading ? <p className="mt-4 text-sm text-[#94a3b8]">불러오는 중…</p> : null}
      {!loading && error ? (
        <p className="mt-4 text-sm text-[#ef4444]" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <div className="mt-3 rounded-xl border border-[#1e293b] bg-[#111827] p-4 text-sm text-[#94a3b8]">
          알림이 없습니다.
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="mt-3 rounded-xl border border-[#1e293b] bg-[#111827] overflow-hidden">
          <ul className="m-0 p-0 list-none" role="list">
            {items.map((n) => {
              const unread = !n.isRead
              return (
                <li key={n.id}>
                  <FormButton
                    htmlType="button"
                    className={[
                      'w-full text-left px-4 py-3 border-b border-[#1e293b] rounded-none cursor-pointer transition-colors',
                      unread ? 'bg-[#0b111a]' : 'bg-transparent opacity-90',
                    ].join(' ')}
                    disabled={pendingReadId === n.id}
                    onClick={() => void onRowClick(n)}
                  >
                    <div className="text-sm font-semibold text-[#f8fafc]">{n.title || n.message}</div>
                    {n.title ? (
                      <div className="text-sm text-[#cbd5e1] mt-0.5">{n.message}</div>
                    ) : null}
                    <div className="text-xs text-[#94a3b8] mt-1 tabular-nums">
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
