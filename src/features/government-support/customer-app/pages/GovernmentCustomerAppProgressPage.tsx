import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusMessage } from '../../../../components/feedback'
import { useAuth } from '../../../auth/AuthProvider'
import { fetchGovCustomerProgress, type GovCustomerProgressEvent } from '../api/governmentCustomerAppApi'
import '../../../customer-app/customer-app-claims.css'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function GovernmentCustomerAppProgressPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [rows, setRows] = useState<GovCustomerProgressEvent[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token?.trim()) {
      navigate('/government/login', { replace: true })
      return
    }
    let mounted = true
    void (async () => {
      try {
        const data = await fetchGovCustomerProgress(token)
        if (mounted) setRows(data)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : '진행상황을 불러오지 못했습니다.')
      }
    })()
    return () => {
      mounted = false
    }
  }, [navigate, token])

  return (
    <div className="customer-app-claim-page">
      <StatusMessage message={error} tone="error" />
      {rows.length === 0 ? <div className="customer-app-claim-empty">진행 이력이 없습니다.</div> : null}
      {rows.length > 0 ? (
        <ul className="customer-app-claim-timeline">
          {rows.map((row) => (
            <li key={row.id} className="customer-app-claim-timeline__item">
              <div className="customer-app-claim-timeline__main">
                {row.title?.trim() ? `${row.title} · ` : ''}
                {row.status || '진행'}
              </div>
              <div className="customer-app-claim-timeline__meta">{formatDateTime(row.eventDate ?? row.createdAt)}</div>
              {row.content ? <div className="customer-app-claim-timeline__memo">{row.content}</div> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
