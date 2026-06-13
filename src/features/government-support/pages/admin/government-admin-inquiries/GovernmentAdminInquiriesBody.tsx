import { useState } from 'react'
import { StatusMessage } from '../../../../../components/feedback'
import { FieldWrapper, FormButton, FormSelect, FormTextarea } from '../../../../../components/form'
import { formatAssigneeLabel } from '../../../hooks/useGovernmentOperationalAssigneeOptions'
import {
  GOV_ADMIN_INQUIRY_DETAIL_STATUS_OPTIONS,
  GOV_ADMIN_INQUIRY_STATUS_OPTIONS,
  govAdminInquirySenderLabel,
  govAdminInquiryStatusClass,
  govAdminInquiryStatusLabel,
  type GovernmentAdminInquiriesViewProps,
} from '../../../hooks/useGovernmentAdminInquiriesState'
import { formatGovInboxDateTime, formatGovInboxFileSize } from '../../../lib/governmentAdminInboxDisplay'
import '../../../../claim-requests/claim-inbox.css'

type Props = GovernmentAdminInquiriesViewProps & {
  variant: 'pc' | 'mobile'
}

export default function GovernmentAdminInquiriesBody({ variant, ...p }: Props) {
  const isMobile = variant === 'mobile'
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  const handleSelect = (id: string) => {
    p.onSelectRow(id)
    if (isMobile) setMobileDetailOpen(true)
  }

  const renderDetail = () => {
    if (p.detailLoading) return <div className="claim-inbox__empty">상세를 불러오는 중…</div>
    if (!p.detail) return <div className="claim-inbox__empty">목록에서 문의를 선택해 주세요.</div>

    const detail = p.detail
    return (
      <div className="claim-inbox__detail">
        <div className="claim-inbox__detail-head">
          <div>
            <div className="claim-inbox__detail-title">
              {p.selectedRow?.ownerDisplayName || detail.title || '문의'}
            </div>
            <div className="claim-inbox__detail-meta">작성 {formatGovInboxDateTime(detail.createdAt)}</div>
          </div>
          <span className={govAdminInquiryStatusClass(detail.status)}>{govAdminInquiryStatusLabel(detail.status)}</span>
        </div>
        <div className="claim-inbox__detail-meta">
          담당: {formatAssigneeLabel(detail.assignedToUserId, p.selectedRow?.assignedToDisplayName)}
        </div>
        {detail.content ? <div className="claim-inbox__detail-memo">{detail.content}</div> : null}

        <div className="claim-inbox__detail-section">
          <h3>대화</h3>
          {detail.messages.length === 0 ? (
            <div className="claim-inbox__empty claim-inbox__empty--small">메시지가 없습니다.</div>
          ) : (
            <ul className="claim-inbox__history-list">
              {detail.messages.map((msg) => (
                <li key={msg.id} className="claim-inbox__history-item">
                  <strong>
                    {govAdminInquirySenderLabel(msg.senderRole)}
                    {msg.senderUsername ? ` · ${msg.senderUsername}` : ''}
                  </strong>
                  <span>{formatGovInboxDateTime(msg.createdAt)}</span>
                  <p>{msg.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {detail.files.length > 0 ? (
          <div className="claim-inbox__detail-section">
            <h3>첨부 파일</h3>
            <div className="claim-inbox__file-list">
              {detail.files.map((file) => {
                const downloadUrl = (file as { downloadUrl?: string }).downloadUrl
                return (
                  <div key={file.id} className="claim-inbox__file-item">
                    <span className="claim-inbox__file-thumb claim-inbox__file-thumb--file">
                      {String(file.mimeType ?? '').includes('pdf') ? 'PDF' : 'FILE'}
                    </span>
                    <div className="claim-inbox__file-main">
                      <div className="claim-inbox__file-name">{file.fileName}</div>
                      <div className="claim-inbox__file-meta">{formatGovInboxFileSize(file.fileSize)}</div>
                    </div>
                    <div className="claim-inbox__file-actions">
                      {downloadUrl ? (
                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                          다운
                        </a>
                      ) : (
                        <span className="claim-inbox__file-meta">—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="claim-inbox__detail-section claim-inbox__status-editor">
          <h3>답변 작성</h3>
          <FieldWrapper label="답변 내용" className="admin-modal-field">
            <FormTextarea
              value={p.reply}
              onChange={(e) => p.setReply(e.target.value)}
              rows={4}
              placeholder="이용자에게 전달할 답변을 입력해 주세요."
              className="claim-inbox__status-memo"
            />
          </FieldWrapper>
          <FormButton htmlType="button" variant="primary" onClick={() => void p.onReply()} loading={p.actionBusy}>
            답변 등록
          </FormButton>
        </div>

        <div className="claim-inbox__detail-section claim-inbox__status-editor">
          <h3>담당자</h3>
          <div className="claim-inbox__status-editor-row">
            <FieldWrapper label="담당 직원" className="admin-modal-field">
              <FormSelect
                value={p.assigneeTarget}
                onChange={(e) => p.setAssigneeTarget(e.target.value)}
                options={p.assignOptions}
                aria-label="담당자"
              />
            </FieldWrapper>
            <FormButton htmlType="button" variant="secondary" onClick={() => void p.onAssigneeSave()} loading={p.actionBusy}>
              담당 저장
            </FormButton>
          </div>
        </div>

        <div className="claim-inbox__detail-section claim-inbox__status-editor">
          <h3>상태 변경</h3>
          <div className="claim-inbox__status-editor-row">
            <FieldWrapper label="상태" className="admin-modal-field">
              <FormSelect
                value={p.statusTarget}
                onChange={(e) => p.setStatusTarget(e.target.value)}
                options={GOV_ADMIN_INQUIRY_DETAIL_STATUS_OPTIONS}
                aria-label="문의 상태"
              />
            </FieldWrapper>
            <FormButton htmlType="button" variant="secondary" onClick={() => void p.onStatusSave()} loading={p.actionBusy}>
              상태 저장
            </FormButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`government-admin-page claim-inbox government-admin-inquiries-page government-admin-inquiries-page--${variant}`}
      data-testid="government-admin-inquiries-page"
    >
      <StatusMessage message={p.error} tone="error" />
      <StatusMessage message={p.notice} tone="success" />

      <section className="claim-inbox__hero">
        <div>
          <h1 className="claim-inbox__title">문의 관리</h1>
          <p className="claim-inbox__subtitle">프로그램 이용자가 남긴 문의를 확인하고 답변합니다.</p>
        </div>
        <FormButton htmlType="button" variant="secondary" className="gov-btn gov-btn--secondary" onClick={() => void p.loadRows()} loading={p.loading}>
          새로고침
        </FormButton>
      </section>

      <section className="claim-inbox__toolbar">
        <label className="claim-inbox__filter-label">
          상태
          <FormSelect
            value={p.statusFilter}
            onChange={(e) => p.setStatusFilter(e.target.value)}
            options={[...GOV_ADMIN_INQUIRY_STATUS_OPTIONS]}
            aria-label="문의 상태"
          />
        </label>
        <label className="claim-inbox__filter-label">
          담당자
          <FormSelect
            value={p.assigneeFilter}
            onChange={(e) => p.setAssigneeFilter(e.target.value)}
            options={p.filterOptions}
            aria-label="담당자 필터"
          />
        </label>
      </section>

      <div className={`claim-inbox__layout${isMobile ? ' claim-inbox__layout--mobile' : ''}`}>
        <section className="claim-inbox__list-panel">
          {p.loading ? <div className="claim-inbox__empty">목록을 불러오는 중…</div> : null}
          {!p.loading && p.rows.length === 0 ? <div className="claim-inbox__empty">문의가 없습니다.</div> : null}
          <ul className="claim-inbox__list">
            {p.rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={`claim-inbox__list-item${p.selectedId === row.id ? ' claim-inbox__list-item--active' : ''}`}
                  onClick={() => handleSelect(row.id)}
                >
                  <div className="claim-inbox__list-item-top">
                    <strong>{row.title || '문의'}</strong>
                    <span className={govAdminInquiryStatusClass(row.status)}>{govAdminInquiryStatusLabel(row.status)}</span>
                  </div>
                  <div className="claim-inbox__list-item-meta">
                    {row.ownerDisplayName || '이용자'} ·{' '}
                    {formatAssigneeLabel(row.assignedToUserId, row.assignedToDisplayName)} · 메시지 {row.messageCount} ·{' '}
                    {formatGovInboxDateTime(row.createdAt)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {!isMobile ? <section className="claim-inbox__detail-panel">{renderDetail()}</section> : null}
      </div>

      {isMobile && mobileDetailOpen ? (
        <div className="claim-inbox__mobile-modal" role="dialog" aria-modal="true">
          <div className="claim-inbox__mobile-modal-head">
            <strong>문의 상세</strong>
            <button type="button" onClick={() => setMobileDetailOpen(false)}>
              닫기
            </button>
          </div>
          <div className="claim-inbox__mobile-modal-body">{renderDetail()}</div>
        </div>
      ) : null}
    </div>
  )
}
