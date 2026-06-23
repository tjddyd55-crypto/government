import FormButton from '../../../../components/form/FormButton'
import GovernmentStatusPill from '../../components/GovernmentStatusPill'
import type { GovSupportProfile } from '../../types/governmentProfile.types'
import {
  buildGovernmentProfileListExpandSections,
  displayGovField,
  type GovProfileExpandRow,
} from '../../lib/governmentProfileDisplay'
import '../../government-customer-card.css'

type Props = {
  profile: GovSupportProfile
  onEdit: () => void
  onDelete: () => void
  deleting?: boolean
  showDelete?: boolean
}

function ExpandRowValue({ row }: { row: GovProfileExpandRow }) {
  if (row.variant === 'pill') {
    return <GovernmentStatusPill label={row.label}>{row.value}</GovernmentStatusPill>
  }
  return <>{row.value}</>
}

export default function GovernmentProfileListExpandDetail({
  profile,
  onEdit,
  onDelete,
  deleting = false,
  showDelete = true,
}: Props) {
  const sections = buildGovernmentProfileListExpandSections(profile)
  const title = displayGovField(profile.businessName || profile.customerName)

  return (
    <div
      className="customer-expand-detail government-profile-list-expand-detail"
      data-testid="government-profile-list-expand-detail"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <header className="government-profile-list-expand-detail__toolbar">
        <h3 className="government-profile-list-expand-detail__title">{title}</h3>
        <div className="government-profile-list-expand-detail__actions">
          <FormButton
            htmlType="button"
            variant="secondary"
            size="sm"
            className="gov-btn gov-btn--secondary gov-btn--sm"
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
              className="gov-btn gov-btn--danger gov-btn--sm"
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
      </header>

      <div className="government-profile-list-expand-detail__body">
        <div
          className="government-profile-list-expand-detail__sections"
          data-testid="government-profile-list-expand-rows"
        >
          {sections.map((section) => (
            <section
              key={section.id}
              className="government-profile-list-expand-detail__section"
              aria-labelledby={`gov-expand-section-${profile.id}-${section.id}`}
            >
              <h4
                id={`gov-expand-section-${profile.id}-${section.id}`}
                className="government-profile-list-expand-detail__section-title"
              >
                {section.title}
              </h4>
              <div className="government-profile-list-expand-detail__rows">
                {section.rows.map((row) => (
                  <div
                    key={`${section.id}-${row.label}`}
                    className="government-profile-list-expand-row"
                    data-testid="government-profile-list-expand-row"
                  >
                    <span className="government-profile-list-expand-row__label">{row.label}</span>
                    <span
                      className={`government-profile-list-expand-row__value${
                        row.isEmpty ? ' government-profile-list-expand-empty-value' : ''
                      }`}
                      data-empty={row.isEmpty ? 'true' : 'false'}
                    >
                      <ExpandRowValue row={row} />
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
