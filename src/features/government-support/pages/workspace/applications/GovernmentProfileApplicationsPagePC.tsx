import { StatusMessage } from '../../../../../components/feedback'
import { FormButton, FormInput, FormSelect, FormTextarea } from '../../../../../components/form'
import {
  GOVERNMENT_PROFILE_APPLICATION_CONTENT_MAX,
  GOVERNMENT_PROFILE_APPLICATION_TITLE_MAX,
} from '../../../constants/governmentProfileApplication.config'
import { GovernmentProfileApplicationDetailBody } from './sections/GovernmentProfileApplicationDetailSection'
import GovernmentProfileApplicationListSection from './sections/GovernmentProfileApplicationListSection'
import type { GovernmentProfileApplicationsViewProps } from './governmentProfileApplicationsViewProps'

export default function GovernmentProfileApplicationsPagePC(props: GovernmentProfileApplicationsViewProps) {
  return (
    <main className="gov-applications-page government-profile-applications-page gov-user-page">
      <StatusMessage message={props.error} tone="error" />
      {props.statusNotice ? (
        <div className="claim-requests-page__status-notice gov-applications-page__status-notice" role="status" aria-live="polite">
          {props.statusNotice}
        </div>
      ) : null}

      <section
        className="gov-user-card gov-applications-page__create-card gov-workspace-compose-card"
        data-testid="government-profile-application-compose-inline"
      >
        <div className="gov-workspace-compose-card__header">
          <h2 className="gov-workspace-compose-card__title">신청 등록</h2>
          <p className="gov-workspace-compose-card__desc">새 신청 건을 등록합니다.</p>
        </div>
        <form className="gov-applications-page__create-form" onSubmit={props.onSubmitCreate}>
          <div className="gov-applications-page__create-grid">
            <FormInput
              className="gov-form-control claim-requests-page__status-select"
              value={props.createTitle}
              onChange={(event) => props.onSetCreateTitle(event.target.value)}
              placeholder="신청 제목"
              maxLength={GOVERNMENT_PROFILE_APPLICATION_TITLE_MAX}
            />
            <FormSelect
              className="gov-form-control claim-requests-page__status-select"
              value={props.createType}
              onChange={(event) => props.onSetCreateType(event.target.value)}
              options={[
                { value: '', label: '유형 선택' },
                ...props.applicationTypeOptions.map((name) => ({ value: name, label: name })),
              ]}
            />
          </div>
          <FormTextarea
            className="gov-form-control claim-requests-page__status-memo"
            rows={4}
            value={props.createContent}
            onChange={(event) => props.onSetCreateContent(event.target.value)}
            placeholder="신청 내용"
            maxLength={GOVERNMENT_PROFILE_APPLICATION_CONTENT_MAX}
          />
          <div className="gov-applications-page__create-actions">
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

      <div className="gov-applications-page__body">
        <div className="gov-applications-page__list-column">
          <div className="gov-applications-page__list-tools">
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary gov-btn--sm"
              onClick={() => void props.onReloadList()}
              disabled={props.loading}
            >
              새로고침
            </FormButton>
          </div>
          <GovernmentProfileApplicationListSection
            variant="workspace"
            rows={props.rows}
            selectedId={props.selectedId}
            loading={props.loading}
            profileLabel={props.profileLabel}
            actionBusy={props.busy}
            onSelectApplication={props.onSelectApplication}
            onDeleteApplication={(id) => void props.onDeleteApplicationById(id)}
            formatDateTime={props.formatDateTime}
            statusLabel={props.statusLabel}
            statusBadgeClass={props.statusBadgeClass}
            listPreviewText={props.listPreviewText}
          />
        </div>

        <section className="gov-user-card gov-applications-page__detail-card">
          <div className="gov-applications-page__detail-head">
            <h3 className="gov-applications-page__detail-title">신청 상세</h3>
          </div>
          <div className="gov-applications-page__detail-body">
            <GovernmentProfileApplicationDetailBody
              detail={props.detail}
              detailLoading={props.detailLoading}
              editing={props.detailEditing}
              statusTarget={props.statusTarget}
              editTitle={props.editTitle}
              editContent={props.editContent}
              editType={props.editType}
              applicationTypeOptions={props.applicationTypeOptions}
              actionBusy={props.busy}
              statusOptions={props.statusOptions}
              statusNotice={props.statusNotice}
              onStartEdit={props.onStartDetailEdit}
              onCancelEdit={props.onCancelDetailEdit}
              onCloseDetail={props.onCloseDetail}
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
        </section>
      </div>
    </main>
  )
}
