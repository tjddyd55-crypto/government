import { useState } from 'react'
import { FormButton } from '../../../../components/form'
import type { SendSessionDetail, SendSessionDocumentDetail } from '../../signatureTemplates/governmentSignatureTemplateClient'
import {
  downloadStaffEvidencePdfFile,
  downloadStaffSignedPdfFile,
} from '../../signatureTemplates/governmentSignatureTemplateClient'
import { SendSessionStatusBadge } from './SendSessionStatusBadge'
import { formatStaffSessionDate, staffDocumentStatusLabel } from '../sendSessionStaffDisplay'
import { formatIdentityStatusLabel, mapGovernmentSignatureApiError, mapGovernmentSignatureErrorMessage } from '../governmentSignatureUserDisplay'
import { ContractTableDateCell } from './GovernmentSignatureTableCells'
import { GovernmentSignatureAlimtalkInfoSection } from './GovernmentSignatureAlimtalkInfoSection'
import { AlimtalkNotificationStatusBadge } from './AlimtalkNotificationStatusBadge'
import { formatStaffSessionDateParts } from '../sendSessionStaffDisplay'

type Props = {
  open: boolean
  detail: SendSessionDetail | null
  loading: boolean
  error: string | null
  token: string
  listHints?: { hasSignedNotCompleted?: boolean } | null
  layout?: 'desktop' | 'mobile'
  onClose: () => void
  onRefresh: () => void
  onCancelSession: () => void
  cancelBusy: boolean
  onCopyLink: (signToken: string) => void
  onOpenLink: (signToken: string) => void
  onResendNotification?: () => void
  resendBusy?: boolean
  resendFeedback?: { tone: 'success' | 'warning' | 'error'; text: string } | null
}

export function SendSessionDetailPanel({
  open,
  detail,
  loading,
  error,
  token,
  listHints,
  layout = 'desktop',
  onClose,
  onRefresh,
  onCancelSession,
  cancelBusy,
  onCopyLink,
  onOpenLink,
  onResendNotification,
  resendBusy,
  resendFeedback,
}: Props) {
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null)
  const isMobile = layout === 'mobile'

  if (!open) {
    return null
  }

  const signToken = detail?.signToken ?? ''
  const sessionSt = detail?.status ?? ''
  const hasCompletedDoc = detail?.documents?.some((d) => d.status === 'completed') ?? false
  const canCancel =
    detail != null && !['completed', 'cancelled', 'expired'].includes(String(sessionSt)) && !hasCompletedDoc
  const derivedSignedPending = detail?.documents?.some((d) => d.status === 'signed') ?? false
  const signedHint = listHints?.hasSignedNotCompleted ?? derivedSignedPending
  const sessionCompleted = detail != null && detail.status === 'completed'
  const isConfirmationSession = detail?.templateMode === 'confirmation_only'
  const canDownloadEvidencePdf = sessionCompleted
  const evidencePdfDownloadLabel = '증빙 PDF'
  const preCompleteHint = '수신자가 문서를 완료하면 다운로드할 수 있습니다.'
  const docs = detail?.documents ?? []

  const runSignedDownload = (documentInstanceId: string) => {
    if (!detail) {
      return
    }
    setDownloadMessage(null)
    void downloadStaffSignedPdfFile(token, detail.id, documentInstanceId).then((r) => {
      if (!r.ok) {
        setDownloadMessage(mapGovernmentSignatureApiError(new Error(r.message), r.message))
      }
    })
  }

  const runEvidenceDownload = () => {
    if (!detail) {
      return
    }
    setDownloadMessage(null)
    void downloadStaffEvidencePdfFile(token, detail.id).then((r) => {
      if (!r.ok) {
        setDownloadMessage(mapGovernmentSignatureApiError(new Error(r.message), r.message))
      }
    })
  }

  const signedPdfDownloadLabel = isConfirmationSession ? '완료 확인서 다운로드' : '완료 전자서명 문서 다운로드'

  const signedPdfCell = (d: SendSessionDocumentDetail) => {
    const ev = d.evidence
    const canDlSigned = d.status === 'completed' && Boolean(ev?.hasSignedPdfFile)
    return (
      <div className="contract-session-doc-dl-cell">
        <FormButton
          htmlType="button"
          variant="secondary"
          size="sm"
          className="contract-session-pdf-dl-btn contract-session-pdf-dl-btn--cell"
          disabled={!canDlSigned}
          onClick={() => runSignedDownload(d.id)}
        >
          {signedPdfDownloadLabel}
        </FormButton>
        {d.status === 'completed' && !ev?.hasSignedPdfFile ? (
          <span className="contract-session-doc-dl-hint">준비 중</span>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className="contract-signature-console__detail-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="발송 세션 상세"
    >
      <div className="contract-signature-console__detail-dialog gov-signature-history-detail-dialog">
        <div className="gov-signature-history-detail-dialog__header">
          <h2 className="contract-signature-console__section-title">발송 세션 상세</h2>
        </div>
        <div className="gov-signature-history-detail-dialog__body">
        {downloadMessage ? (
          <div className="contract-signature-console__alert--danger" role="alert">
            {downloadMessage}
          </div>
        ) : null}
        {error ? (
          <div className="contract-signature-console__alert--danger" role="alert">
            {mapGovernmentSignatureErrorMessage(error, '상세를 불러오지 못했습니다.')}
          </div>
        ) : null}
        {loading && !detail ? <p className="contract-signature-console__hint">불러오는 중…</p> : null}
        {detail ? (
          <>
            <p className="contract-signature-console__hint">
              사업장: {detail.profileDisplayName ?? '—'}
            </p>
            <p className="contract-signature-console__hint">수신자 연락처: {detail.maskedPhone ?? '—'}</p>
            <p className="contract-signature-console__hint">
              전자서명 상태:{' '}
              <SendSessionStatusBadge sessionStatus={detail.status} hasSignedNotCompleted={signedHint} />
            </p>
            <p className="contract-signature-console__hint">
              알림톡 상태:{' '}
              <AlimtalkNotificationStatusBadge
                notificationStatus={detail.notificationStatus ?? 'not_requested'}
                notificationDryRun={detail.notificationDryRun}
                notificationProviderCode={detail.notificationProviderCode}
              />
              {detail.canResend ? (
                <span className="gov-signature-alimtalk-info__resend-badge">재발송 가능</span>
              ) : null}
            </p>
            <p className="contract-signature-console__hint">
              본인인증: {formatIdentityStatusLabel(detail.identityStatus)}
              {detail.identityVerifiedAt ? ` · ${formatStaffSessionDate(detail.identityVerifiedAt)}` : ''}
            </p>
            <p className="contract-signature-console__hint">
              열람: {detail.openedAt ? formatStaffSessionDate(detail.openedAt) : '—'}
            </p>
            {detail.expiredAt ? (
              <p className="contract-signature-console__hint">
                서명기한: {formatStaffSessionDateParts(detail.expiredAt)?.date.replace(/\./g, '-') ?? '—'}
              </p>
            ) : null}

            {detail.notificationStatus && detail.notificationStatus !== 'not_requested' ? (
              <>
                {resendFeedback ? (
                  <div
                    className={
                      resendFeedback.tone === 'error'
                        ? 'contract-signature-console__alert--danger'
                        : 'contract-signature-console__notice'
                    }
                    role="status"
                    style={{ marginBottom: 8 }}
                  >
                    {resendFeedback.text}
                  </div>
                ) : null}
                <GovernmentSignatureAlimtalkInfoSection
                  summary={{
                    notificationStatus: detail.notificationStatus,
                    notificationSentAt: detail.notificationSentAt,
                    notificationRecipientPhoneMasked: detail.notificationRecipientPhoneMasked,
                    notificationRetryCount: detail.notificationRetryCount,
                    notificationErrorCategory: detail.notificationErrorCategory,
                    notificationProviderCode: detail.notificationProviderCode,
                    notificationDryRun: detail.notificationDryRun,
                    canResend: detail.canResend,
                  }}
                  maskedPhone={detail.maskedPhone}
                  onResend={onResendNotification}
                  resendBusy={resendBusy}
                />
              </>
            ) : null}

            <h3 className="contract-signature-console__section-title gov-signature-history-detail-dialog__docs-title">
              완료·증빙 PDF 다운로드
            </h3>
            <p className="contract-signature-console__hint gov-signature-history-detail-dialog__docs-lead">
              {isConfirmationSession
                ? '완료 확인서 PDF는 수신자가 확인·서명한 최종 문서입니다. 증빙 PDF는 본인확인·확인 항목·첨부·서명·해시 등 감사 기록을 담은 별도 문서로, 혼동되지 않게 구분되어 있습니다.'
                : '완료 전자서명 문서 PDF는 수신자 입력값과 전자서명이 반영된 최종 문서입니다. 증빙 PDF는 본인확인, 문서·첨부 확인, 전자서명 및 제출 동의 등 감사 기록을 정리한 별도 문서입니다.'}
            </p>

            {isMobile ? (
              <div className="contract-session-detail-mobile-docs">
                {docs.map((d) => {
                  const ev = d.evidence
                  const docLabel = staffDocumentStatusLabel(d.status)
                  const canDlSigned = d.status === 'completed' && Boolean(ev?.hasSignedPdfFile)
                  return (
                    <div key={d.id} className="contract-session-detail-doc-card">
                      <div className="contract-session-detail-doc-card__title" title={d.titleSnapshot}>
                        {d.titleSnapshot}
                      </div>
                      <div className="contract-signature-console__hint">
                        상태:{' '}
                        <span
                          className="contract-signature-console__status-badge contract-status-badge contract-status-badge--doc"
                          data-doc-status={d.status}
                        >
                          {docLabel}
                        </span>
                      </div>
                      <div className="contract-signature-console__hint">
                        완료일: {d.completedAt ? formatStaffSessionDate(d.completedAt) : '—'}
                      </div>
                      <div className="contract-session-pdf-dl-stack" style={{ marginTop: 10 }}>
                        <FormButton
                          htmlType="button"
                          variant="secondary"
                          size="sm"
                          className="contract-session-pdf-dl-btn contract-session-pdf-dl-btn--wide"
                          disabled={!canDlSigned}
                          onClick={() => runSignedDownload(d.id)}
                        >
                          {signedPdfDownloadLabel}
                        </FormButton>
                        <FormButton
                          htmlType="button"
                          variant="secondary"
                          size="sm"
                          className="contract-session-pdf-dl-btn contract-session-pdf-dl-btn--wide"
                          disabled={!canDownloadEvidencePdf}
                          onClick={runEvidenceDownload}
                        >
                          {evidencePdfDownloadLabel} 다운로드
                        </FormButton>
                      </div>
                      {d.status === 'completed' && !ev?.hasSignedPdfFile ? (
                        <p className="contract-signature-console__hint" style={{ margin: '8px 0 0' }}>
                          {isConfirmationSession ? '완료 확인서 PDF 준비 중입니다.' : '완료 전자서명 문서 PDF 준비 중입니다.'}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="contract-signature-console__session-doc-table-wrap">
                <table className="contract-session-doc-table">
                  <colgroup>
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '22%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="contract-table-cell-left">문서명</th>
                      <th className="contract-table-cell-center">상태</th>
                      <th className="contract-table-cell-center">완료일</th>
                      <th className="contract-table-cell-center">
                        {isConfirmationSession ? '완료 확인서 PDF' : '완료 전자서명 문서 PDF'}
                      </th>
                      <th className="contract-table-cell-center">{evidencePdfDownloadLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d, idx) => {
                      const docLabel = staffDocumentStatusLabel(d.status)
                      return (
                        <tr key={d.id}>
                          <td className="contract-table-cell-left">
                            <div className="contract-table-document" title={d.titleSnapshot}>
                              {d.titleSnapshot}
                            </div>
                          </td>
                          <td className="contract-table-cell-center">
                            <span
                              className="contract-signature-console__status-badge contract-status-badge contract-status-badge--doc"
                              data-doc-status={d.status}
                            >
                              {docLabel}
                            </span>
                          </td>
                          <td className="contract-table-cell-center">
                            <ContractTableDateCell iso={d.completedAt} />
                          </td>
                          <td className="contract-table-cell-center">{signedPdfCell(d)}</td>
                          {idx === 0 ? (
                            <td className="contract-table-cell-center" rowSpan={Math.max(docs.length, 1)}>
                              <div className="contract-session-doc-dl-cell contract-session-detail-evidence-cell">
                                <FormButton
                                  htmlType="button"
                                  variant="secondary"
                                  size="sm"
                                  className="contract-session-pdf-dl-btn contract-session-pdf-dl-btn--cell"
                                  disabled={!canDownloadEvidencePdf}
                                  onClick={runEvidenceDownload}
                                >
                                  {evidencePdfDownloadLabel} 다운로드
                                </FormButton>
                                {!sessionCompleted ? (
                                  <span className="contract-session-doc-dl-hint">{preCompleteHint}</span>
                                ) : null}
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
        </div>

        <div className="gov-signature-history-detail-dialog__footer">
        <div className="session-modal-actions">
          <div className="session-modal-actions__left">
            <FormButton htmlType="button" variant="secondary" size="sm" disabled={!signToken} onClick={() => onCopyLink(signToken)}>
              링크 복사
            </FormButton>
            <FormButton htmlType="button" variant="secondary" size="sm" disabled={!signToken} onClick={() => onOpenLink(signToken)}>
              링크 열기
            </FormButton>
            <FormButton htmlType="button" variant="primary" size="sm" disabled={loading || !detail} onClick={onRefresh}>
              상태 새로고침
            </FormButton>
          </div>
          <div className="session-modal-actions__right">
            <FormButton
              htmlType="button"
              variant="secondary"
              size="sm"
              disabled={!canCancel || cancelBusy}
              onClick={onCancelSession}
            >
              발송취소
            </FormButton>
            <FormButton htmlType="button" variant="secondary" size="sm" onClick={onClose}>
              닫기
            </FormButton>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
