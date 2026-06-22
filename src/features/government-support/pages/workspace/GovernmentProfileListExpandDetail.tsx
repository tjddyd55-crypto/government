import FormButton from '../../../../components/form/FormButton'
import type { GovSupportProfile } from '../../types/governmentProfile.types'
import {
  buildGovernmentProfileListExpandRows,
  displayGovField,
} from '../../lib/governmentProfileDisplay'

type Props = {
  profile: GovSupportProfile
  onEdit: () => void
  onDelete: () => void
  deleting?: boolean
  showDelete?: boolean
}

export default function GovernmentProfileListExpandDetail({
  profile,
  onEdit,
  onDelete,
  deleting = false,
  showDelete = true,
}: Props) {
  const rows = buildGovernmentProfileListExpandRows(profile)
  const title = displayGovField(profile.businessName || profile.customerName)

  return (
    <div
      className="customer-expand-detail government-profile-list-expand-detail"
      data-testid="government-profile-list-expand-detail"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="customer-detail-toolbar government-profile-list-expand-detail__toolbar">
        <div className="customer-detail-toolbar__title government-profile-list-expand-detail__title">
          <span className="customer-info-label">
            <span className="customer-info-label__icon" aria-hidden>
              🏢
            </span>
            {title}
          </span>
        </div>
        <div className="customer-detail-action-bar government-profile-list-expand-detail__actions">
          <FormButton
            htmlType="button"
            variant="secondary"
            size="sm"
            className="customer-detail-action-button gov-btn gov-btn--secondary gov-btn--sm"
            title="사업장 정보 수정"
            aria-label="수정"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            수정
          </FormButton>
          {showDelete ? (
            <FormButton
              htmlType="button"
              variant="danger"
              size="sm"
              className="customer-detail-action-button customer-detail-action-button--danger gov-btn gov-btn--danger gov-btn--sm"
              title="사업장 삭제"
              aria-label="삭제"
              disabled={deleting}
              loading={deleting}
              loadingText="삭제 중…"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              삭제
            </FormButton>
          ) : null}
        </div>
      </div>

      <div className="customer-detail-read government-profile-list-expand-detail__body">
        <div
          className="government-profile-list-expand-detail__rows"
          data-testid="government-profile-list-expand-rows"
        >
          {rows.map((row) => (
            <div
              key={row.label}
              className="government-profile-list-expand-row customer-detail-read__info-row"
              data-testid="government-profile-list-expand-row"
            >
              <span className="government-profile-list-expand-row__label customer-detail-read__info-label">
                {row.label}
              </span>
              <span
                className={`government-profile-list-expand-row__value customer-detail-read__info-value${
                  row.isEmpty ? ' government-profile-list-expand-empty-value' : ''
                }`}
                data-empty={row.isEmpty ? 'true' : 'false'}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
