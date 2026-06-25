/**
 * 정부지원 전자서명 PDF 좌표 편집 — government-support PDF API 사용.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../../lib/apiClient'
import { FormButton, FormInput, FormTextarea } from '../../../components/form'
import { useAuth } from '../../auth/AuthProvider'
import { useGovernmentAccess } from '../hooks/useGovernmentAccess'
import { useGovernmentSignatureScopeFields } from '../hooks/useGovernmentSignatureScopeFields'
import GovernmentAdminOperationalScopeFields from '../components/GovernmentAdminOperationalScopeFields'
import { PdfCoordinateEditor } from '../../pdf-engine/components/PdfCoordinateEditor'
import { validatePdfTemplateFieldsForSave, dedupeRadioPlacementsInFields } from '../../pdf-engine/validatePdfTemplateFieldsForSave'
import { normalizePdfFieldKeys } from '../../pdf-engine/pdfFieldKey'
import { normalizePdfFieldDataMapping } from '../../pdf-engine/lib/resolvePdfFieldValue'
import type { PdfFieldSpec, PdfInputRole, PdfTemplateSummary } from '../../pdf-engine/types'
import { DEFAULT_PDF_FIELD_DATA_MAPPING } from '../../pdf-engine/types'
import { mapGovernmentSignatureApiError } from '../signatures/governmentSignatureUserDisplay'
import {
  createGovSignaturePdfTemplate,
  fetchGovSignaturePdfTemplateFile,
  getGovSignaturePdfTemplate,
  saveGovSignaturePdfTemplateFields,
  uploadGovSignaturePdfTemplateFile,
} from './governmentSignaturePdfTemplateClient'
import '../../pdf-engine/pdf-engine.css'
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'
import '../publicSignature/government-signature-public.css'
import './government-signature-console.css'

const PDF_LIST_HREF = GOVERNMENT_ROUTE_PATHS.adminSignaturePdfList

function coercePdfFieldSpecForEditor(f: PdfFieldSpec & { id?: number }): PdfFieldSpec {
  const rest = { ...f } as PdfFieldSpec & { id?: number }
  delete rest.id
  const inputRole: PdfInputRole =
    rest.fieldType === 'signature'
      ? 'customer'
      : rest.inputRole === 'sender' || rest.inputRole === 'disabled' || rest.inputRole === 'customer'
        ? rest.inputRole
        : 'customer'
  return {
    ...rest,
    inputRole,
    dataMapping: normalizePdfFieldDataMapping(rest.dataMapping ?? DEFAULT_PDF_FIELD_DATA_MAPPING),
  }
}

function radioPlacementsChangedByDedupe(before: PdfFieldSpec[], after: PdfFieldSpec[]): boolean {
  const map = new Map(before.map((f) => [f.fieldKey, f]))
  for (const nf of after) {
    if (nf.fieldType !== 'radio') continue
    const pf = map.get(nf.fieldKey)
    if (!pf || pf.fieldType !== 'radio') continue
    if (JSON.stringify(pf.placements) !== JSON.stringify(nf.placements)) return true
  }
  return false
}

export default function GovernmentPdfTemplateEditorPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const isNew = !idParam || idParam === 'new'
  const numericId = isNew ? null : Number(idParam)
  const navigate = useNavigate()
  const { token } = useAuth()
  const t = token?.trim() ?? ''

  if (isNew) {
    return <CreateGovPdfFlow token={t} onCreated={(id) => navigate(`${PDF_LIST_HREF}/${id}`)} />
  }
  return <EditGovPdfFlow token={t} templateId={Number(numericId)} />
}

function CreateGovPdfFlow({ token, onCreated }: { token: string; onCreated: (id: number) => void }) {
  const { summary } = useGovernmentAccess(token)
  const scopeFields = useGovernmentSignatureScopeFields(token, summary)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!token) return
    if (!title.trim()) {
      setError('문서 제목을 입력하세요.')
      return
    }
    if (!file) {
      setError('PDF 파일을 선택하세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    let scope
    try {
      scope = scopeFields.resolveScopePayload()
    } catch (e) {
      setError(mapGovernmentSignatureApiError(e, '공개 범위를 확인해 주세요.'))
      setSubmitting(false)
      return
    }
    try {
      const uploaded = await uploadGovSignaturePdfTemplateFile(token, file, scope)
      const created = await createGovSignaturePdfTemplate(token, {
        title: title.trim(),
        description: description.trim(),
        storageKey: uploaded.storageKey,
        pageCount: uploaded.pageCount,
        scope,
      })
      onCreated(created.template.id)
    } catch (e) {
      setError(mapGovernmentSignatureApiError(e, 'PDF 템플릿 생성에 실패했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="government-admin-signature-page government-admin-page pdf-engine-page pdf-engine-page--editor contract-signature-console" data-testid="government-admin-page">
      <div className="contract-signature-console__container">
        <header className="page-header government-admin-signature-page__header">
          <h1>PDF 업로드 · 좌표 편집</h1>
        </header>
        <div className="pdf-engine-page__toolbar">
          <Link to={PDF_LIST_HREF} className="gov-btn gov-btn--secondary pdf-engine-editor__btn">
            ← PDF 목록
          </Link>
        </div>
        {error ? <div className="gov-status-error-card contract-signature-console__inline-error">{error}</div> : null}
        <form className="pdf-engine-form government-admin-card" onSubmit={handleSubmit}>
          <label className="pdf-engine-editor__label">
            문서 제목
            <FormInput className="gov-form-control" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 개인정보 수집·이용 동의서" />
          </label>
          <label className="pdf-engine-editor__label">
            설명 (선택)
            <FormTextarea className="gov-form-control" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="pdf-engine-editor__label">
            PDF 파일
            <FormInput className="gov-form-control" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <GovernmentAdminOperationalScopeFields
            canPickScope={scopeFields.canPickScope}
            scopeType={scopeFields.scopeType}
            tenantId={scopeFields.tenantId}
            agencyOptions={scopeFields.agencyOptions}
            onScopeTypeChange={(value) =>
              scopeFields.setScopeType(value === 'global' ? 'global' : 'agency')
            }
            onTenantIdChange={scopeFields.setTenantId}
            disabled={submitting}
          />
          <FormButton htmlType="submit" variant="primary" className="gov-btn gov-btn--primary" disabled={submitting}>
            {submitting ? '등록 중…' : '등록하고 좌표 편집으로'}
          </FormButton>
        </form>
      </div>
    </main>
  )
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; template: PdfTemplateSummary; fields: PdfFieldSpec[]; pdfBuffer: ArrayBuffer }

function EditGovPdfFlow({ token, templateId }: { token: string; templateId: number }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [fields, setFields] = useState<PdfFieldSpec[]>([])
  const [fieldsDirty, setFieldsDirty] = useState(false)
  const [savingFields, setSavingFields] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !Number.isFinite(templateId)) return
    setState({ status: 'loading' })
    try {
      const detail = await getGovSignaturePdfTemplate(token, templateId)
      const pdfBuffer = await fetchGovSignaturePdfTemplateFile(token, templateId)
      const coerced = detail.fields.map(coercePdfFieldSpecForEditor)
      const { fields: normalizedFields, keysChanged } = normalizePdfFieldKeys(coerced)
      setFields(normalizedFields)
      setFieldsDirty(keysChanged)
      setState({
        status: 'ready',
        template: detail.template,
        fields: normalizedFields,
        pdfBuffer,
      })
      if (keysChanged) {
        setToast('일부 필드 식별자가 자동 보정되었습니다. 저장하면 반영됩니다.')
      }
    } catch (e) {
      setState({
        status: 'error',
        message: mapGovernmentSignatureApiError(e, 'PDF 템플릿을 불러오지 못했습니다.'),
      })
    }
  }, [token, templateId])

  useEffect(() => {
    void load()
  }, [load])

  const persistFields = useCallback(async (): Promise<boolean> => {
    if (!token || state.status !== 'ready') return false
    if (!fieldsDirty) {
      setToast('변경된 좌표가 없습니다.')
      return true
    }
    setSavingFields(true)
    setToast(null)
    try {
      const { fields: fieldsToSave, keysChanged: keysNormalized } = normalizePdfFieldKeys(fields)
      const dedupedFields = dedupeRadioPlacementsInFields(fieldsToSave)
      const validationError = validatePdfTemplateFieldsForSave(dedupedFields)
      if (validationError) {
        setToast(validationError)
        return false
      }
      const saved = await saveGovSignaturePdfTemplateFields(token, templateId, dedupedFields)
      setFields(saved.fields.map(coercePdfFieldSpecForEditor))
      setFieldsDirty(false)
      setToast(keysNormalized ? '필드 식별자를 보정한 뒤 좌표가 저장되었습니다.' : '좌표가 저장되었습니다.')
      return true
    } catch (e) {
      setToast(mapGovernmentSignatureApiError(e, '좌표 저장에 실패했습니다.'))
      return false
    } finally {
      setSavingFields(false)
    }
  }, [fields, fieldsDirty, state.status, templateId, token])

  if (state.status === 'loading') {
    return (
      <main className="government-admin-signature-page government-admin-page pdf-engine-page contract-signature-console" data-testid="government-admin-page">
        <p className="gov-status-loading pdf-engine-page__hint">PDF 템플릿을 불러오는 중…</p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="government-admin-signature-page government-admin-page pdf-engine-page contract-signature-console" data-testid="government-admin-page">
        <div className="gov-status-error-card contract-signature-console__inline-error">{state.message}</div>
        <Link to={PDF_LIST_HREF} className="gov-btn gov-btn--secondary pdf-engine-editor__btn">
          ← PDF 목록
        </Link>
      </main>
    )
  }

  return (
    <main className="government-admin-signature-page government-admin-page pdf-engine-page pdf-engine-page--editor contract-signature-console" data-testid="government-admin-page">
      <div className="contract-signature-console__container">
        <header className="page-header government-admin-signature-page__header">
          <h1>{state.template.title}</h1>
          <p>{state.template.pageCount}페이지 · PDF 좌표 편집</p>
        </header>
        <div className="pdf-engine-page__toolbar">
          <Link to={PDF_LIST_HREF} className="gov-btn gov-btn--secondary pdf-engine-editor__btn">
            ← PDF 목록
          </Link>
          <FormButton htmlType="button" variant="primary" className="gov-btn gov-btn--primary" disabled={savingFields} onClick={() => void persistFields()}>
            {savingFields ? '저장 중…' : '좌표 저장'}
          </FormButton>
          {toast ? <span className="pdf-engine-page__hint">{toast}</span> : null}
        </div>
        <PdfCoordinateEditor
          templateId={templateId}
          pdfBuffer={state.pdfBuffer}
          pageCount={state.template.pageCount}
          fields={fields}
          onChange={(next) => {
            setFields(next)
            setFieldsDirty(true)
          }}
          onSaveFields={() => void persistFields()}
          savingFields={savingFields}
          fieldsDirty={fieldsDirty}
          recipientLivePreview
          recipientPreviewVariant="government-public-sign"
          recipientPreviewDocumentTitle={state.template.title}
        />
      </div>
    </main>
  )
}
