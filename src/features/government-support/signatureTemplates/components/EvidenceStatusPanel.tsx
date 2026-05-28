import { FormButton } from '../../../../components/form'
import { useAuth } from '../../../auth/AuthProvider'
import { buildGovSignaturePublicSignUrl } from '../../signatures/governmentSignatureHistoryClient'
import {
  downloadStaffEvidencePdfFile,
  downloadStaffSignedPdfFile,
  type SendSessionDetail,
} from '../governmentSignatureTemplateClient'
import {
  formatStaffSessionDate,
  formatStaffSessionDateParts,
  staffDocumentStatusLabel,
  staffSendSessionDisplayLabel,
} from '../../signatures/sendSessionStaffDisplay'
import { SendSessionStatusBadge } from '../../signatures/components/SendSessionStatusBadge'
import { ContractTableDateCell } from '../../signatures/components/GovernmentSignatureTableCells'

type Props = {
  detail: SendSessionDetail | null
  loading: boolean
  onRefresh: () => void
  layout?: 'desktop' | 'mobile'
}

export function EvidenceStatusPanel({ detail, loading, onRefresh, layout = 'desktop' }: Props) {
  const { token } = useAuth()
  const t = token?.trim() ?? ''
  const isMobile = layout === 'mobile'

  const sessionCompleted = detail != null && detail.status === 'completed'
  const consoleIsConfirmation = detail?.templateMode === 'confirmation_only'
  const signedCompleteDocDlLabel = consoleIsConfirmation
    ? '완료 확인서 PDF 다운로드'
    : '완료 전자서명 문서 PDF 다운로드'
  const signedCompleteDocPendingLabel = consoleIsConfirmation
    ? '완료 확인서 PDF 준비 중'
    : '완료 전자서명 문서 PDF 준비 중'
  const completedDocPdfLabel = consoleIsConfirmation ? '완료 확인서 PDF' : '완료 전자서명 문서 PDF'

  async function downloadSignedPdf(docId: string) {
    if (!detail || !t) {
      return
    }
    const r = await downloadStaffSignedPdfFile(t, detail.id, docId)
    if (!r.ok) {
      window.alert('다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  async function downloadEvidencePdf() {
    if (!detail || !t) {
      return
    }
    const r = await downloadStaffEvidencePdfFile(t, detail.id)
    if (!r.ok) {
      window.alert('다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  const copyLink = async (signToken: string) => {
    const url = buildGovSignaturePublicSignUrl(signToken)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('링크를 복사하세요', url)
    }
  }

  const openTab = (signToken: string) => {
    window.open(buildGovSignaturePublicSignUrl(signToken), '_blank', 'noopener,noreferrer')
  }

  const renderDocActions = () => {
    if (!detail) {
      return null
    }
    const docs = detail.documents ?? []
    return docs.map((d) => {
      const ev = d.evidence
      const canDl = d.status === 'completed' && Boolean(ev?.hasSignedPdfFile)
      return (
        <div key={d.id} className={isMobile ? 'contract-mobile-doc-card' : undefined}>
          {isMobile ? (
            <>
              <div className="contract-mobile-doc-card__title">{d.titleSnapshot}</div>
              <div className="contract-signature-console__hint">
                상태: {staffDocumentStatusLabel(d.status)}
              </div>
            </>
          ) : (
            <tr key={d.id}>
              <td>{d.titleSnapshot}</td>
              <td>
                <span
                  className="contract-signature-console__status-badge contract-status-badge contract-status-badge--doc"
                  data-doc-status={d.status}
                >
                  {staffDocumentStatusLabel(d.status)}
                </span>
              </td>
              <td>
                <ContractTableDateCell iso={d.completedAt} />
              </td>
              <td>
                {d.status === 'completed' && canDl ? (
                  <FormButton htmlType="button" variant="secondary" size="sm" onClick={() => void downloadSignedPdf(d.id)}>
                    다운로드
                  </FormButton>
                ) : d.status === 'completed' ? (
                  <span className="contract-signature-console__hint">준비 중</span>
                ) : (
                  <span className="contract-signature-console__hint">—</span>
                )}
              </td>
            </tr>
          )}
          {isMobile ? (
            <div className="contract-session-pdf-dl-stack" style={{ marginTop: 8 }}>
              <FormButton
                htmlType="button"
                variant="secondary"
                size="sm"
                fullWidth
                className="contract-mobile-btn-primary-wide contract-session-pdf-dl-btn"
                disabled={!canDl}
                onClick={() => void downloadSignedPdf(d.id)}
              >
                {signedCompleteDocDlLabel}
              </FormButton>
              <FormButton
                htmlType="button"
                variant="secondary"
                size="sm"
                fullWidth
                className="contract-mobile-btn-primary-wide contract-session-pdf-dl-btn"
                disabled={!sessionCompleted || !t}
                onClick={() => void downloadEvidencePdf()}
              >
                증빙 PDF 다운로드
              </FormButton>
            </div>
          ) : null}
          {isMobile && d.status === 'completed' && !canDl ? (
            <p className="contract-signature-console__hint" style={{ marginTop: 8 }}>
              {signedCompleteDocPendingLabel}
            </p>
          ) : null}
        </div>
      )
    })
  }

  if (isMobile) {
    return (
      <div>
        {!detail ? (
          <>
            <p className="contract-signature-console__empty-state-text">
              전자서명을 발송한 뒤 새로고침하면 진행 상태를 확인할 수 있습니다.
            </p>
            <FormButton
              htmlType="button"
              variant="secondary"
              size="sm"
              fullWidth
              disabled={loading}
              onClick={onRefresh}
              className="contract-mobile-btn-primary-wide"
            >
              {loading ? '불러오는 중…' : '상태 새로고침'}
            </FormButton>
          </>
        ) : (
          <>
            {(() => {
              const docs = detail.documents ?? []
              const done = docs.filter((d) => d.status === 'completed').length
              const total = Math.max(docs.length, 1)
              const sentParts = formatStaffSessionDateParts(detail.sentAt ?? detail.createdAt)
              const doneParts = formatStaffSessionDateParts(detail.completedAt)
              return (
                <div className="contract-mobile-summary">
                  <div className="contract-mobile-evidence-kv">
                    <div>
                      <dt>상태</dt>
                      <dd>
                        <SendSessionStatusBadge sessionStatus={detail.status} />
                      </dd>
                    </div>
                    <div>
                      <dt>진행</dt>
                      <dd>
                        {done}/{total} 완료
                      </dd>
                    </div>
                    <div>
                      <dt>발송일</dt>
                      <dd>{sentParts ? `${sentParts.date} ${sentParts.time}` : '—'}</dd>
                    </div>
                    <div>
                      <dt>완료일</dt>
                      <dd>{doneParts ? `${doneParts.date} ${doneParts.time}` : '—'}</dd>
                    </div>
                  </div>
                  <div className="contract-mobile-action-grid">
                    <FormButton
                      htmlType="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void copyLink(detail.signToken)}
                    >
                      링크 복사
                    </FormButton>
                    <FormButton htmlType="button" variant="secondary" size="sm" onClick={() => openTab(detail.signToken)}>
                      링크 열기
                    </FormButton>
                  </div>
                  {renderDocActions()}
                  <div className="contract-mobile-action-grid contract-mobile-action-grid--stack">
                    <FormButton htmlType="button" variant="secondary" size="sm" disabled={loading} onClick={onRefresh}>
                      {loading ? '불러오는 중…' : '상태 새로고침'}
                    </FormButton>
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="contract-signature-console__toolbar">
        <FormButton htmlType="button" variant="secondary" size="sm" disabled={loading || !detail} onClick={onRefresh}>
          {loading ? '불러오는 중…' : '상태 새로고침'}
        </FormButton>
      </div>
      {!detail ? (
        <p className="contract-signature-console__empty-state-text">
          전자서명을 발송한 뒤 새로고침하면 진행 상태를 확인할 수 있습니다.
        </p>
      ) : (
        <div className="contract-signature-console__body-text">
          <p className="contract-signature-console__hint">
            상태: <SendSessionStatusBadge sessionStatus={detail.status} /> ·{' '}
            {staffSendSessionDisplayLabel(detail.status)}
          </p>
          <p className="contract-signature-console__hint">
            발송일: {detail.sentAt ? formatStaffSessionDate(detail.sentAt) : '—'} · 완료일:{' '}
            {detail.completedAt ? formatStaffSessionDate(detail.completedAt) : '—'}
          </p>
          <div className="contract-signature-console__btn-row" style={{ marginTop: 8 }}>
            <FormButton htmlType="button" variant="secondary" size="sm" onClick={() => void copyLink(detail.signToken)}>
              링크 복사
            </FormButton>
            <FormButton htmlType="button" variant="secondary" size="sm" onClick={() => openTab(detail.signToken)}>
              링크 열기
            </FormButton>
          </div>
          {detail.confirmationItems != null && detail.confirmationItems.length > 0 ? (
            <>
              <h3 className="contract-signature-console__subsection-title">수신자 확인 항목</h3>
              <ul className="contract-signature-console__unordered-list">
                {detail.confirmationItems.map((c) => (
                  <li key={c.id}>
                    {c.label}
                    {c.required ? ' (필수)' : ''}:{' '}
                    {c.checked ? (
                      <>
                        확인 완료
                        {c.checkedAt ? ` — ${formatStaffSessionDate(c.checkedAt)}` : ''}
                      </>
                    ) : (
                      <span className="contract-signature-console__hint">미확인</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <h3 className="contract-signature-console__subsection-title">문서</h3>
          <div className="contract-signature-console__scroll-x">
            <table className="pdf-engine-table contract-signature-console__table--compact">
              <thead>
                <tr>
                  <th>문서명</th>
                  <th>상태</th>
                  <th>완료일</th>
                  <th>{completedDocPdfLabel}</th>
                </tr>
              </thead>
              <tbody>{renderDocActions()}</tbody>
            </table>
          </div>
          {sessionCompleted && t ? (
            <div style={{ marginTop: 12 }}>
              <FormButton htmlType="button" variant="secondary" size="sm" onClick={() => void downloadEvidencePdf()}>
                증빙 PDF 다운로드
              </FormButton>
            </div>
          ) : (
            <p className="contract-signature-console__hint" style={{ marginTop: 8 }}>
              수신자가 문서를 완료하면 증빙 PDF를 다운로드할 수 있습니다.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
