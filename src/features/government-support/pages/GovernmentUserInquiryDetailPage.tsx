import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LoadingState, StatusMessage } from '../../../components/feedback'
import { FormButton, FormTextarea } from '../../../components/form'
import { governmentPageTitle } from '../../../config/governmentAppMeta'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { useAuth } from '../../auth/AuthProvider'
import {
  fetchGovCustomerInquiryDetail,
  postGovCustomerInquiryMessage,
  type GovCustomerInquiryDetail,
} from '../customer-app/api/governmentCustomerAppApi'
import {
  governmentUserInquiryStatusMeta,
  parseGovernmentUserInquiryTypeFromTitle,
} from '../constants/governmentUserInquiry.config'
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

function senderLabel(role: string): string {
  if (role === 'admin' || role === 'staff') return '담당자'
  return '나'
}

export default function GovernmentUserInquiryDetailPage() {
  const { inquiryId = '' } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const t = token?.trim() ?? ''

  const [detail, setDetail] = useState<GovCustomerInquiryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState('')
  const [busy, setBusy] = useState(false)

  useDocumentTitle(
    detail
      ? governmentPageTitle(parseGovernmentUserInquiryTypeFromTitle(detail.title).displayTitle)
      : governmentPageTitle('문의 상세'),
  )

  useEffect(() => {
    if (!t || !inquiryId) return
    let mounted = true
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const row = await fetchGovCustomerInquiryDetail(t, inquiryId)
        if (mounted) setDetail(row)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : '문의를 불러오지 못했습니다.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [t, inquiryId])

  const handleFollowUp = async () => {
    if (!t || !inquiryId || !followUp.trim()) return
    setBusy(true)
    setError(null)
    try {
      await postGovCustomerInquiryMessage(t, inquiryId, followUp.trim())
      setFollowUp('')
      setDetail(await fetchGovCustomerInquiryDetail(t, inquiryId))
    } catch (e) {
      setError(e instanceof Error ? e.message : '메시지 전송에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const parsed = detail ? parseGovernmentUserInquiryTypeFromTitle(detail.title) : null
  const statusMeta = detail ? governmentUserInquiryStatusMeta(detail.status) : null

  return (
    <main className="page page--with-back government-user-inquiries-page government-user-inquiry-detail-page gov-user-page">
      <section className="government-user-inquiries-hero">
        <div>
          <Link to={GOVERNMENT_ROUTE_PATHS.inquiries} className="gov-link">
            ← 문의/요청 목록
          </Link>
          {parsed ? (
            <>
              <h1 className="government-user-inquiries-hero__title">{parsed.displayTitle}</h1>
              <p className="government-user-inquiries-hero__subtitle">
                {parsed.typeLabel} · {formatDateTime(detail?.createdAt ?? null)}
              </p>
            </>
          ) : (
            <h1 className="government-user-inquiries-hero__title">문의 상세</h1>
          )}
        </div>
        {statusMeta ? <span className={statusMeta.className}>{statusMeta.label}</span> : null}
      </section>

      {error ? <StatusMessage message={error} tone="error" className="m-0" /> : null}
      {loading ? <LoadingState message="불러오는 중…" /> : null}

      {!loading && detail ? (
        <>
          <section className="government-user-inquiry-detail-card">
            <h2 className="government-user-inquiry-detail-card__title">문의 내용</h2>
            <div className="government-user-inquiry-detail-card__body">{detail.content || '—'}</div>
          </section>

          <section className="government-user-inquiry-detail-card">
            <h2 className="government-user-inquiry-detail-card__title">답변 · 대화</h2>
            {detail.messages.length === 0 ? (
              <p className="gov-muted-text">아직 답변이 없습니다. 담당자 확인 후 안내드립니다.</p>
            ) : (
              <ul className="government-user-inquiry-reply-list">
                {detail.messages.map((msg) => {
                  const isAdmin = msg.senderRole === 'admin' || msg.senderRole === 'staff'
                  return (
                    <li
                      key={msg.id}
                      className={`government-user-inquiry-reply-item${isAdmin ? ' government-user-inquiry-reply-item--admin' : ''}`}
                    >
                      <strong>{senderLabel(msg.senderRole)}</strong>
                      <span>{formatDateTime(msg.createdAt)}</span>
                      <p>{msg.message}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {detail.status !== 'closed' ? (
            <section className="government-user-inquiries-compose">
              <h2 className="government-user-inquiries-compose__title">추가 메시지</h2>
              <FormTextarea
                className="gov-form-control"
                rows={4}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="추가로 전달할 내용이 있으면 입력해 주세요."
              />
              <div className="government-user-inquiries-compose__actions">
                <FormButton
                  htmlType="button"
                  variant="primary"
                  className="gov-btn gov-btn--primary"
                  disabled={busy || !followUp.trim()}
                  loading={busy}
                  onClick={() => void handleFollowUp()}
                >
                  전송
                </FormButton>
                <FormButton
                  htmlType="button"
                  variant="secondary"
                  className="gov-btn gov-btn--secondary"
                  onClick={() => navigate(GOVERNMENT_ROUTE_PATHS.inquiries)}
                >
                  목록
                </FormButton>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
