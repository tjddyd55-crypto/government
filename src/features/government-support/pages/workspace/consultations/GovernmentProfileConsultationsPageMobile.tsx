import { EmptyState, StatusMessage } from '../../../../../components/feedback'
import { FormButton, FormInput, FormTextarea } from '../../../../../components/form'
import { parseConsultationStoredBody } from '../../../../customers/utils/consultationBodyFormat'
import { GOVERNMENT_PROFILE_CONSULTATION_INPUT_MAX } from '../../../constants/governmentProfileConsultation.config'
import type { GovernmentProfileConsultationsViewProps } from './governmentProfileConsultationsViewProps'

export default function GovernmentProfileConsultationsPageMobile({
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
    <div className="content-wrapper page-shell">
      <StatusMessage message={error} tone="error" className="status-message--flush-top" />

      <section className="customer-workspace-tab-section">
        <h2 className="customer-workspace-tab-section__title">상담 기록</h2>
        <form onSubmit={onSubmit} className="customer-workspace-tab-form">
          <label className="customer-workspace-tab-field">
            상담 일자{' '}
            <FormInput type="date" value={consultDate} onChange={(ev) => onSetConsultDate(ev.target.value)} />
          </label>
          <FormTextarea
            value={body}
            onChange={(ev) => onSetBody(ev.target.value)}
            rows={4}
            className="customer-workspace-tab-textarea"
            placeholder="상담 내용"
            maxLength={GOVERNMENT_PROFILE_CONSULTATION_INPUT_MAX}
          />
          <FormButton htmlType="submit" variant="action" disabled={busy} className="customer-workspace-tab-submit">
            {busy ? '저장 중…' : '상담 추가'}
          </FormButton>
        </form>
        {rows.length === 0 ? (
          <EmptyState message="등록된 상담이 없습니다." className="customer-workspace-empty-state" />
        ) : (
          <ul className="customer-workspace-record-list">
            {rows.map((r) => {
              const { dateLabel, text } = parseConsultationStoredBody(
                r.body,
                r.createdAt,
                r.consultationDate ?? null,
              )
              return (
                <li key={r.id} className="customer-workspace-record-item">
                  <div className="customer-workspace-record-item__head">
                    <div className="customer-workspace-record-item__date">{dateLabel}</div>
                    <div className="customer-workspace-record-item__actions">
                      <FormButton
                        htmlType="button"
                        variant="action"
                        className="gov-btn gov-btn--secondary gov-btn--sm"
                        disabled={busy}
                        onClick={() => void onDelete(r.id)}
                      >
                        삭제
                      </FormButton>
                      {onAddTodoFromConsultation ? (
                        <FormButton
                          htmlType="button"
                          variant="secondary"
                          className="gov-btn gov-btn--secondary gov-btn--sm"
                          disabled={busy}
                          onClick={() => onAddTodoFromConsultation(r.id, text)}
                        >
                          할 일로 추가
                        </FormButton>
                      ) : null}
                    </div>
                  </div>
                  <div className="customer-workspace-record-item__body">{text || '—'}</div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
