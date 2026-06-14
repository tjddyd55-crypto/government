import { StatusMessage } from '../../../../../components/feedback'
import { FormButton, FormInput, FormSelect, FormTextarea } from '../../../../../components/form'
import GovernmentProfileProgressSummarySection from '../../../components/GovernmentProfileProgressSummarySection'
import {
  GOVERNMENT_PROFILE_PROGRESS_INPUT_MAX,
  GOVERNMENT_PROFILE_PROGRESS_TITLE_MAX,
} from '../../../constants/governmentProfileProgress.config'
import { getGovernmentProgressStatusLabel } from '../../../constants/governmentProgressStatus'
import { progressStatusBadgeTone } from '../../../utils/governmentProfileProgressSummary'
import type { GovernmentProfileProgressViewProps } from './governmentProfileProgressViewProps'

export default function GovernmentProfileProgressPageBody({
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

      <div className="government-profile-progress-page" data-testid="government-profile-progress-page">
        <GovernmentProfileProgressSummarySection summary={summary} />

        <section
          className="government-profile-progress-content-grid"
          data-testid="government-profile-progress-content-grid"
        >
          <div
            className="government-profile-progress-compose-card gov-user-card"
            data-testid="government-profile-progress-compose-card"
          >
            <div className="government-profile-progress-compose-header">
              <h3 className="government-profile-progress-compose-title">진행 이력 작성</h3>
              <p className="government-profile-progress-compose-description">
                진행 일자 · 상태 · 메모를 등록합니다.
              </p>
            </div>
            <form onSubmit={onSubmit} className="government-profile-progress-compose-form">
              <div className="government-profile-progress-compose-row">
                <label className="government-profile-progress-compose-field">
                  <span className="government-profile-progress-compose-label">진행 일자</span>
                  <FormInput
                    type="date"
                    className="gov-form-control"
                    value={eventDate}
                    onChange={(ev) => onSetEventDate(ev.target.value)}
                  />
                </label>
                <label className="government-profile-progress-compose-field">
                  <span className="government-profile-progress-compose-label">접수 상태</span>
                  <FormSelect
                    className="gov-form-control"
                    value={status}
                    onChange={(ev) => onSetStatus(ev.target.value)}
                    options={[
                      { value: '', label: '상태 선택' },
                      ...statusOptions.map((option) => ({ value: option, label: option })),
                    ]}
                  />
                </label>
              </div>
              <label className="government-profile-progress-compose-field">
                <span className="government-profile-progress-compose-label">제목 (선택)</span>
                <FormInput
                  className="gov-form-control"
                  value={title}
                  maxLength={GOVERNMENT_PROFILE_PROGRESS_TITLE_MAX}
                  onChange={(ev) => onSetTitle(ev.target.value)}
                  placeholder="진행 제목"
                />
              </label>
              <label className="government-profile-progress-compose-field">
                <span className="government-profile-progress-compose-label">처리 메모</span>
                <FormTextarea
                  value={content}
                  onChange={(ev) => onSetContent(ev.target.value)}
                  rows={4}
                  className="gov-form-control"
                  placeholder="처리 메모"
                  maxLength={GOVERNMENT_PROFILE_PROGRESS_INPUT_MAX}
                />
              </label>
              <div className="government-profile-progress-compose-actions">
                <FormButton
                  htmlType="submit"
                  variant="primary"
                  disabled={busy}
                  className="gov-btn gov-btn--primary government-profile-progress-submit-button"
                >
                  {busy ? '저장 중…' : '진행 이력 추가'}
                </FormButton>
              </div>
            </form>
          </div>

          <div
            className="government-profile-progress-history-card gov-user-card"
            data-testid="government-profile-progress-history-card"
          >
            <div className="government-profile-progress-history-header">
              <h3 className="government-profile-progress-history-title">등록된 진행 이력</h3>
              <span className="government-profile-progress-history-count">총 {rows.length}건</span>
            </div>

            {rows.length === 0 ? (
              <p className="government-profile-progress-history-empty" role="status">
                등록된 진행 이력이 없습니다.
              </p>
            ) : (
              <ul
                className="government-profile-progress-history-list"
                data-testid="government-profile-progress-record-list"
              >
                {rows.map((row) => {
                  const tone = progressStatusBadgeTone(row.status)
                  return (
                    <li key={row.id} className="government-profile-progress-history-item">
                      <div className="government-profile-progress-history-item-header">
                        <span className="government-profile-progress-history-date">
                          {row.eventDate || row.createdAt.slice(0, 10)}
                        </span>
                        {row.status ? (
                          <span
                            className={`government-profile-progress-history-status government-profile-progress-history-status--${tone}`}
                          >
                            {getGovernmentProgressStatusLabel(row.status)}
                          </span>
                        ) : null}
                      </div>
                      {row.title ? (
                        <div className="government-profile-progress-history-title-text">{row.title}</div>
                      ) : null}
                      <div className="government-profile-progress-history-note">{row.content || '—'}</div>
                      <div className="government-profile-progress-history-actions">
                        <FormButton
                          htmlType="button"
                          variant="danger"
                          size="sm"
                          className="gov-btn gov-btn--danger gov-btn--sm"
                          disabled={busy}
                          onClick={() => void onDelete(row.id)}
                        >
                          삭제
                        </FormButton>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
