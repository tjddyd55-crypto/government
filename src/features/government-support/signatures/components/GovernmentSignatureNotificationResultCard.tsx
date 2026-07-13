import { FormButton } from '../../../../components/form'
import { buildSendResultMessages } from '../governmentSignatureAlimtalkDisplay'
import type { GovernmentSignatureSendNotificationResult } from '../governmentSignatureAlimtalkTypes'

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
      <p className="gov-signature-send-result__session">{model.sessionLine}</p>
      {model.notificationLine ? (
        <p className="gov-signature-send-result__notification">{model.notificationLine}</p>
      ) : null}
      {model.showCopyLink && onCopyLink ? (
        <div className="gov-signature-send-result__actions">
          <FormButton htmlType="button" variant="secondary" size="sm" onClick={onCopyLink}>
            전자서명 링크 복사
          </FormButton>
        </div>
      ) : null}
    </div>
  )
}
