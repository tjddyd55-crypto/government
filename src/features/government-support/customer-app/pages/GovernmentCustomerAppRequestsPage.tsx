import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusMessage } from '../../../../components/feedback'
import { useAuth } from '../../../auth/AuthProvider'
import {
  GOVERNMENT_ROUTE_PATHS,
  governmentAppRequestDetailPath,
} from '../../constants/governmentRouteKeys'
import { fetchGovCustomerDocumentRequests, type GovCustomerDocumentRequestListItem } from '../api/governmentCustomerAppApi'
function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

function requestStatusMeta(status: string): { label: string; className: string } {
  switch (status) {
    case 'completed':
      return { label: '제출 완료', className: 'customer-app-claim-status customer-app-claim-status--done' }
    case 'partial':
      return { label: '일부 제출', className: 'customer-app-claim-status customer-app-claim-status--processing' }
    default:
      return { label: '요청됨', className: 'customer-app-claim-status customer-app-claim-status--requested' }
  }
}

export default function GovernmentCustomerAppRequestsPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [rows, setRows] = useState<GovCustomerDocumentRequestListItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token?.trim()) {
      navigate(GOVERNMENT_ROUTE_PATHS.login, { replace: true })
      return
    }
    let mounted = true
    void (async () => {
      try {
        const data = await fetchGovCustomerDocumentRequests(token)
        if (mounted) setRows(data)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : '요청서류를 불러오지 못했습니다.')
      }
    })()
    return () => {
      mounted = false
    }
  }, [navigate, token])

  return (
    <div className="government-customer-app-page customer-app-claim-page">
      <StatusMessage message={error} tone="error" />
      {rows.length === 0 ? <div className="customer-app-claim-empty">요청된 서류가 없습니다.</div> : null}
      {rows.length > 0 ? (
        <ul className="customer-app-claim-request-list">
          {rows.map((row) => {
            const meta = requestStatusMeta(row.status)
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className="customer-app-claim-request-card"
                  onClick={() => navigate(governmentAppRequestDetailPath(row.id))}
                >
                  <div className="customer-app-claim-request-card__top">
                    <div>
                      <div className="customer-app-claim-request-card__title">
                        #{row.id} {row.title || '요청 서류'}
                      </div>
                      <div className="customer-app-claim-request-card__meta">
                        항목 {row.submittedCount}/{row.itemCount} · {formatDateTime(row.createdAt)}
                      </div>
                    </div>
                    <span className={meta.className}>{meta.label}</span>
                  </div>
                  {row.message ? <div className="customer-app-claim-request-card__memo">{row.message}</div> : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
