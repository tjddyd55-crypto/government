import Modal from '../../../../../components/ui/Modal'
import { StatusMessage } from '../../../../../components/feedback'
import { FormButton, FormInput, FormSelect, FormTextarea } from '../../../../../components/form'
import {
  GOVERNMENT_PROFILE_APPLICATION_CONTENT_MAX,
  GOVERNMENT_PROFILE_APPLICATION_TITLE_MAX,
} from '../../../constants/governmentProfileApplication.config'
import { GovernmentProfileApplicationDetailBody } from './sections/GovernmentProfileApplicationDetailSection'
import GovernmentProfileApplicationListSection from './sections/GovernmentProfileApplicationListSection'
import type { GovernmentProfileApplicationsViewProps } from './governmentProfileApplicationsViewProps'

export default function GovernmentProfileApplicationsPageMobile(props: GovernmentProfileApplicationsViewProps) {
  return (
    <div className="government-profile-mobile-section government-profile-mobile-applications">
      <StatusMessage message={props.error} tone="error" />
      {props.statusNotice ? (
        <div className="government-profile-mobile-applications__notice" role="status" aria-live="polite">
          {props.statusNotice}
        </div>
      ) : null}

      <section className="government-profile-mobile-card government-profile-mobile-applications-form">
        <h2 className="government-profile-mobile-card__title">신청 등록</h2>
        <form className="government-profile-mobile-form" onSubmit={props.onSubmitCreate}>
          <label className="government-profile-mobile-field">
            <span className="government-profile-mobile-label">신청 제목</span>
            <FormInput
              className="gov-form-control government-profile-mobile-input"
              value={props.createTitle}
              onChange={(event) => props.onSetCreateTitle(event.target.value)}
              placeholder="신청 제목"
              maxLength={GOVERNMENT_PROFILE_APPLICATION_TITLE_MAX}
            />
          </label>
          <label className="government-profile-mobile-field">
            <span className="government-profile-mobile-label">유형</span>
            <FormSelect
              className="gov-form-control government-profile-mobile-select"
              value={props.createType}
              onChange={(event) => props.onSetCreateType(event.target.value)}
              options={[
                { value: '', label: '유형 선택' },
                ...props.applicationTypeOptions.map((name) => ({ value: name, label: name })),
              ]}
            />
          </label>
          <label className="government-profile-mobile-field">
            <span className="government-profile-mobile-label">신청 내용</span>
            <FormTextarea
              className="gov-form-control government-profile-mobile-textarea"
              rows={4}
              value={props.createContent}
              onChange={(event) => props.onSetCreateContent(event.target.value)}
              placeholder="신청 내용"
              maxLength={GOVERNMENT_PROFILE_APPLICATION_CONTENT_MAX}
            />
          </label>
          <div className="government-profile-mobile-actions">
            <FormButton
              htmlType="submit"
              variant="primary"
              disabled={props.busy}
              className="gov-btn gov-btn--primary"
            >
              {props.busy ? '저장 중…' : '신청 추가'}
            </FormButton>
          </div>
        </form>
      </section>

      <div className="government-profile-mobile-actions government-profile-applications__list-tools">
        <FormButton
          htmlType="button"
          variant="secondary"
          className="gov-btn gov-btn--secondary"
          onClick={() => void props.onReloadList()}
          disabled={props.loading}
        >
          새로고침
        </FormButton>
      </div>

      <GovernmentProfileApplicationListSection
        variant="profileMobile"
        rows={props.rows}
        selectedId={props.selectedId}
        loading={props.loading}
        profileLabel={props.profileLabel}
        onSelectApplication={props.onSelectApplication}
        formatDateTime={props.formatDateTime}
        statusLabel={props.statusLabel}
        statusBadgeClass={props.statusBadgeClass}
        listPreviewText={props.listPreviewText}
      />

      {props.mobileDetailOpen && props.detail ? (
        <Modal
          open
          onClose={props.onCloseMobileDetail}
          ariaLabel="신청 상세"
          panelClassName="workspace-mobile-outlet-modal government-profile-mobile-detail government-profile-mobile-applications-detail-modal"
        >
          <div className="workspace-mobile-outlet-modal__header government-profile-mobile-detail__header">
            <span className="workspace-mobile-outlet-modal__spacer" aria-hidden />
            <h2 className="workspace-mobile-outlet-modal__title government-profile-mobile-detail__title">신청 상세</h2>
            <button
              type="button"
              className="workspace-mobile-outlet-modal__close government-profile-mobile-detail__close"
              onClick={props.onCloseMobileDetail}
            >
              닫기
            </button>
          </div>
          <div className="workspace-mobile-outlet-modal__body government-profile-mobile-detail__body">
            <div className="government-profile-mobile-card government-profile-mobile-applications-detail">
              <GovernmentProfileApplicationDetailBody
                alwaysEditing
                detail={props.detail}
                detailLoading={props.detailLoading}
                statusTarget={props.statusTarget}
                editTitle={props.editTitle}
                editContent={props.editContent}
                editType={props.editType}
                applicationTypeOptions={props.applicationTypeOptions}
                actionBusy={props.busy}
                statusOptions={props.statusOptions}
                statusNotice={props.statusNotice}
                onSetStatusTarget={props.onSetStatusTarget}
                onSetEditTitle={props.onSetEditTitle}
                onSetEditContent={props.onSetEditContent}
                onSetEditType={props.onSetEditType}
                onSaveDetail={props.onSaveDetail}
                onSaveStatus={props.onSaveStatus}
                onDeleteApplication={props.onDeleteApplication}
                formatDateTime={props.formatDateTime}
                statusLabel={props.statusLabel}
              />
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
