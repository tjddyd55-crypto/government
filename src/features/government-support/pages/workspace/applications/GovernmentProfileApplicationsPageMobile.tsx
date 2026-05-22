import Modal from '../../../../../components/ui/Modal'
import { StatusMessage } from '../../../../../components/feedback'
import { FormButton, FormInput, FormSelect, FormTextarea } from '../../../../../components/form'
import {
  GOVERNMENT_PROFILE_APPLICATION_CONTENT_MAX,
  GOVERNMENT_PROFILE_APPLICATION_TITLE_MAX,
} from '../../../constants/governmentProfileApplication.config'
import GovernmentProfileApplicationDetailSection from './sections/GovernmentProfileApplicationDetailSection'
import GovernmentProfileApplicationListSection from './sections/GovernmentProfileApplicationListSection'
import type { GovernmentProfileApplicationsViewProps } from './governmentProfileApplicationsViewProps'

export default function GovernmentProfileApplicationsPageMobile(props: GovernmentProfileApplicationsViewProps) {
  return (
    <main className="page claim-requests-page claim-requests-page--mobile page--with-back content-wrapper">
      <StatusMessage message={props.error} tone="error" />
      {props.statusNotice ? (
        <div className="claim-requests-page__status-notice" role="status" aria-live="polite">
          {props.statusNotice}
        </div>
      ) : null}

      <section className="claim-requests-page__card">
        <div className="claim-requests-page__section-header">
          <h2 className="claim-requests-page__section-title">신청 등록</h2>
        </div>
        <form onSubmit={props.onSubmitCreate}>
          <FormInput
            value={props.createTitle}
            onChange={(event) => props.onSetCreateTitle(event.target.value)}
            placeholder="신청 제목"
            maxLength={GOVERNMENT_PROFILE_APPLICATION_TITLE_MAX}
          />
          <FormSelect
            value={props.createType}
            onChange={(event) => props.onSetCreateType(event.target.value)}
            options={[
              { value: '', label: '유형 선택' },
              ...props.applicationTypeOptions.map((name) => ({ value: name, label: name })),
            ]}
          />
          <FormTextarea
            rows={3}
            value={props.createContent}
            onChange={(event) => props.onSetCreateContent(event.target.value)}
            placeholder="신청 내용"
            maxLength={GOVERNMENT_PROFILE_APPLICATION_CONTENT_MAX}
          />
          <FormButton htmlType="submit" variant="primary" disabled={props.busy}>
            {props.busy ? '저장 중…' : '신청 추가'}
          </FormButton>
        </form>
      </section>

      <div className="claim-requests-page__panel-head-tools" style={{ margin: '12px 0' }}>
        <FormButton htmlType="button" variant="secondary" onClick={() => void props.onReloadList()} disabled={props.loading}>
          새로고침
        </FormButton>
      </div>

      <GovernmentProfileApplicationListSection
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
          panelClassName="workspace-mobile-outlet-modal customer-workspace-mobile-modal"
        >
          <div className="workspace-mobile-outlet-modal__header">
            <span className="workspace-mobile-outlet-modal__spacer" aria-hidden />
            <h2 className="workspace-mobile-outlet-modal__title">신청 상세</h2>
            <button type="button" className="workspace-mobile-outlet-modal__close" onClick={props.onCloseMobileDetail}>
              닫기
            </button>
          </div>
          <div className="workspace-mobile-outlet-modal__body customer-workspace-mobile-modal__body">
            <GovernmentProfileApplicationDetailSection
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
        </Modal>
      ) : null}
    </main>
  )
}
