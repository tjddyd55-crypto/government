import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StatusMessage } from '../../../../components/feedback'
import { FormButton, FormTextarea } from '../../../../components/form'
import { useAuth } from '../../../auth/AuthProvider'
import {
  fetchGovCustomerInquiryDetail,
  postGovCustomerInquiryMessage,
  type GovCustomerInquiryDetail,
} from '../api/governmentCustomerAppApi'
import '../../../customer-app/customer-app-claims.css'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

function inquiryStatusMeta(status: string): { label: string; className: string } {
  switch (status) {
    case 'closed':
      return { label: '완료', className: 'customer-app-claim-status customer-app-claim-status--done' }
    case 'replied':
      return { label: '답변됨', className: 'customer-app-claim-status customer-app-claim-status--processing' }
    default:
      return { label: '대기', className: 'customer-app-claim-status customer-app-claim-status--requested' }
  }
}

function senderLabel(role: string): string {
  if (role === 'government_staff' || role === 'government_agency_admin') return '담당자'
  return '나'
}

export default function GovernmentCustomerAppInquiryDetailPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [detail, setDetail] = useState<GovCustomerInquiryDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!token?.trim() || !inquiryId?.trim()) return
    setLoading(true)
    try {
      const data = await fetchGovCustomerInquiryDetail(token, inquiryId)
      setDetail(data)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '문의 상세를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [inquiryId, token])

  useEffect(() => {
    if (!token?.trim()) {
      navigate('/government/login', { replace: true })
      return
    }
    void loadDetail()
    const timer = window.setInterval(() => void loadDetail(), 10000)
    return () => window.clearInterval(timer)
  }, [loadDetail, navigate, token])

  const handleReply = async () => {
    if (!token?.trim() || !inquiryId?.trim() || !reply.trim()) return
    setReplyBusy(true)
    try {
      await postGovCustomerInquiryMessage(token, inquiryId, reply.trim())
      setReply('')
      await loadDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : '메시지 전송에 실패했습니다.')
    } finally {
      setReplyBusy(false)
    }
  }

  const statusMeta = detail ? inquiryStatusMeta(detail.status) : null

  return (
    <div className="customer-app-claim-page">
      <StatusMessage message={error} tone="error" />
      {!detail && loading ? <div className="customer-app-claim-empty">불러오는 중…</div> : null}
      {detail ? (
        <>
          <section className="customer-app-claim-card">
            <div className="customer-app-claim-detail-header">
              <h2 className="customer-app-claim-section-title">#{detail.id} {detail.title || '문의'}</h2>
              {statusMeta ? <span className={statusMeta.className}>{statusMeta.label}</span> : null}
            </div>
            <div className="customer-app-claim-detail-meta">
              <span>작성 {formatDateTime(detail.createdAt)}</span>
              {detail.lastRepliedAt ? <span>최근 답변 {formatDateTime(detail.lastRepliedAt)}</span> : null}
            </div>
            {detail.content ? <div className="customer-app-claim-detail-memo">{detail.content}</div> : null}
            <div className="customer-app-claim-refresh-wrap">
              <FormButton htmlType="button" variant="secondary" onClick={() => void loadDetail()} loading={loading}>
                새로고침
              </FormButton>
            </div>
          </section>

          <section className="customer-app-claim-card">
            <h2 className="customer-app-claim-section-title">대화</h2>
            {detail.messages.length === 0 ? (
              <div className="customer-app-claim-empty customer-app-claim-empty--in-card">메시지가 없습니다.</div>
            ) : (
              <ul className="customer-app-claim-timeline">
                {detail.messages.map((msg) => (
                  <li key={msg.id} className="customer-app-claim-timeline__item">
                    <div className="customer-app-claim-timeline__main">
                      {senderLabel(msg.senderRole)}
                      {msg.senderUsername ? ` · ${msg.senderUsername}` : ''}
                    </div>
                    <div className="customer-app-claim-timeline__meta">{formatDateTime(msg.createdAt)}</div>
                    <div className="customer-app-claim-timeline__memo">{msg.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="customer-app-claim-card">
            <h2 className="customer-app-claim-section-title">추가 메시지</h2>
            <FormTextarea
              className="customer-app-claim-textarea"
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="추가로 전달할 내용을 입력해 주세요."
            />
            <div className="customer-app-claim-actions" style={{ marginTop: 12 }}>
              <FormButton htmlType="button" variant="primary" onClick={() => void handleReply()} loading={replyBusy}>
                메시지 보내기
              </FormButton>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
