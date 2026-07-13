import type { GovernmentSignatureNotificationSummary } from '../governmentSignatureAlimtalkTypes'
import { mapAlimtalkErrorCategoryToUserMessage } from '../governmentSignatureAlimtalkDisplay'
import { formatStaffSessionDate } from '../sendSessionStaffDisplay'
import { AlimtalkNotificationStatusBadge } from './AlimtalkNotificationStatusBadge'
import { FormButton } from '../../../../components/form'

type Props = {
  summary: GovernmentSignatureNotificationSummary
  maskedPhone?: string | null
  onResend?: () => void
  resendBusy?: boolean
}

export function GovernmentSignatureAlimtalkInfoSection({
  summary,
  maskedPhone,
  onResend,
  resendBusy,
}: Props) {
  const phone = summary.notificationRecipientPhoneMasked ?? maskedPhone ?? '—'
  const sentAt = summary.notificationSentAt ? formatStaffSessionDate(summary.notificationSentAt) : '—'
  const retry = summary.notificationRetryCount ?? 0
  const err =
    summary.notificationStatus === 'failed' && summary.notificationErrorCategory
      ? mapAlimtalkErrorCategoryToUserMessage(summary.notificationErrorCategory)
      : null

  return (
    <section className="gov-signature-alimtalk-info" aria-label="알림톡 발송 정보">
      <h3 className="contract-signature-console__section-title">알림톡 발송 정보</h3>
      <dl className="gov-signature-alimtalk-info__dl">
        <div>
          <dt>알림톡 상태</dt>
          <dd>
            <AlimtalkNotificationStatusBadge
              notificationStatus={summary.notificationStatus}
              notificationDryRun={summary.notificationDryRun}
              notificationProviderCode={summary.notificationProviderCode}
            />
            {summary.canResend ? (
              <span className="gov-signature-alimtalk-info__resend-badge">재발송 가능</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>최근 발송일시</dt>
          <dd>{sentAt}</dd>
        </div>
        <div>
          <dt>수신번호</dt>
          <dd>{phone}</dd>
        </div>
        <div>
          <dt>발송 횟수</dt>
          <dd>{retry > 0 ? retry + 1 : summary.notificationStatus === 'not_requested' ? 0 : 1}</dd>
        </div>
        {err ? (
          <div>
            <dt>실패 사유</dt>
            <dd>{err}</dd>
          </div>
        ) : null}
      </dl>
      {summary.canResend && onResend ? (
        <FormButton
          htmlType="button"
          variant="secondary"
          size="sm"
          disabled={resendBusy}
          onClick={onResend}
        >
          {resendBusy ? '발송 중…' : '알림톡 다시 보내기'}
        </FormButton>
      ) : null}
    </section>
  )
}
