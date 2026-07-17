import type { GovernmentSignatureCustomerNotifyMode } from '../governmentSignatureAlimtalkTypes'
import { maxSignatureExpiryYmd, minSignatureExpiryYmd } from '../governmentSignatureAlimtalkDisplay'
import {
  GOV_SIGNATURE_DRY_RUN_INFO_MESSAGE,
  deliveryOptionClassName,
  shouldShowAlimtalkDryRunInfo,
} from '../governmentSignatureSendDeliveryUi'

type Props = {
  notifyMode: GovernmentSignatureCustomerNotifyMode
  onNotifyModeChange: (mode: GovernmentSignatureCustomerNotifyMode) => void
  expiryYmd: string
  onExpiryYmdChange: (ymd: string) => void
  expiryError?: string | null
  disabled?: boolean
  /** develop DRY_RUN=true 일 때 카카오 선택 시 테스트 안내 표시 */
  showDryRunInfo?: boolean
}

export function GovernmentSignatureSendDeliveryOptions({
  notifyMode,
  onNotifyModeChange,
  expiryYmd,
  onExpiryYmdChange,
  expiryError,
  disabled,
  showDryRunInfo,
}: Props) {
  const minYmd = minSignatureExpiryYmd()
  const maxYmd = maxSignatureExpiryYmd()
  const kakaoSelected = notifyMode === 'kakao_alimtalk'
  const linkSelected = notifyMode === 'link_only'
  const showDryRunBox = shouldShowAlimtalkDryRunInfo({ showDryRunInfo, notifyMode })

  return (
    <section className="gov-signature-send-delivery" aria-label="고객 안내 방식">
      <h3 className="contract-signature-console__section-title">고객 안내</h3>
      <fieldset className="gov-signature-send-delivery__modes" disabled={disabled}>
        <legend className="gov-signature-send-delivery__legend">발송 방식</legend>

        <label className={deliveryOptionClassName(kakaoSelected)} data-testid="gov-signature-delivery-kakao">
          <input
            type="radio"
            name="gov-signature-notify-mode"
            value="kakao_alimtalk"
            checked={kakaoSelected}
            onChange={() => onNotifyModeChange('kakao_alimtalk')}
          />
          <span className="gov-signature-send-delivery__option-text">
            <span className="gov-signature-send-delivery__option-title-row">
              <strong>카카오 알림톡으로 전송</strong>
              {kakaoSelected ? (
                <span className="gov-signature-send-delivery__selected-badge" aria-hidden="true">
                  선택됨
                </span>
              ) : null}
            </span>
            <span className="gov-signature-send-delivery__option-desc">
              고객의 휴대폰으로 전자서명 안내 알림톡을 전송합니다.
            </span>
          </span>
        </label>

        <label className={deliveryOptionClassName(linkSelected)} data-testid="gov-signature-delivery-link">
          <input
            type="radio"
            name="gov-signature-notify-mode"
            value="link_only"
            checked={linkSelected}
            onChange={() => onNotifyModeChange('link_only')}
          />
          <span className="gov-signature-send-delivery__option-text">
            <span className="gov-signature-send-delivery__option-title-row">
              <strong>링크만 생성</strong>
              {linkSelected ? (
                <span className="gov-signature-send-delivery__selected-badge" aria-hidden="true">
                  선택됨
                </span>
              ) : null}
            </span>
            <span className="gov-signature-send-delivery__option-desc">
              알림톡을 보내지 않고 전자서명 링크만 생성합니다.
            </span>
          </span>
        </label>
      </fieldset>

      {showDryRunBox ? (
        <div
          className="gov-signature-send-delivery__dry-run-info"
          role="status"
          data-testid="gov-signature-delivery-dry-run-info"
        >
          {GOV_SIGNATURE_DRY_RUN_INFO_MESSAGE}
        </div>
      ) : null}

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
        <p className="gov-signature-send-delivery__hint">발송일로부터 최대 30일까지 설정할 수 있습니다.</p>
        {expiryError ? (
          <p className="contract-signature-console__inline-error" role="alert">
            {expiryError}
          </p>
        ) : null}
      </div>
    </section>
  )
}
