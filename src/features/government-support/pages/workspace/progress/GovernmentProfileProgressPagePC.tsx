import { EmptyState, StatusMessage } from '../../../../../components/feedback'
import { FormButton, FormInput, FormSelect, FormTextarea } from '../../../../../components/form'
import GovernmentProfileProgressSummarySection from '../../../components/GovernmentProfileProgressSummarySection'
import {
  GOVERNMENT_PROFILE_PROGRESS_INPUT_MAX,
  GOVERNMENT_PROFILE_PROGRESS_TITLE_MAX,
} from '../../../constants/governmentProfileProgress.config'
import { progressStatusBadgeTone } from '../../../utils/governmentProfileProgressSummary'
import { getGovernmentProgressStatusLabel } from '../../../constants/governmentProgressStatus'
import type { GovernmentProfileProgressViewProps } from './governmentProfileProgressViewProps'

export default function GovernmentProfileProgressPagePC({
  error,
  status,
  title,
  content,
  eventDate,
  busy,
  rows,
  summary,
  statusOptions,
  onSetStatus,
  onSetTitle,
  onSetContent,
  onSetEventDate,
  onSubmit,
  onDelete,
}: GovernmentProfileProgressViewProps) {
  return (
    <div className="content-wrapper page-shell gov-workspace-tab-page">
      <StatusMessage message={error} tone="error" className="status-message--flush-top" />

      <GovernmentProfileProgressSummarySection summary={summary} />

      <section
        className="gov-user-card gov-workspace-compose-card"
        data-testid="government-profile-progress-compose-inline"
      >
        <div className="gov-workspace-compose-card__header">
          <h2 className="gov-workspace-compose-card__title">진행 이력</h2>
          <p className="gov-workspace-compose-card__desc">진행 일자·상태·메모를 등록합니다.</p>
        </div>
        <form onSubmit={onSubmit} className="gov-workspace-compose-card__form">
          <label className="gov-workspace-compose-card__field">
            <span className="gov-workspace-compose-card__label">진행 일자</span>
            <FormInput
              type="date"
              className="gov-form-control"
              value={eventDate}
              onChange={(ev) => onSetEventDate(ev.target.value)}
            />
          </label>
          <label className="gov-workspace-compose-card__field">
            <span className="gov-workspace-compose-card__label">접수 상태</span>
            <FormSelect
              className="gov-form-control"
              value={status}
              onChange={(ev) => onSetStatus(ev.target.value)}
              options={[
                { value: '', label: '상태 선택' },
                ...statusOptions.map((s) => ({ value: s, label: s })),
              ]}
            />
          </label>
          <label className="gov-workspace-compose-card__field">
            <span className="gov-workspace-compose-card__label">제목 (선택)</span>
            <FormInput
              className="gov-form-control"
              value={title}
              maxLength={GOVERNMENT_PROFILE_PROGRESS_TITLE_MAX}
              onChange={(ev) => onSetTitle(ev.target.value)}
              placeholder="진행 제목"
            />
          </label>
          <FormTextarea
            value={content}
            onChange={(ev) => onSetContent(ev.target.value)}
            rows={4}
            className="gov-form-control gov-workspace-compose-card__textarea"
            placeholder="처리 메모"
            maxLength={GOVERNMENT_PROFILE_PROGRESS_INPUT_MAX}
          />
          <div className="gov-workspace-compose-card__actions">
            <FormButton
              htmlType="submit"
              variant="primary"
              disabled={busy}
              className="gov-btn gov-btn--primary"
            >
              {busy ? '저장 중…' : '진행 이력 추가'}
            </FormButton>
          </div>
        </form>
      </section>

      <section className="gov-workspace-record-section">
        <div className="gov-workspace-record-section__head">
          <h3 className="gov-workspace-record-section__title">등록된 진행 이력</h3>
          <span className="gov-workspace-record-section__count">총 {rows.length}건</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState message="등록된 진행 이력이 없습니다." className="gov-workspace-record-section__empty" />
        ) : (
          <ul className="gov-workspace-record-list" data-testid="government-profile-progress-record-list">
            {rows.map((r) => {
              const tone = progressStatusBadgeTone(r.status)
              return (
                <li key={r.id} className="gov-workspace-record-card">
                  <div className="gov-workspace-record-card__head">
                    <div className="gov-workspace-record-card__meta-group">
                      <div className="gov-workspace-record-card__date">
                        {r.eventDate || r.createdAt.slice(0, 10)}
                      </div>
                      {r.status ? (
                        <span
                          className={`government-status-summary-card__badge government-status-summary-card__badge--${tone}`}
                        >
                          {getGovernmentProgressStatusLabel(r.status)}
                        </span>
                      ) : null}
                    </div>
                    <div className="gov-workspace-record-card__actions">
                      <FormButton
                        htmlType="button"
                        variant="danger"
                        size="sm"
                        className="gov-btn gov-btn--danger gov-btn--sm"
                        disabled={busy}
                        onClick={() => void onDelete(r.id)}
                      >
                        삭제
                      </FormButton>
                    </div>
                  </div>
                  {r.title ? <div className="gov-workspace-record-card__subtitle">{r.title}</div> : null}
                  <div className="gov-workspace-record-card__text">{r.content || '—'}</div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
