import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FileUploader from '../../../../components/common/FileUploader'
import { StatusMessage } from '../../../../components/feedback'
import { FormButton } from '../../../../components/form'
import { useAuth } from '../../../auth/AuthProvider'
import {
  confirmGovCustomerDocumentFile,
  deleteGovCustomerDocumentFile,
  downloadGovCustomerDocumentFile,
  fetchGovCustomerDocumentRequestDetail,
  presignGovCustomerDocumentFile,
  type GovCustomerDocumentRequestDetail,
  type GovCustomerDocumentRequestItem,
} from '../api/governmentCustomerAppApi'
function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.ceil(bytes / 1024)} KB`
}

function itemStatusClass(status: string): string {
  if (status === '제출 완료' || status === '검토 완료' || status === '최종 완료') {
    return 'customer-app-claim-status customer-app-claim-status--done'
  }
  if (status === '보완 필요') {
    return 'customer-app-claim-status customer-app-claim-status--rejected'
  }
  return 'customer-app-claim-status customer-app-claim-status--requested'
}

type ItemUploadProps = {
  token: string
  requestId: string
  item: GovCustomerDocumentRequestItem
  onChanged: () => void
}

function DocumentRequestItemUpload({ token, requestId, item, onChanged }: ItemUploadProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const validateFile = (file: File): string | null => {
    const contentType = file.type || 'application/octet-stream'
    const isPdf = contentType === 'application/pdf'
    const isImage = contentType.startsWith('image/')
    if (!isPdf && !isImage) return '이미지 또는 PDF 파일만 업로드할 수 있습니다.'
    if (file.size > 10 * 1024 * 1024) return '파일은 최대 10MB까지 업로드할 수 있습니다.'
    return null
  }

  const uploadFile = async (file: File) => {
    setBusy(true)
    setError('')
    try {
      const contentType = file.type || 'application/octet-stream'
      const presign = await presignGovCustomerDocumentFile(token, requestId, item.id, {
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
      })
      const headers: Record<string, string> = { 'Content-Type': contentType, ...(presign.putHeaders ?? {}) }
      const put = await fetch(presign.uploadUrl, { method: 'PUT', headers, body: file })
      if (!put.ok) throw new Error('파일 업로드에 실패했습니다.')
      await confirmGovCustomerDocumentFile(token, requestId, item.id, presign.fileId)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="customer-app-claim-card government-customer-app-detail-card">
      <div className="customer-app-claim-detail-header">
        <h3 className="customer-app-claim-section-title">{item.label || item.docType}</h3>
        <span className={itemStatusClass(item.status)}>{item.status}</span>
      </div>
      <StatusMessage message={error} tone="error" className="!mt-2" />
      {item.files.length > 0 ? (
        <ul className="customer-app-claim-file-list">
          {item.files.map((file) => (
            <li key={file.id} className="customer-app-claim-file-row">
              <span className="customer-app-claim-file-row__icon">FILE</span>
              <div className="customer-app-claim-file-row__main">
                <div className="customer-app-claim-file-row__name">{file.fileName}</div>
                <div className="customer-app-claim-file-row__meta">{formatFileSize(file.fileSize)}</div>
              </div>
              <FormButton
                htmlType="button"
                variant="secondary"
                className="government-customer-app-file-btn"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    const dl = await downloadGovCustomerDocumentFile(token, requestId, item.id, file.id)
                    window.open(dl.downloadUrl, '_blank', 'noopener,noreferrer')
                  })()
                }}
              >
                열기
              </FormButton>
              <FormButton
                htmlType="button"
                variant="secondary"
                className="government-customer-app-file-btn"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true)
                    try {
                      await deleteGovCustomerDocumentFile(token, requestId, item.id, file.id)
                      onChanged()
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
              >
                삭제
              </FormButton>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="government-customer-app-uploader-wrap">
        <FileUploader
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          validateFile={validateFile}
          onFiles={(files) => {
            void (async () => {
              for (const file of files) {
                await uploadFile(file)
              }
            })()
          }}
          disabled={busy}
          primaryHint="이미지 또는 PDF를 선택해 주세요."
          hintLines={['JPG · PNG · WEBP · GIF · PDF', '각 파일 최대 10MB']}
        />
      </div>
    </section>
  )
}

export default function GovernmentCustomerAppRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [detail, setDetail] = useState<GovCustomerDocumentRequestDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadDetail = useCallback(async () => {
    if (!token?.trim() || !requestId?.trim()) return
    setLoading(true)
    try {
      const data = await fetchGovCustomerDocumentRequestDetail(token, requestId)
      setDetail(data)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '상세를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [requestId, token])

  useEffect(() => {
    if (!token?.trim()) {
      navigate('/government/login', { replace: true })
      return
    }
    void loadDetail()
  }, [loadDetail, navigate, token])

  return (
    <div className="customer-app-claim-page government-customer-app-detail">
      <StatusMessage message={error} tone="error" />
      {!detail && loading ? <div className="customer-app-claim-empty">불러오는 중…</div> : null}
      {detail ? (
        <>
          <section className="customer-app-claim-card">
            <h2 className="customer-app-claim-section-title">#{detail.id} {detail.title}</h2>
            {detail.message ? <div className="customer-app-claim-detail-memo">{detail.message}</div> : null}
            <div className="customer-app-claim-refresh-wrap">
              <FormButton htmlType="button" variant="secondary" onClick={() => void loadDetail()} loading={loading}>
                새로고침
              </FormButton>
            </div>
          </section>
          {detail.items.map((item) => (
            <DocumentRequestItemUpload
              key={item.id}
              token={token ?? ''}
              requestId={detail.id}
              item={item}
              onChanged={() => void loadDetail()}
            />
          ))}
        </>
      ) : null}
    </div>
  )
}
