import { useRef } from 'react'
import FormButton from '../../../components/form/FormButton'
import { GOVERNMENT_DOCUMENT_STATUSES } from '../constants/governmentDocumentTypes'
import { patchGovDocument, presignGovDocument } from '../api/governmentProfilesApi'
import type { GovDocumentItem } from '../types/governmentProfile.types'

type Props = {
  token: string
  documents: GovDocumentItem[]
  onReload: () => Promise<void>
  onFeedback: (msg: string) => void
}

export default function GovernmentDocumentsTab({ token, documents, onReload, onFeedback }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const pendingDocIdRef = useRef<string | null>(null)

  const onPickFile = (docId: string) => {
    pendingDocIdRef.current = docId
    uploadRef.current?.click()
  }

  const onFileSelected = async (file: File | undefined) => {
    const docId = pendingDocIdRef.current
    pendingDocIdRef.current = null
    if (!file || !docId) return
    try {
      const presign = await presignGovDocument(token, docId, {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      })
      const put = await fetch(presign.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      })
      if (!put.ok) {
        throw new Error(`업로드 실패 (${put.status})`)
      }
      await patchGovDocument(token, docId, {
        storageKey: presign.storageKey ?? presign.objectKey,
        status: '제출 완료',
      })
      await onReload()
      onFeedback('서류 파일을 업로드했습니다.')
    } catch (e) {
      onFeedback(e instanceof Error ? e.message : '서류 업로드에 실패했습니다.')
    }
  }

  return (
    <div className="government-profile-documents-tab">
      <input
        ref={uploadRef}
        type="file"
        hidden
        onChange={(e) => void onFileSelected(e.target.files?.[0])}
      />
      <p className="government-page__muted">
        정부지원 전용 저장소에 파일을 보관합니다. 외부 스토리지 API와 연결하지 않습니다.
      </p>
      <ul className="government-profile-documents-tab__list">
        {documents.map((doc) => (
          <li key={doc.id} className="government-profile-documents-tab__item">
            <div className="government-profile-documents-tab__title">{doc.docType}</div>
            <div className="government-profile-documents-tab__actions">
              <select
                value={doc.status}
                onChange={(e) =>
                  void patchGovDocument(token, doc.id, { status: e.target.value }).then(() => onReload())
                }
                className="customer-workspace-tab-select government-profile-documents-tab__select"
              >
                {GOVERNMENT_DOCUMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <FormButton type="button" variant="secondary" onClick={() => onPickFile(doc.id)}>
                파일 업로드
              </FormButton>
            </div>
            {doc.storageKey ? (
              <p className="government-page__muted government-profile-documents-tab__storage-key">
                저장됨: {doc.storageKey}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
