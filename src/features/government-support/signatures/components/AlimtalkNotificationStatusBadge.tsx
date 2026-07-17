import { notificationStatusDisplayLabel, type NotificationStatusLabelInput } from '../governmentSignatureAlimtalkDisplay'

type Props = NotificationStatusLabelInput & {
  className?: string
}

export function AlimtalkNotificationStatusBadge({
  notificationStatus,
  notificationDryRun,
  notificationProviderCode,
  className,
}: Props) {
  const label = notificationStatusDisplayLabel({
    notificationStatus,
    notificationDryRun,
    notificationProviderCode,
  })
  const st = String(notificationStatus ?? 'not_requested')
  const isDryRun = Boolean(notificationDryRun) || notificationProviderCode === 'DRY_RUN'
  const modifier =
    st === 'failed'
      ? 'failed'
      : isDryRun && (st === 'sent' || st === 'skipped')
        ? 'dry-run'
        : st === 'skipped'
          ? 'skipped'
          : st === 'sent'
            ? 'sent'
            : 'none'

  return (
    <span
      className={['gov-signature-alimtalk-status', `gov-signature-alimtalk-status--${modifier}`, className]
        .filter(Boolean)
        .join(' ')}
      data-notification-status={st}
    >
      {label}
    </span>
  )
}
