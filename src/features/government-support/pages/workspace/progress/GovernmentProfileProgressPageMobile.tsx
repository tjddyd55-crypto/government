import { EmptyState, StatusMessage } from '../../../../../components/feedback'
import { FormButton, FormInput, FormTextarea } from '../../../../../components/form'
import GovernmentProfileProgressSummarySection from '../../../components/GovernmentProfileProgressSummarySection'
import {
  GOVERNMENT_PROFILE_PROGRESS_INPUT_MAX,
  GOVERNMENT_PROFILE_PROGRESS_TITLE_MAX,
} from '../../../constants/governmentProfileProgress.config'
import { progressStatusBadgeTone } from '../../../utils/governmentProfileProgressSummary'
import type { GovernmentProfileProgressViewProps } from './governmentProfileProgressViewProps'

export default function GovernmentProfileProgressPageMobile(props: GovernmentProfileProgressViewProps) {
  const {
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
  } = props

  return (
    <div className="content-wrapper page-shell">
      <StatusMessage message={error} tone="error" className="status-message--flush-top" />

      <GovernmentProfileProgressSummarySection summary={summary} />

      <section className="customer-workspace-tab-section">
        <h2 className="customer-workspace-tab-section__title">진행 이력</h2>
        <form onSubmit={onSubmit} className="customer-workspace-tab-form">
          <label className="customer-workspace-tab-field">
            진행 일자{' '}
            <FormInput type="date" value={eventDate} onChange={(ev) => onSetEventDate(ev.target.value)} />
          </label>
          <label className="customer-workspace-tab-field">
            접수 상태{' '}
            <select
              value={status}
              onChange={(e) => onSetStatus(e.target.value)}
              className="customer-workspace-tab-select"
            >
              <option value="">상태 선택</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="customer-workspace-tab-field">
            제목 (선택){' '}
            <FormInput
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
            className="customer-workspace-tab-textarea"
            placeholder="처리 메모"
            maxLength={GOVERNMENT_PROFILE_PROGRESS_INPUT_MAX}
          />
          <FormButton htmlType="submit" variant="action" disabled={busy} className="customer-workspace-tab-submit">
            {busy ? '저장 중…' : '진행 이력 추가'}
          </FormButton>
        </form>
        {rows.length === 0 ? (
          <EmptyState message="등록된 진행 이력이 없습니다." className="customer-workspace-empty-state" />
        ) : (
          <ul className="customer-workspace-record-list">
            {rows.map((r) => {
              const tone = progressStatusBadgeTone(r.status)
              return (
                <li key={r.id} className="customer-workspace-record-item">
                  <div className="customer-workspace-record-item__head">
                    <div className="customer-workspace-record-item__meta">
                      <div className="customer-workspace-record-item__date">
                        {r.eventDate || r.createdAt.slice(0, 10)}
                      </div>
                      {r.status ? (
                        <span
                          className={`government-status-summary-card__badge government-status-summary-card__badge--${tone}`}
                        >
                          {r.status}
                        </span>
                      ) : null}
                    </div>
                    <FormButton
                      htmlType="button"
                      variant="action"
                      className="filter-button"
                      disabled={busy}
                      onClick={() => void onDelete(r.id)}
                    >
                      삭제
                    </FormButton>
                  </div>
                  {r.title ? <div className="customer-workspace-record-item__title">{r.title}</div> : null}
                  <div className="customer-workspace-record-item__body">{r.content || '—'}</div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
