import { FormButton, FormInput, FormSelect, FormTextarea } from '../../../../../../components/form'
import GovernmentStatusPill from '../../../../components/GovernmentStatusPill'
import type { GovProfileApplication } from '../../../../types/governmentProfile.types'
import type { GovernmentProfileApplicationStatus } from '../../../../constants/governmentProfileApplication.config'
import {
  GOVERNMENT_PROFILE_APPLICATION_CONTENT_MAX,
  GOVERNMENT_PROFILE_APPLICATION_TITLE_MAX,
} from '../../../../constants/governmentProfileApplication.config'

type MaybePromise = void | Promise<void>

export type GovernmentProfileApplicationDetailBodyProps = {
  detail?: GovProfileApplication | null
  detailLoading?: boolean
  editing?: boolean
  /** 모바일 등 항상 수정 폼을 보여줄 때 */
  alwaysEditing?: boolean
  statusTarget: GovernmentProfileApplicationStatus
  editTitle: string
  editContent: string
  editType: string
  applicationTypeOptions: readonly string[]
  actionBusy?: boolean
  statusOptions: Array<{ value: GovernmentProfileApplicationStatus; label: string }>
  statusNotice?: string
  onStartEdit?: () => void
  onCancelEdit?: () => void
  onCloseDetail?: () => void
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="gov-application-detail-read__row">
      <span className="gov-application-detail-read__label">{label}</span>
      <span className="gov-application-detail-read__value">{value || '—'}</span>
    </div>
  )
}

export function GovernmentProfileApplicationDetailBody({
  detail,
  detailLoading = false,
  editing = false,
  alwaysEditing = false,
  statusTarget,
  editTitle,
  editContent,
  editType,
  applicationTypeOptions,
  actionBusy = false,
  statusOptions,
  statusNotice = '',
  onStartEdit,
  onCancelEdit,
  onCloseDetail,
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

  const showEditForm = alwaysEditing || editing
  const saveStatusDisabled = statusTarget === detail.status

  if (!showEditForm) {
    return (
      <div
        className="gov-application-detail-read"
        data-testid="government-profile-application-detail-read"
      >
        <div className="gov-application-detail-read__head">
          <h3 className="gov-application-detail-read__title">
            #{detail.id} {detail.title || '제목 없음'}
          </h3>
          <GovernmentStatusPill label="신청 상태">{statusLabel(detail.status)}</GovernmentStatusPill>
        </div>

        <div className="gov-application-detail-read__grid">
          <ReadOnlyField label="유형" value={detail.applicationType || '—'} />
          <ReadOnlyField label="접수일" value={formatDateTime(detail.submittedAt ?? detail.createdAt)} />
          <ReadOnlyField label="수정일" value={formatDateTime(detail.updatedAt)} />
          {detail.completedAt ? (
            <ReadOnlyField label="완료일" value={formatDateTime(detail.completedAt)} />
          ) : null}
          <div className="gov-application-detail-read__row gov-application-detail-read__row--block">
            <span className="gov-application-detail-read__label">내용</span>
            <div className="gov-application-detail-read__value gov-application-detail-read__value--multiline">
              {detail.content?.trim() || '—'}
            </div>
          </div>
        </div>

        <div className="gov-application-detail-read__actions">
          <FormButton
            htmlType="button"
            variant="primary"
            className="gov-btn gov-btn--primary"
            disabled={actionBusy}
            onClick={() => onStartEdit?.()}
          >
            수정
          </FormButton>
          <FormButton
            htmlType="button"
            variant="danger"
            size="sm"
            className="gov-btn gov-btn--danger gov-btn--sm"
            disabled={actionBusy}
            onClick={() => void onDeleteApplication()}
          >
            삭제
          </FormButton>
          {onCloseDetail ? (
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary"
              disabled={actionBusy}
              onClick={onCloseDetail}
            >
              닫기
            </FormButton>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className="gov-application-detail-edit"
      data-testid="government-profile-application-detail-edit"
    >
      <div className="claim-requests-page__detail-section">
        <div className="claim-requests-page__detail-title">
          #{detail.id} {detail.title || '제목 없음'}
        </div>
        <div className="claim-requests-page__detail-meta">
          접수 {formatDateTime(detail.submittedAt ?? detail.createdAt)}
          {detail.updatedAt ? ` · 수정 ${formatDateTime(detail.updatedAt)}` : ''}
        </div>
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

      <div className="gov-application-detail-edit__actions">
        <FormButton
          htmlType="button"
          variant="primary"
          className="gov-btn gov-btn--primary"
          onClick={() => void onSaveDetail()}
          loading={actionBusy}
        >
          저장
        </FormButton>
        {!alwaysEditing ? (
          <FormButton
            htmlType="button"
            variant="secondary"
            className="gov-btn gov-btn--secondary"
            disabled={actionBusy}
            onClick={() => onCancelEdit?.()}
          >
            취소
          </FormButton>
        ) : null}
        <FormButton
          htmlType="button"
          variant="danger"
          size="sm"
          className="gov-btn gov-btn--danger gov-btn--sm"
          onClick={() => void onDeleteApplication()}
          loading={actionBusy}
        >
          삭제
        </FormButton>
      </div>
    </div>
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
