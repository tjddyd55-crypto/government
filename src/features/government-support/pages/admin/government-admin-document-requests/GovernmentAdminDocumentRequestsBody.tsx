import { useState } from 'react'
import { FieldWrapper, FormButton, FormInput, FormSelect, FormTextarea } from '../../../../../components/form'
import { formatAssigneeLabel } from '../../../hooks/useGovernmentOperationalAssigneeOptions'
import {
  GOV_ADMIN_DOC_REQUEST_STATUS_OPTIONS,
  govAdminDocRequestItemStatusClass,
  govAdminDocRequestStatusClass,
  govAdminDocRequestStatusLabel,
  type GovernmentAdminDocumentRequestsViewProps,
} from '../../../hooks/useGovernmentAdminDocumentRequestsState'
import { formatGovInboxDateTime, formatGovInboxFileSize } from '../../../lib/governmentAdminInboxDisplay'
import '../../../../claim-requests/claim-inbox.css'

type Props = GovernmentAdminDocumentRequestsViewProps & {
  variant: 'pc' | 'mobile'
}

export default function GovernmentAdminDocumentRequestsBody({ variant, ...p }: Props) {
  const isMobile = variant === 'mobile'
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  const handleSelect = (id: string) => {
    p.onSelectRow(id)
    if (isMobile) setMobileDetailOpen(true)
  }

  const handleCreate = async () => {
    const createdId = await p.onCreateRequest()
    if (createdId && isMobile) setMobileDetailOpen(true)
  }

  const renderDetail = () => {
    if (p.detailLoading) {
      return <div className="gov-status-loading claim-inbox__empty">상세를 불러오는 중…</div>
    }
    if (!p.detail) {
      return <div className="gov-status-empty claim-inbox__empty">목록에서 요청서류를 선택해 주세요.</div>
    }

    const detail = p.detail
    return (
      <div className="claim-inbox__detail">
        <div className="claim-inbox__detail-head">
          <div>
            <div className="claim-inbox__detail-title">{detail.title || '요청 서류'}</div>
            <div className="claim-inbox__detail-meta">
              {detail.profileDisplayName || p.selectedRow?.profileDisplayName || '이용자'} · 발송{' '}
              {formatGovInboxDateTime(detail.createdAt)}
            </div>
            <div className="claim-inbox__detail-meta">
              제출 {detail.submittedCount}/{detail.itemCount}
            </div>
            <div className="claim-inbox__detail-meta">
              담당: {formatAssigneeLabel(detail.assignedToUserId, p.selectedRow?.assignedToDisplayName)}
            </div>
          </div>
          <span className={govAdminDocRequestStatusClass(detail.status)}>
            {govAdminDocRequestStatusLabel(detail.status)}
          </span>
        </div>

        {detail.message ? <div className="claim-inbox__detail-memo">{detail.message}</div> : null}

        <div className="claim-inbox__detail-section">
          <h3>요청 항목</h3>
          {detail.items.length === 0 ? (
            <div className="gov-status-empty claim-inbox__empty claim-inbox__empty--small">요청 항목이 없습니다.</div>
          ) : (
            <ul className="claim-inbox__history-list">
              {detail.items.map((item) => (
                <li key={item.id} className="claim-inbox__history-item">
                  <div className="claim-inbox__list-item-top">
                    <strong>{item.label}</strong>
                    <span className={govAdminDocRequestItemStatusClass(item.status)}>{item.status}</span>
                  </div>
                  {item.files.length === 0 ? (
                    <p className="claim-inbox__file-meta">제출 파일 없음</p>
                  ) : (
                    <div className="claim-inbox__file-list">
                      {item.files.map((file) => (
                        <div key={file.id} className="claim-inbox__file-item">
                          <span className="claim-inbox__file-thumb claim-inbox__file-thumb--file">
                            {String(file.mimeType ?? '').includes('pdf') ? 'PDF' : 'FILE'}
                          </span>
                          <div className="claim-inbox__file-main">
                            <div className="claim-inbox__file-name">{file.fileName}</div>
                            <div className="claim-inbox__file-meta">{formatGovInboxFileSize(file.fileSize)}</div>
                          </div>
                          <div className="claim-inbox__file-actions">
                            <FormButton
                              htmlType="button"
                              variant="secondary"
                              className="gov-btn gov-btn--secondary gov-btn--sm"
                              onClick={() => void p.onDownloadFile(file, item.id)}
                            >
                              다운
                            </FormButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="claim-inbox__detail-section claim-inbox__status-editor">
          <h3>담당자</h3>
          <div className="claim-inbox__status-editor-row">
            <FieldWrapper label="담당 직원" className="admin-modal-field">
              <FormSelect
                className="gov-form-control"
                value={p.assigneeTarget}
                onChange={(e) => p.setAssigneeTarget(e.target.value)}
                options={p.assignOptions}
                aria-label="담당자"
              />
            </FieldWrapper>
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary"
              onClick={() => void p.onAssigneeSave()}
              loading={p.assignBusy}
            >
              담당 저장
            </FormButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`government-admin-page claim-inbox government-admin-document-requests-page government-admin-document-requests-page--${variant}`}
      data-testid="government-admin-document-requests-page"
    >
      {p.error ? (
        <div className="gov-status-error-card admin-user-management__error-card" role="alert">
          {p.error}
        </div>
      ) : null}
      {p.notice ? <p className="status admin-ga-management__status-success m-0 mb-3">{p.notice}</p> : null}

      <section className="claim-inbox__hero">
        <div>
          <h1 className="claim-inbox__title">요청서류 관리</h1>
          <p className="claim-inbox__subtitle">이용자에게 요청서류를 발송하고 제출 여부를 확인합니다.</p>
        </div>
        <div className="claim-inbox__detail-actions government-admin-toolbar__actions">
          <FormButton
            htmlType="button"
            variant="primary"
            className="gov-btn gov-btn--primary"
            onClick={() => p.setComposeOpen((v) => !v)}
          >
            {p.composeOpen ? '발송 닫기' : '요청서류 발송'}
          </FormButton>
          <FormButton
            htmlType="button"
            variant="secondary"
            className="gov-btn gov-btn--secondary"
            onClick={() => void p.loadRows()}
            loading={p.loading}
          >
            새로고침
          </FormButton>
        </div>
      </section>

      {p.composeOpen ? (
        <section className="claim-inbox__detail-section government-admin-document-requests-compose">
          <h3>요청서류 발송</h3>
          <div className="government-form-grid">
            <FieldWrapper label="대상 사업장" className="admin-modal-field">
              <FormSelect
                className="gov-form-control"
                value={p.composeProfileId}
                onChange={(e) => p.setComposeProfileId(e.target.value)}
                options={p.profileOptions}
                aria-label="대상 사업장"
              />
            </FieldWrapper>
            <FieldWrapper label="요청 제목" className="admin-modal-field">
              <FormInput
                value={p.composeTitle}
                onChange={(e) => p.setComposeTitle(e.target.value)}
                placeholder="예) 2026년 서류 제출 요청"
                className="gov-form-control"
              />
            </FieldWrapper>
            <FieldWrapper label="안내 메시지" className="admin-modal-field government-ops-form-grid__full">
              <FormTextarea
                value={p.composeMessage}
                onChange={(e) => p.setComposeMessage(e.target.value)}
                rows={3}
                placeholder="이용자에게 전달할 안내 메시지"
                className="gov-form-control"
              />
            </FieldWrapper>
            {p.composeItems.map((item, index) => (
              <FieldWrapper key={`compose-item-${index}`} label={`서류 항목 ${index + 1}`} className="admin-modal-field">
                <FormInput
                  value={item}
                  onChange={(e) => {
                    const next = [...p.composeItems]
                    next[index] = e.target.value
                    p.setComposeItems(next)
                  }}
                  placeholder={`예) ${index === 0 ? '사업자등록증' : '재무제표'}`}
                  className="gov-form-control"
                />
              </FieldWrapper>
            ))}
          </div>
          <div className="claim-inbox__detail-actions">
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary"
              onClick={() => p.setComposeItems((items) => [...items, ''])}
            >
              항목 추가
            </FormButton>
            <FormButton
              htmlType="button"
              variant="primary"
              className="gov-btn gov-btn--primary"
              onClick={() => void handleCreate()}
              loading={p.composeBusy}
            >
              발송
            </FormButton>
          </div>
        </section>
      ) : null}

      <section className="claim-inbox__summary-grid" aria-label="요청서류 요약">
        <div className="claim-inbox__summary-card">
          <span>전체</span>
          <strong>{p.rows.length}</strong>
        </div>
        <div className="claim-inbox__summary-card claim-inbox__summary-card--requested">
          <span>미제출</span>
          <strong>{p.openCount}</strong>
        </div>
        <div className="claim-inbox__summary-card claim-inbox__summary-card--processing">
          <span>일부 제출</span>
          <strong>{p.partialCount}</strong>
        </div>
        <div className="claim-inbox__summary-card claim-inbox__summary-card--done">
          <span>제출 완료</span>
          <strong>{p.completedCount}</strong>
        </div>
      </section>

      <section className="claim-inbox__toolbar government-admin-toolbar__filters">
        <FieldWrapper label="상태" className="government-admin-toolbar__field claim-inbox__filter-label">
          <FormSelect
            className="gov-form-control"
            value={p.statusFilter}
            onChange={(e) => p.setStatusFilter(e.target.value)}
            options={[...GOV_ADMIN_DOC_REQUEST_STATUS_OPTIONS]}
            aria-label="요청서류 상태"
          />
        </FieldWrapper>
        <FieldWrapper label="담당자" className="government-admin-toolbar__field claim-inbox__filter-label">
          <FormSelect
            className="gov-form-control"
            value={p.assigneeFilter}
            onChange={(e) => p.setAssigneeFilter(e.target.value)}
            options={p.filterOptions}
            aria-label="담당자 필터"
          />
        </FieldWrapper>
      </section>

      <div className={`claim-inbox__layout${isMobile ? ' claim-inbox__layout--mobile' : ''}`}>
        <section className="claim-inbox__list-panel">
          {p.loading ? <div className="gov-status-loading claim-inbox__empty">목록을 불러오는 중…</div> : null}
          {!p.loading && p.rows.length === 0 ? (
            <div className="gov-status-empty claim-inbox__empty">요청서류가 없습니다.</div>
          ) : null}
          <ul className="claim-inbox__list">
            {p.rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={`claim-inbox__list-item${p.selectedId === row.id ? ' claim-inbox__list-item--active' : ''}`}
                  onClick={() => handleSelect(row.id)}
                >
                  <div className="claim-inbox__list-item-top">
                    <strong>{row.title || '요청 서류'}</strong>
                    <span className={govAdminDocRequestStatusClass(row.status)}>
                      {govAdminDocRequestStatusLabel(row.status)}
                    </span>
                  </div>
                  <div className="claim-inbox__list-item-meta">
                    {row.profileDisplayName || '이용자'} ·{' '}
                    {formatAssigneeLabel(row.assignedToUserId, row.assignedToDisplayName)} · {row.submittedCount}/
                    {row.itemCount} 제출 · {formatGovInboxDateTime(row.createdAt)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {!isMobile ? <section className="claim-inbox__detail-panel">{renderDetail()}</section> : null}
      </div>

      {isMobile && mobileDetailOpen ? (
        <div className="claim-inbox__mobile-modal government-admin-modal-panel" role="dialog" aria-modal="true">
          <div className="claim-inbox__mobile-modal-head">
            <strong>요청서류 상세</strong>
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary gov-btn--sm"
              onClick={() => setMobileDetailOpen(false)}
            >
              닫기
            </FormButton>
          </div>
          <div className="claim-inbox__mobile-modal-body">{renderDetail()}</div>
        </div>
      ) : null}
    </div>
  )
}
