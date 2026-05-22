import PCOnlySection from '../../../../../components/PCOnlySection'
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
    <main className="page claim-requests-page claim-requests-page--pc page--with-back content-wrapper">
      <StatusMessage message={props.error} tone="error" />

      <section className="claim-requests-page__card" style={{ marginBottom: 16 }}>
        <div className="claim-requests-page__section-header">
          <div>
            <h2 className="claim-requests-page__section-title">신청 등록</h2>
            <p className="claim-requests-page__section-description">새 신청 건을 등록합니다.</p>
          </div>
        </div>
        <form onSubmit={props.onSubmitCreate}>
          <div className="claim-requests-page__status-form-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <FormInput
              className="claim-requests-page__status-select"
              value={props.createTitle}
              onChange={(event) => props.onSetCreateTitle(event.target.value)}
              placeholder="신청 제목"
              maxLength={GOVERNMENT_PROFILE_APPLICATION_TITLE_MAX}
            />
            <FormSelect
              className="claim-requests-page__status-select"
              value={props.createType}
              onChange={(event) => props.onSetCreateType(event.target.value)}
              options={[
                { value: '', label: '유형 선택' },
                ...props.applicationTypeOptions.map((name) => ({ value: name, label: name })),
              ]}
            />
          </div>
          <FormTextarea
            className="claim-requests-page__status-memo"
            rows={3}
            value={props.createContent}
            onChange={(event) => props.onSetCreateContent(event.target.value)}
            placeholder="신청 내용"
            maxLength={GOVERNMENT_PROFILE_APPLICATION_CONTENT_MAX}
          />
          <FormButton htmlType="submit" variant="primary" disabled={props.busy} style={{ marginTop: 8 }}>
            {props.busy ? '저장 중…' : '신청 추가'}
          </FormButton>
        </form>
      </section>

      <section className="claim-requests-page__claims-grid">
        <article className="claim-requests-page__panel claim-requests-page__panel--list">
          <div className="claim-requests-page__panel-head">
            <h3>신청 관리</h3>
            <div className="claim-requests-page__panel-head-tools">
              <span>총 {props.rows.length}건</span>
              <FormButton htmlType="button" variant="secondary" onClick={() => void props.onReloadList()} disabled={props.loading}>
                새로고침
              </FormButton>
            </div>
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
        </article>

        <article className="claim-requests-page__panel claim-requests-page__panel--detail">
          <div className="claim-requests-page__panel-head">
            <h3>신청 상세</h3>
          </div>
          <div className="claim-requests-page__detail-scroll">
            {props.statusNotice ? (
              <div className="claim-requests-page__status-notice" role="status" aria-live="polite">
                {props.statusNotice}
              </div>
            ) : null}
            <GovernmentProfileApplicationDetailBody
              detail={props.detail}
              detailLoading={props.detailLoading}
              statusTarget={props.statusTarget}
              editTitle={props.editTitle}
              editContent={props.editContent}
              editType={props.editType}
              applicationTypeOptions={props.applicationTypeOptions}
              actionBusy={props.busy}
              statusOptions={props.statusOptions}
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
        </article>

        <PCOnlySection fallback={null}>
          <article className="claim-requests-page__panel claim-requests-page__panel--timeline">
            <div className="claim-requests-page__panel-head">
              <h3>상태 이력</h3>
            </div>
            <div className="claim-requests-page__timeline-scroll">
              <div className="claim-requests-page__timeline-empty">상태 이력 연동은 후속 작업 예정입니다.</div>
            </div>
          </article>
        </PCOnlySection>
      </section>
    </main>
  )
}
