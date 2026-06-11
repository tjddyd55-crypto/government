import { FormButton, FormInput, FormSelect, FormTextarea } from '../../../../../../components/form'
import type { GovProfileApplication } from '../../../../types/governmentProfile.types'
import type { GovernmentProfileApplicationStatus } from '../../../../constants/governmentProfileApplication.config'
import {
  GOVERNMENT_PROFILE_APPLICATION_CONTENT_MAX,
  GOVERNMENT_PROFILE_APPLICATION_TITLE_MAX,
} from '../../../../constants/governmentProfileApplication.config'

type MaybePromise = void | Promise<void>

type GovernmentProfileApplicationDetailBodyProps = {
  detail?: GovProfileApplication | null
  detailLoading?: boolean
  statusTarget: GovernmentProfileApplicationStatus
  editTitle: string
  editContent: string
  editType: string
  applicationTypeOptions: readonly string[]
  actionBusy?: boolean
  statusOptions: Array<{ value: GovernmentProfileApplicationStatus; label: string }>
  statusNotice?: string
  onSetStatusTarget: (status: GovernmentProfileApplicationStatus) => void
  onSetEditTitle: (value: string) => void
  onSetEditContent: (value: string) => void
  onSetEditType: (value: string) => void
  onSaveDetail: () => MaybePromise
  onSaveStatus: () => MaybePromise
  onDeleteApplication: () => MaybePromise
  formatDateTime: (iso: string | null | undefined) => string
  statusLabel: (status: string) => string
}

export function GovernmentProfileApplicationDetailBody({
  detail,
  detailLoading = false,
  statusTarget,
  editTitle,
  editContent,
  editType,
  applicationTypeOptions,
  actionBusy = false,
  statusOptions,
  statusNotice = '',
  onSetStatusTarget,
  onSetEditTitle,
  onSetEditContent,
  onSetEditType,
  onSaveDetail,
  onSaveStatus,
  onDeleteApplication,
  formatDateTime,
  statusLabel,
}: GovernmentProfileApplicationDetailBodyProps) {
  if (detailLoading) {
    return <div className="claim-requests-page__detail-empty">상세 불러오는 중…</div>
  }

  if (!detail) {
    return <div className="claim-requests-page__detail-empty">신청을 선택해 주세요.</div>
  }

  const saveStatusDisabled = statusTarget === detail.status

  return (
    <>
      <div className="claim-requests-page__detail-section">
        <div className="claim-requests-page__detail-title">
          #{detail.id} {detail.title || '제목 없음'}
        </div>
        <div className="claim-requests-page__detail-meta">
          상태 {statusLabel(detail.status)} · 접수 {formatDateTime(detail.submittedAt ?? detail.createdAt)}
        </div>
        {detail.completedAt ? (
          <div className="claim-requests-page__detail-meta">완료 {formatDateTime(detail.completedAt)}</div>
        ) : null}
        <div className="claim-requests-page__detail-meta">신청 유형: {detail.applicationType || '—'}</div>
      </div>

      <div className="claim-requests-page__detail-section">
        <div className="claim-requests-page__detail-subtitle">신청 내용 수정</div>
        <label className="claim-requests-page__detail-meta claim-requests-page__detail-field">
          제목
          <FormInput
            className="gov-form-control claim-requests-page__status-select"
            value={editTitle}
            onChange={(event) => onSetEditTitle(event.target.value)}
            maxLength={GOVERNMENT_PROFILE_APPLICATION_TITLE_MAX}
          />
        </label>
        <label className="claim-requests-page__detail-meta claim-requests-page__detail-field">
          유형
          <FormSelect
            className="gov-form-control claim-requests-page__status-select"
            value={editType}
            onChange={(event) => onSetEditType(event.target.value)}
            options={[
              { value: '', label: '선택' },
              ...applicationTypeOptions.map((name) => ({ value: name, label: name })),
            ]}
          />
        </label>
        <FormTextarea
          className="gov-form-control claim-requests-page__status-memo"
          rows={5}
          value={editContent}
          onChange={(event) => onSetEditContent(event.target.value)}
          placeholder="신청 내용"
          maxLength={GOVERNMENT_PROFILE_APPLICATION_CONTENT_MAX}
        />
        <div className="claim-requests-page__status-form-row customer-workspace-tab-submit-row">
          <FormButton
            htmlType="button"
            variant="primary"
            className="gov-btn gov-btn--primary"
            onClick={() => void onSaveDetail()}
            loading={actionBusy}
          >
            내용 저장
          </FormButton>
          <FormButton
            htmlType="button"
            variant="secondary"
            className="gov-btn gov-btn--danger"
            onClick={() => void onDeleteApplication()}
            loading={actionBusy}
          >
            보관(삭제)
          </FormButton>
        </div>
      </div>

      <div className="claim-requests-page__detail-section claim-requests-page__detail-section--status">
        <div className="claim-requests-page__detail-subtitle">상태 변경</div>
        <div className="claim-requests-page__status-form-row">
          <FormSelect
            className="gov-form-control claim-requests-page__status-select"
            value={statusTarget}
            onChange={(event) => onSetStatusTarget(event.target.value as GovernmentProfileApplicationStatus)}
            options={statusOptions.map((item) => ({ value: item.value, label: item.label }))}
          />
          <FormButton
            htmlType="button"
            variant="primary"
            className="gov-btn gov-btn--primary"
            onClick={() => void onSaveStatus()}
            loading={actionBusy}
            disabled={saveStatusDisabled}
            title={saveStatusDisabled ? '현재 상태와 동일합니다.' : undefined}
          >
            상태 저장
          </FormButton>
        </div>
        {statusNotice ? (
          <div className="claim-requests-page__status-notice" role="status" aria-live="polite">
            {statusNotice}
          </div>
        ) : null}
      </div>

      <div className="claim-requests-page__detail-section">
        <div className="claim-requests-page__detail-subtitle">첨부 파일</div>
        <div className="claim-requests-page__detail-empty">첨부 파일 연동은 후속 작업 예정입니다.</div>
      </div>
    </>
  )
}

export default function GovernmentProfileApplicationDetailSection(
  props: GovernmentProfileApplicationDetailBodyProps,
) {
  return (
    <section className="claim-requests-page__card claim-requests-page__detail-card" aria-label="선택한 신청 상세">
      <div className="claim-requests-page__section-header">
        <div>
          <h2 className="claim-requests-page__section-title">선택한 신청 상세</h2>
          <p className="claim-requests-page__section-description">선택한 신청의 내용과 상태를 확인·수정합니다.</p>
        </div>
      </div>
      <GovernmentProfileApplicationDetailBody {...props} />
    </section>
  )
}
