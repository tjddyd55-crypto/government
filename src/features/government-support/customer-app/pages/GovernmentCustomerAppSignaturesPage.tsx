import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusMessage } from '../../../../components/feedback'
import { FormButton } from '../../../../components/form'
import { useAuth } from '../../../auth/AuthProvider'
import {
  downloadGovCustomerSignaturePdf,
  fetchGovCustomerSignatures,
  type GovCustomerSignatureItem,
} from '../api/governmentCustomerAppApi'
import '../../../customer-app/customer-app-claims.css'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

function signatureStatusClass(displayStatus: string): string {
  switch (displayStatus) {
    case '완료':
      return 'customer-app-claim-status customer-app-claim-status--done'
    case '서명 완료':
    case '열람됨':
      return 'customer-app-claim-status customer-app-claim-status--processing'
    case '취소':
    case '만료':
      return 'customer-app-claim-status customer-app-claim-status--rejected'
    default:
      return 'customer-app-claim-status customer-app-claim-status--requested'
  }
}

export default function GovernmentCustomerAppSignaturesPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [rows, setRows] = useState<GovCustomerSignatureItem[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!token?.trim()) {
      navigate('/government/login', { replace: true })
      return
    }
    let mounted = true
    void (async () => {
      try {
        const data = await fetchGovCustomerSignatures(token)
        if (mounted) setRows(data)
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : '전자서명 내역을 불러오지 못했습니다.')
      }
    })()
    return () => {
      mounted = false
    }
  }, [navigate, token])

  return (
    <div className="customer-app-claim-page">
      <StatusMessage message={error} tone="error" />
      {rows.length === 0 ? <div className="customer-app-claim-empty">전자서명 내역이 없습니다.</div> : null}
      {rows.length > 0 ? (
        <ul className="customer-app-claim-request-list">
          {rows.map((row) => (
            <li key={row.id}>
              <article className="customer-app-claim-request-card">
                <div className="customer-app-claim-request-card__top">
                  <div>
                    <div className="customer-app-claim-request-card__title">
                      {row.templateNames || '전자서명'}
                    </div>
                    <div className="customer-app-claim-request-card__meta">
                      {row.profileDisplayName} · 발송 {formatDateTime(row.sentAt)}
                    </div>
                  </div>
                  <span className={signatureStatusClass(row.displayStatus)}>{row.displayStatus}</span>
                </div>
                {row.hasSignedPdf ? (
                  <div style={{ marginTop: 8 }}>
                    <FormButton
                      htmlType="button"
                      variant="secondary"
                      loading={busyId === row.id}
                      onClick={() => {
                        void (async () => {
                          if (!token?.trim()) return
                          setBusyId(row.id)
                          try {
                            const dl = await downloadGovCustomerSignaturePdf(
                              token,
                              row.id,
                              row.firstCompletedDocumentId ?? undefined,
                            )
                            window.open(dl.downloadUrl, '_blank', 'noopener,noreferrer')
                          } catch (e) {
                            setError(e instanceof Error ? e.message : '다운로드에 실패했습니다.')
                          } finally {
                            setBusyId(null)
                          }
                        })()
                      }}
                    >
                      완료 PDF 다운로드
                    </FormButton>
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
