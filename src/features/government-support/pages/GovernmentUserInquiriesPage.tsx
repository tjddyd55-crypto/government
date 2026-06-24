import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, LoadingState, StatusMessage } from '../../../components/feedback'
import { FieldWrapper, FormButton, FormInput, FormSelect, FormTextarea } from '../../../components/form'
import { governmentPageTitle } from '../../../config/governmentAppMeta'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { useAuth } from '../../auth/AuthProvider'
import {
  createGovCustomerInquiry,
  fetchGovCustomerInquiries,
  type GovCustomerInquiryListItem,
} from '../customer-app/api/governmentCustomerAppApi'
import {
  GOVERNMENT_USER_INQUIRY_TYPES,
  buildGovernmentUserInquiryTitle,
  governmentUserInquiryStatusMeta,
  parseGovernmentUserInquiryTypeFromTitle,
} from '../constants/governmentUserInquiry.config'
import { GOVERNMENT_ROUTE_PATHS, governmentUserInquiryDetailPath } from '../constants/governmentRouteKeys'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function GovernmentUserInquiriesPage() {
  useDocumentTitle(governmentPageTitle('문의/요청'))
  const navigate = useNavigate()
  const { token } = useAuth()
  const t = token?.trim() ?? ''

  const [rows, setRows] = useState<GovCustomerInquiryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [inquiryType, setInquiryType] = useState<string>('usage')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!t) return
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchGovCustomerInquiries(t))
    } catch (e) {
      setError(e instanceof Error ? e.message : '문의 내역을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!t) return
    if (!content.trim()) {
      setError('내용을 입력해 주세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      await createGovCustomerInquiry(t, {
        title: buildGovernmentUserInquiryTitle(inquiryType, title),
        content: content.trim(),
      })
      setTitle('')
      setContent('')
      setNotice('문의/요청이 등록되었습니다. 담당자 확인 후 답변드립니다.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page page--with-back government-user-inquiries-page gov-user-page">
      <section className="government-user-inquiries-hero">
        <div>
          <h1 className="government-user-inquiries-hero__title">문의/요청</h1>
          <p className="government-user-inquiries-hero__subtitle">
            프로그램 불편사항·기능 요청·사용 문의를 남기면 담당자가 확인합니다.
          </p>
        </div>
        <FormButton
          htmlType="button"
          variant="secondary"
          className="gov-btn gov-btn--secondary gov-btn--sm"
          disabled={!t || loading}
          onClick={() => void load()}
        >
          새로고침
        </FormButton>
      </section>

      {error ? <StatusMessage message={error} tone="error" className="m-0" /> : null}
      {notice ? <StatusMessage message={notice} tone="success" className="m-0" /> : null}

      <section className="government-user-inquiries-compose">
        <h2 className="government-user-inquiries-compose__title">문의/요청 작성</h2>
        <p className="government-user-inquiries-compose__desc">
          불편사항, 개선 요청, 오류 신고 등을 남겨 주세요.
        </p>
        <form className="government-user-inquiries-compose__form" onSubmit={(e) => void handleSubmit(e)}>
          <FieldWrapper label="유형">
            <FormSelect
              className="gov-form-control"
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value)}
              options={GOVERNMENT_USER_INQUIRY_TYPES.map((item) => ({ value: item.value, label: item.label }))}
            />
          </FieldWrapper>
          <FieldWrapper label="제목 (선택)">
            <FormInput
              className="gov-form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="간단한 제목"
              maxLength={200}
            />
          </FieldWrapper>
          <FieldWrapper label="내용">
            <FormTextarea
              className="gov-form-control"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="문의·요청 내용을 입력해 주세요."
              required
            />
          </FieldWrapper>
          <div className="government-user-inquiries-compose__actions">
            <FormButton
              htmlType="submit"
              variant="primary"
              className="gov-btn gov-btn--primary"
              disabled={submitting || !t}
              loading={submitting}
            >
              등록
            </FormButton>
          </div>
        </form>
      </section>

      <section className="government-user-inquiries-list-card">
        <div className="government-user-inquiries-list-card__head">
          <h2 className="government-user-inquiries-list-card__title">내 문의/요청</h2>
        </div>
        {loading ? <LoadingState message="불러오는 중…" /> : null}
        {!loading && rows.length === 0 ? (
          <EmptyState message="등록한 문의/요청이 없습니다." className="government-user-inquiries-empty" />
        ) : null}
        {!loading && rows.length > 0 ? (
          <ul className="government-user-inquiries-card-list" data-testid="government-user-inquiry-list">
            {rows.map((row) => {
              const parsed = parseGovernmentUserInquiryTypeFromTitle(row.title)
              const meta = governmentUserInquiryStatusMeta(row.status)
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className="government-user-inquiry-card"
                    onClick={() => navigate(governmentUserInquiryDetailPath(row.id))}
                  >
                    <span className="government-user-inquiry-card__type">{parsed.typeLabel}</span>
                    <div className="government-user-inquiry-card__head">
                      <div className="government-user-inquiry-card__title">{parsed.displayTitle}</div>
                      <span className={meta.className}>{meta.label}</span>
                    </div>
                    <div className="government-user-inquiry-card__meta">
                      메시지 {row.messageCount}개 · {formatDateTime(row.createdAt)}
                    </div>
                    {row.content ? <div className="government-user-inquiry-card__memo">{row.content}</div> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </section>

      <p className="gov-muted-text">
        고객앱에서도 문의를 확인할 수 있습니다.{' '}
        <Link to={GOVERNMENT_ROUTE_PATHS.appInquiries} className="gov-link">
          고객앱 문의
        </Link>
      </p>
    </main>
  )
}
