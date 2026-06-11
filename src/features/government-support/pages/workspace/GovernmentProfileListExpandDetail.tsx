import FormButton from '../../../../components/form/FormButton'
import type { GovSupportProfile } from '../../types/governmentProfile.types'
import {
  displayGovField,
  formatGovProfileDateTime,
  maskBusinessNumber,
} from '../../lib/governmentProfileDisplay'

type ExpandRow = {
  label: string
  value: string
}

function buildExpandRows(profile: GovSupportProfile): ExpandRow[] {
  return [
    { label: '사업장/신청명', value: displayGovField(profile.businessName || profile.customerName) },
    { label: '담당자명', value: displayGovField(profile.customerName) },
    { label: '연락처', value: displayGovField(profile.phone) },
    { label: '상담 상태', value: displayGovField(profile.docStatus) },
    { label: '신청 상태', value: displayGovField(profile.progressStatus) },
    { label: '주소', value: displayGovField(profile.businessAddress || profile.homeAddress) },
    { label: '개업일', value: displayGovField(profile.businessOpenedAt) },
    {
      label: '사업자등록번호',
      value: profile.businessNumber?.trim() ? maskBusinessNumber(profile.businessNumber) : '—',
    },
    {
      label: '업태/종목',
      value: [profile.businessType, profile.businessCategory].filter((v) => String(v ?? '').trim()).join(' · ') || '—',
    },
    { label: '필요자금', value: displayGovField(profile.requiredFunds) },
    { label: '수임료', value: displayGovField(profile.fee) },
    { label: '특이사항', value: displayGovField(profile.specialNote || profile.note) },
    { label: '등록일', value: formatGovProfileDateTime(profile.createdAt) },
    { label: '수정일', value: formatGovProfileDateTime(profile.updatedAt) },
  ]
}

type Props = {
  profile: GovSupportProfile
  onEdit: () => void
  onDelete: () => void
  deleting?: boolean
}

export default function GovernmentProfileListExpandDetail({
  profile,
  onEdit,
  onDelete,
  deleting = false,
}: Props) {
  const rows = buildExpandRows(profile)

  return (
    <div
      className="customer-expand-detail government-profile-list-expand-detail"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="customer-detail-toolbar">
        <div className="customer-detail-toolbar__title">
          <span className="customer-info-label">
            <span className="customer-info-label__icon" aria-hidden>
              🏢
            </span>
            {profile.businessName || profile.customerName || '사업장'}
          </span>
        </div>
        <div className="customer-detail-action-bar">
          <FormButton
            htmlType="button"
            variant="secondary"
            size="sm"
            className="customer-detail-action-button gov-btn gov-btn--secondary gov-btn--sm"
            title="사업장 정보 수정"
            aria-label="수정"
            onClick={onEdit}
          >
            수정
          </FormButton>
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
            onClick={onDelete}
          >
            삭제
          </FormButton>
        </div>
      </div>

      <div className="customer-detail-read government-profile-list-expand-detail__body">
        <div className="customer-detail-read__info-list">
          {rows.map((row) => (
            <div key={row.label} className="customer-detail-read__info-row">
              <span className="customer-detail-read__info-bullet" aria-hidden>
                •
              </span>
              <div className="customer-detail-read__info-main">
                <span className="customer-detail-read__info-label">{row.label}:</span>{' '}
                <span className="customer-detail-read__info-value">{row.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="customer-expand-section-divider" role="presentation" />
    </div>
  )
}
