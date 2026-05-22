import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FileUploader from '../../../../components/common/FileUploader'
import { StatusMessage } from '../../../../components/feedback'
import { FormButton, FormInput, FormTextarea } from '../../../../components/form'
import { useAuth } from '../../../auth/AuthProvider'
import {
  confirmGovCustomerInquiryFile,
  createGovCustomerInquiry,
  presignGovCustomerInquiryFile,
} from '../api/governmentCustomerAppApi'
import '../../../customer-app/customer-app-claims.css'

interface UploadReadyFile {
  id: string
  file: File
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.ceil(bytes / 1024)} KB`
}

function fileTypeLabel(file: File): string {
  const contentType = file.type || 'application/octet-stream'
  if (contentType === 'application/pdf') return 'PDF'
  if (contentType.startsWith('image/')) return 'IMG'
  return 'FILE'
}

export default function GovernmentCustomerAppInquiryComposePage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<UploadReadyFile[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  useEffect(() => {
    if (!token?.trim()) navigate('/government/login', { replace: true })
  }, [navigate, token])

  const validateFile = (file: File): string | null => {
    const contentType = file.type || 'application/octet-stream'
    const isPdf = contentType === 'application/pdf'
    const isImage = contentType.startsWith('image/')
    if (!isPdf && !isImage) return '이미지 또는 PDF 파일만 업로드할 수 있습니다.'
    if (file.size > 10 * 1024 * 1024) return '파일은 최대 10MB까지 업로드할 수 있습니다.'
    return null
  }

  const uploadFilesForInquiry = async (inquiryId: string) => {
    if (!token?.trim()) return
    for (const item of files) {
      const contentType = item.file.type || 'application/octet-stream'
      const presign = await presignGovCustomerInquiryFile(token, inquiryId, {
        fileName: item.file.name,
        contentType,
        fileSize: item.file.size,
      })
      const headers: Record<string, string> = { 'Content-Type': contentType, ...(presign.putHeaders ?? {}) }
      const put = await fetch(presign.uploadUrl, { method: 'PUT', headers, body: item.file })
      if (!put.ok) throw new Error('파일 업로드에 실패했습니다.')
      await confirmGovCustomerInquiryFile(token, inquiryId, presign.fileId)
    }
  }

  const handleSubmit = async () => {
    if (!token?.trim()) return
    if (!content.trim()) {
      setError('문의 내용을 입력해 주세요.')
      return
    }
    setBusy(true)
    setError('')
    setResult('')
    try {
      const created = await createGovCustomerInquiry(token, {
        title: title.trim() || undefined,
        content: content.trim(),
      })
      if (files.length > 0) await uploadFilesForInquiry(created.id)
      setResult('문의가 전송되었습니다.')
      setTitle('')
      setContent('')
      setFiles([])
    } catch (e) {
      setError(e instanceof Error ? e.message : '문의 전송에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="customer-app-claim-page">
      <StatusMessage message={error} tone="error" />
      <StatusMessage message={result} tone="success" />

      <section className="customer-app-claim-card">
        <h2 className="customer-app-claim-section-title">문의 작성</h2>
        <p className="customer-app-claim-section-description">
          궁금한 사항이나 요청사항을 남겨 주시면 담당자가 확인 후 답변드립니다.
        </p>
        <div className="customer-app-claim-field" style={{ marginTop: 12 }}>
          <span className="customer-app-claim-field__label">제목 (선택)</span>
          <FormInput
            className="customer-app-claim-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 서류 제출 관련 문의"
            maxLength={200}
          />
        </div>
        <div className="customer-app-claim-field" style={{ marginTop: 12 }}>
          <span className="customer-app-claim-field__label">내용</span>
          <FormTextarea
            className="customer-app-claim-textarea"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="문의 내용을 입력해 주세요."
          />
        </div>
      </section>

      <section className="customer-app-claim-card">
        <h2 className="customer-app-claim-section-title">첨부 파일</h2>
        <p className="customer-app-claim-section-description">관련 자료가 있으면 이미지 또는 PDF를 첨부할 수 있습니다.</p>
        <div style={{ marginTop: 12 }}>
          <FileUploader
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            validateFile={validateFile}
            onFiles={(selected) => {
              setError('')
              setFiles((prev) => [
                ...prev,
                ...selected.map((file) => ({
                  id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  file,
                })),
              ])
            }}
            disabled={busy}
            primaryHint="이미지 또는 PDF를 선택해 주세요."
            hintLines={['JPG · PNG · WEBP · GIF · PDF', '각 파일 최대 10MB']}
          />
          {files.length > 0 ? (
            <ul className="customer-app-claim-file-list">
              {files.map((item) => (
                <li key={item.id} className="customer-app-claim-file-row">
                  <span className="customer-app-claim-file-row__icon">{fileTypeLabel(item.file)}</span>
                  <div className="customer-app-claim-file-row__main">
                    <div className="customer-app-claim-file-row__name">{item.file.name}</div>
                    <div className="customer-app-claim-file-row__meta">{formatFileSize(item.file.size)}</div>
                  </div>
                  <FormButton
                    htmlType="button"
                    variant="secondary"
                    className="!h-8 !px-3 text-[12px]"
                    onClick={() => setFiles((prev) => prev.filter((f) => f.id !== item.id))}
                  >
                    삭제
                  </FormButton>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <div className="customer-app-claim-actions">
        <FormButton htmlType="button" variant="primary" onClick={() => void handleSubmit()} loading={busy}>
          문의 전송
        </FormButton>
        <FormButton htmlType="button" variant="secondary" onClick={() => navigate('/government/app/inquiries')}>
          내역 보기
        </FormButton>
      </div>
    </div>
  )
}
