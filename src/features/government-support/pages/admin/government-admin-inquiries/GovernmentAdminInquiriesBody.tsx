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
    if (p.detailLoading) {
      return <div className="government-admin-inquiries-empty">상세를 불러오는 중…</div>
    }
    if (!p.detail) {
      return <div className="government-admin-inquiries-empty">목록에서 문의를 선택해 주세요.</div>
    }

    const detail = p.detail
    return (
      <article className="government-admin-inquiries-detail-card">
        <div className="government-admin-inquiries-detail__head">
          <div>
            <div className="government-admin-inquiries-detail__title">
              {p.selectedRow?.ownerDisplayName || detail.title || '문의'}
            </div>
            <div className="government-admin-inquiries-detail__meta">
              작성 {formatGovInboxDateTime(detail.createdAt)}
            </div>
          </div>
          <span className={govAdminInquiryStatusClass(detail.status)}>
            {govAdminInquiryStatusLabel(detail.status)}
          </span>
        </div>
        <div className="government-admin-inquiries-detail__meta">
          담당: {formatAssigneeLabel(detail.assignedToUserId, p.selectedRow?.assignedToDisplayName)}
        </div>
        {detail.content ? <div className="government-admin-inquiries-detail__body">{detail.content}</div> : null}

        <div className="government-admin-inquiries-detail__section">
          <h3>대화</h3>
          {detail.messages.length === 0 ? (
            <div className="government-admin-inquiries-empty">메시지가 없습니다.</div>
          ) : (
            <ul className="government-admin-inquiries-message-list">
              {detail.messages.map((msg) => (
                <li key={msg.id} className="government-admin-inquiries-message-item">
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
          <div className="government-admin-inquiries-detail__section">
            <h3>첨부 파일</h3>
            <ul className="government-admin-inquiries-message-list">
              {detail.files.map((file) => {
                const downloadUrl = (file as { downloadUrl?: string }).downloadUrl
                return (
                  <li key={file.id} className="government-admin-inquiries-message-item">
                    <strong>{file.fileName}</strong>
                    <span>{formatGovInboxFileSize(file.fileSize)}</span>
                    {downloadUrl ? (
                      <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="gov-link">
                        다운로드
                      </a>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        <div className="government-admin-inquiries-detail__section">
          <h3>답변 작성</h3>
          <FieldWrapper label="답변 내용">
            <FormTextarea
              value={p.reply}
              onChange={(e) => p.setReply(e.target.value)}
              rows={4}
              placeholder="이용자에게 전달할 답변을 입력해 주세요."
              className="gov-form-control"
            />
          </FieldWrapper>
          <div className="government-admin-inquiries-detail__actions-row">
            <span />
            <FormButton
              htmlType="button"
              variant="primary"
              className="gov-btn gov-btn--primary"
              onClick={() => void p.onReply()}
              loading={p.actionBusy}
            >
              답변 등록
            </FormButton>
          </div>
        </div>

        <div className="government-admin-inquiries-detail__section">
          <h3>담당자</h3>
          <div className="government-admin-inquiries-detail__actions-row">
            <FieldWrapper label="담당 직원">
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
              loading={p.actionBusy}
            >
              담당 저장
            </FormButton>
          </div>
        </div>

        <div className="government-admin-inquiries-detail__section">
          <h3>상태 변경</h3>
          <div className="government-admin-inquiries-detail__actions-row">
            <FieldWrapper label="상태">
              <FormSelect
                className="gov-form-control"
                value={p.statusTarget}
                onChange={(e) => p.setStatusTarget(e.target.value)}
                options={GOV_ADMIN_INQUIRY_DETAIL_STATUS_OPTIONS}
                aria-label="문의 상태"
              />
            </FieldWrapper>
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary"
              onClick={() => void p.onStatusSave()}
              loading={p.actionBusy}
            >
              상태 저장
            </FormButton>
          </div>
        </div>
      </article>
    )
  }

  return (
    <div
      className={`government-admin-page government-admin-inquiries-page government-admin-inquiries-page--${variant}`}
      data-testid="government-admin-inquiries-page"
    >
      <StatusMessage message={p.error} tone="error" />
      <StatusMessage message={p.notice} tone="success" />

      <section className="government-admin-inquiries-hero">
        <div>
          <h1 className="government-admin-inquiries-hero__title">문의 관리</h1>
          <p className="government-admin-inquiries-hero__subtitle">
            프로그램 이용자가 남긴 문의·요청을 확인하고 답변합니다.
          </p>
        </div>
        <FormButton
          htmlType="button"
          variant="secondary"
          className="gov-btn gov-btn--secondary"
          onClick={() => void p.loadRows()}
          loading={p.loading}
        >
          새로고침
        </FormButton>
      </section>

      <section className="government-admin-inquiries-toolbar">
        <FieldWrapper label="상태">
          <FormSelect
            className="gov-form-control"
            value={p.statusFilter}
            onChange={(e) => p.setStatusFilter(e.target.value)}
            options={[...GOV_ADMIN_INQUIRY_STATUS_OPTIONS]}
            aria-label="문의 상태"
          />
        </FieldWrapper>
        <FieldWrapper label="담당자">
          <FormSelect
            className="gov-form-control"
            value={p.assigneeFilter}
            onChange={(e) => p.setAssigneeFilter(e.target.value)}
            options={p.filterOptions}
            aria-label="담당자 필터"
          />
        </FieldWrapper>
      </section>

      <div className="government-admin-inquiries-layout">
        <section className="government-admin-inquiries-list">
          {p.loading ? <div className="government-admin-inquiries-empty">목록을 불러오는 중…</div> : null}
          {!p.loading && p.rows.length === 0 ? (
            <div className="government-admin-inquiries-empty">문의가 없습니다.</div>
          ) : null}
          <ul className="government-admin-inquiries-card-list">
            {p.rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={`government-admin-inquiries-card${
                    p.selectedId === row.id ? ' government-admin-inquiries-card--selected' : ''
                  }`}
                  onClick={() => handleSelect(row.id)}
                >
                  <div className="government-admin-inquiries-card__head">
                    <strong>{row.title || '문의'}</strong>
                    <span className={govAdminInquiryStatusClass(row.status)}>
                      {govAdminInquiryStatusLabel(row.status)}
                    </span>
                  </div>
                  <div className="government-admin-inquiries-card__meta">
                    {row.ownerDisplayName || '이용자'} ·{' '}
                    {formatAssigneeLabel(row.assignedToUserId, row.assignedToDisplayName)} · 메시지{' '}
                    {row.messageCount} · {formatGovInboxDateTime(row.createdAt)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {!isMobile ? <section className="government-admin-inquiries-detail">{renderDetail()}</section> : null}
      </div>

      {isMobile && mobileDetailOpen ? (
        <div className="government-admin-inquiries-mobile-modal" role="dialog" aria-modal="true">
          <div className="government-admin-inquiries-mobile-modal__head">
            <strong>문의 상세</strong>
            <button type="button" className="gov-btn gov-btn--secondary gov-btn--sm" onClick={() => setMobileDetailOpen(false)}>
              닫기
            </button>
          </div>
          <div className="government-admin-inquiries-mobile-modal__body">{renderDetail()}</div>
        </div>
      ) : null}
    </div>
  )
}
