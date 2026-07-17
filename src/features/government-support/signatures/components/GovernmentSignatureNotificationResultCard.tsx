import { FormButton } from '../../../../components/form'
import { buildSendResultMessages } from '../governmentSignatureAlimtalkDisplay'
import type { GovernmentSignatureSendNotificationResult } from '../governmentSignatureAlimtalkTypes'
import { AlimtalkNotificationStatusBadge } from './AlimtalkNotificationStatusBadge'

type Props = {
  notification?: GovernmentSignatureSendNotificationResult | null
  onCopyLink?: () => void
}

export function GovernmentSignatureNotificationResultCard({ notification, onCopyLink }: Props) {
  const model = buildSendResultMessages({ sessionCreated: true, notification })
  if (!notification && !model.notificationLine) {
    return null
  }

  return (
    <div
      className={`gov-signature-send-result gov-signature-send-result--${model.tone}`}
      role="status"
      data-testid="gov-signature-send-result"
    >
      <div className="gov-signature-send-result__head">
        <p className="gov-signature-send-result__session">{model.sessionLine}</p>
        {notification ? (
          <AlimtalkNotificationStatusBadge
            notificationStatus={notification.status}
            notificationDryRun={notification.dryRun}
            notificationProviderCode={notification.providerCode}
          />
        ) : null}
      </div>
      {model.notificationLine ? (
        <p className="gov-signature-send-result__notification">{model.notificationLine}</p>
      ) : null}
      {model.showCopyLink && onCopyLink ? (
        <div className="gov-signature-send-result__actions">
          <FormButton htmlType="button" variant="primary" size="sm" onClick={onCopyLink}>
            전자서명 링크 복사
          </FormButton>
        </div>
      ) : null}
    </div>
  )
}
