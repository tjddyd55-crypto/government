import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusMessage } from '../../../../components/feedback'
import { useAuth } from '../../../auth/AuthProvider'
import {
  GOVERNMENT_ROUTE_PATHS,
  governmentAppInquiryDetailPath,
} from '../../constants/governmentRouteKeys'
import { fetchGovCustomerInquiries, type GovCustomerInquiryListItem } from '../api/governmentCustomerAppApi'
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

export default function GovernmentCustomerAppInquiriesPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [rows, setRows] = useState<GovCustomerInquiryListItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token?.trim()) {
      navigate(GOVERNMENT_ROUTE_PATHS.login, { replace: true })
      return
    }
    let mounted = true
    void (async () => {
      try {
        const data = await fetchGovCustomerInquiries(token)
        if (mounted) setRows(data)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : '문의 내역을 불러오지 못했습니다.')
      }
    })()
    return () => {
      mounted = false
    }
  }, [navigate, token])

  return (
    <div className="government-customer-app-page customer-app-claim-page">
      <StatusMessage message={error} tone="error" />
      {rows.length === 0 ? <div className="customer-app-claim-empty">문의 내역이 없습니다.</div> : null}
      {rows.length > 0 ? (
        <ul className="customer-app-claim-request-list">
          {rows.map((row) => {
            const meta = inquiryStatusMeta(row.status)
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className="customer-app-claim-request-card"
                  onClick={() => navigate(governmentAppInquiryDetailPath(row.id))}
                >
                  <div className="customer-app-claim-request-card__top">
                    <div>
                      <div className="customer-app-claim-request-card__title">
                        #{row.id} {row.title || '문의'}
                      </div>
                      <div className="customer-app-claim-request-card__meta">
                        메시지 {row.messageCount}개 · {formatDateTime(row.createdAt)}
                      </div>
                    </div>
                    <span className={meta.className}>{meta.label}</span>
                  </div>
                  {row.content ? <div className="customer-app-claim-request-card__memo">{row.content}</div> : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
