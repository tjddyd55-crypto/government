import { EmptyState, StatusMessage } from '../../../../../components/feedback'
import { FormButton, FormInput, FormTextarea } from '../../../../../components/form'
import { parseConsultationStoredBody } from '../../../../customers/utils/consultationBodyFormat'
import { GOVERNMENT_PROFILE_CONSULTATION_INPUT_MAX } from '../../../constants/governmentProfileConsultation.config'
import type { GovernmentProfileConsultationsViewProps } from './governmentProfileConsultationsViewProps'

export default function GovernmentProfileConsultationsPagePC({
  error,
  body,
  consultDate,
  busy,
  rows,
  onSetBody,
  onSetConsultDate,
  onSubmit,
  onDelete,
  onAddTodoFromConsultation,
}: GovernmentProfileConsultationsViewProps) {
  return (
    <div className="content-wrapper page-shell gov-workspace-tab-page">
      <StatusMessage message={error} tone="error" className="status-message--flush-top" />

      <section
        className="gov-user-card gov-workspace-compose-card"
        data-testid="government-profile-consultation-compose-inline"
      >
        <div className="gov-workspace-compose-card__header">
          <h2 className="gov-workspace-compose-card__title">상담 기록</h2>
          <p className="gov-workspace-compose-card__desc">상담 일자와 내용을 등록합니다.</p>
        </div>
        <form onSubmit={onSubmit} className="gov-workspace-compose-card__form">
          <label className="gov-workspace-compose-card__field">
            <span className="gov-workspace-compose-card__label">상담 일자</span>
            <FormInput
              type="date"
              className="gov-form-control"
              value={consultDate}
              onChange={(ev) => onSetConsultDate(ev.target.value)}
            />
          </label>
          <FormTextarea
            value={body}
            onChange={(ev) => onSetBody(ev.target.value)}
            rows={4}
            className="gov-form-control gov-workspace-compose-card__textarea"
            placeholder="상담 내용"
            maxLength={GOVERNMENT_PROFILE_CONSULTATION_INPUT_MAX}
          />
          <div className="gov-workspace-compose-card__actions">
            <FormButton
              htmlType="submit"
              variant="primary"
              disabled={busy}
              className="gov-btn gov-btn--primary"
            >
              {busy ? '저장 중…' : '상담 추가'}
            </FormButton>
          </div>
        </form>
      </section>

      <section className="gov-workspace-record-section">
        <div className="gov-workspace-record-section__head">
          <h3 className="gov-workspace-record-section__title">등록된 상담</h3>
          <span className="gov-workspace-record-section__count">총 {rows.length}건</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState message="등록된 상담이 없습니다." className="gov-workspace-record-section__empty" />
        ) : (
          <ul className="gov-workspace-record-list">
            {rows.map((r) => {
              const { dateLabel, text } = parseConsultationStoredBody(
                r.body,
                r.createdAt,
                r.consultationDate ?? null,
              )
              return (
                <li key={r.id} className="gov-workspace-record-card">
                  <div className="gov-workspace-record-card__head">
                    <div className="gov-workspace-record-card__date">{dateLabel}</div>
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
                      {onAddTodoFromConsultation ? (
                        <FormButton
                          htmlType="button"
                          variant="secondary"
                          size="sm"
                          className="gov-btn gov-btn--secondary gov-btn--sm"
                          disabled={busy}
                          onClick={() => onAddTodoFromConsultation(r.id, text)}
                        >
                          할 일로 추가
                        </FormButton>
                      ) : null}
                    </div>
                  </div>
                  <div className="gov-workspace-record-card__body">
                    <div className="gov-workspace-record-card__text">{text || '—'}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
