import type { GovernmentSignatureCustomerNotifyMode } from '../governmentSignatureAlimtalkTypes'
import { maxSignatureExpiryYmd, minSignatureExpiryYmd } from '../governmentSignatureAlimtalkDisplay'

type Props = {
  notifyMode: GovernmentSignatureCustomerNotifyMode
  onNotifyModeChange: (mode: GovernmentSignatureCustomerNotifyMode) => void
  expiryYmd: string
  onExpiryYmdChange: (ymd: string) => void
  expiryError?: string | null
  disabled?: boolean
}

export function GovernmentSignatureSendDeliveryOptions({
  notifyMode,
  onNotifyModeChange,
  expiryYmd,
  onExpiryYmdChange,
  expiryError,
  disabled,
}: Props) {
  const minYmd = minSignatureExpiryYmd()
  const maxYmd = maxSignatureExpiryYmd()

  return (
    <section className="gov-signature-send-delivery" aria-label="고객 안내 방식">
      <h3 className="contract-signature-console__section-title">고객 안내</h3>
      <fieldset className="gov-signature-send-delivery__modes" disabled={disabled}>
        <legend className="gov-signature-send-delivery__legend">고객 안내 방식</legend>
        <label className="gov-signature-send-delivery__option">
          <input
            type="radio"
            name="gov-signature-notify-mode"
            value="kakao_alimtalk"
            checked={notifyMode === 'kakao_alimtalk'}
            onChange={() => onNotifyModeChange('kakao_alimtalk')}
          />
          <span className="gov-signature-send-delivery__option-text">
            <strong>카카오 알림톡으로 전송</strong>
            <span className="contract-signature-console__hint">
              전자서명 링크를 고객에게 알림톡으로 전송합니다. 서버 설정이 비활성화된 경우 링크만 생성될 수
              있습니다.
            </span>
          </span>
        </label>
        <label className="gov-signature-send-delivery__option">
          <input
            type="radio"
            name="gov-signature-notify-mode"
            value="link_only"
            checked={notifyMode === 'link_only'}
            onChange={() => onNotifyModeChange('link_only')}
          />
          <span className="gov-signature-send-delivery__option-text">
            <strong>링크만 생성</strong>
            <span className="contract-signature-console__hint">
              알림톡 없이 전자서명 링크만 생성합니다. 직접 전달해 주세요.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="gov-signature-send-delivery__expiry">
        <label className="gov-signature-send-delivery__expiry-label" htmlFor="gov-signature-expiry-ymd">
          서명기한
        </label>
        <input
          id="gov-signature-expiry-ymd"
          className="gov-signature-send-delivery__expiry-input"
          type="date"
          value={expiryYmd}
          min={minYmd}
          max={maxYmd}
          disabled={disabled}
          onChange={(e) => onExpiryYmdChange(e.target.value)}
        />
        <p className="contract-signature-console__hint">발송일로부터 최대 30일까지 설정할 수 있습니다.</p>
        {expiryError ? (
          <p className="contract-signature-console__inline-error" role="alert">
            {expiryError}
          </p>
        ) : null}
      </div>
    </section>
  )
}
