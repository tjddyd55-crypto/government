/**
 * PDF 템플릿 좌표 편집 — 수신자 문서 미리보기.
 *
 * PdfApplicantPreviewStack(실제 PDF overlay 렌더)을 재사용한다.
 * 전체 수신자 step-card 플로우(GovernmentSignDocumentPage)가 아니라
 * 문서 확인 단계의 PDF+필드 overlay에 해당한다.
 */
import { useEffect, useMemo, useRef } from 'react'
import {
  DEFAULT_APPLICANT_SIDE_PREVIEW_SCALE,
  PdfApplicantPreviewStack,
  type PdfApplicantPreviewHandle,
} from './PdfApplicantPreviewStack'
import { buildPdfTemplatePreviewSampleValues } from '../lib/pdfTemplatePreviewSampleValues'
import type { PdfFieldSpec } from '../types'

export type PdfTemplateRecipientPreviewVariant = 'default' | 'government-public-sign'

type Props = {
  pdfBuffer: ArrayBuffer | null
  fields: PdfFieldSpec[]
  highlightedFieldKey: string | null
  currentPageIndex: number
  variant?: PdfTemplateRecipientPreviewVariant
  documentTitle?: string
}

export function PdfTemplateRecipientLivePreview({
  pdfBuffer,
  fields,
  highlightedFieldKey,
  currentPageIndex,
  variant = 'default',
  documentTitle = '전자서명 문서',
}: Props) {
  const previewRef = useRef<PdfApplicantPreviewHandle | null>(null)
  const previewPaneRef = useRef<HTMLDivElement | null>(null)
  const sampleValues = useMemo(() => buildPdfTemplatePreviewSampleValues(fields), [fields])
  const selectionHighlight = variant === 'government-public-sign' ? 'government-accent' : 'default'

  useEffect(() => {
    previewRef.current?.scrollToPage(currentPageIndex)
  }, [currentPageIndex, pdfBuffer])

  useEffect(() => {
    if (highlightedFieldKey) {
      previewRef.current?.scrollToField(highlightedFieldKey)
    }
  }, [highlightedFieldKey, sampleValues])

  const shellClass =
    'pdf-template-recipient-preview-shell' +
    (variant === 'government-public-sign' ? ' pdf-template-recipient-preview-shell--government' : '')

  return (
    <section
      className="pdf-engine-editor__panel pdf-engine-editor__panel--recipient-preview"
      aria-label="수신자 문서 화면 미리보기"
    >
      <div className="pdf-engine-editor__recipient-preview-head">
        <h3 className="pdf-engine-editor__panel-title">수신자 문서 화면 미리보기</h3>
        <p className="pdf-engine-editor__hint pdf-engine-editor__recipient-preview-lead">
          실제 수신자가 문서 확인 단계에서 보는 PDF/입력값/서명 위치를 보여줍니다. 표시값은 미리보기용
          샘플이며 저장되지 않습니다.
        </p>
      </div>

      <div className={shellClass}>
        <div className="pdf-template-recipient-preview-shell__device">
          <header className="pdf-template-recipient-preview-shell__statusbar" aria-hidden>
            <span className="pdf-template-recipient-preview-shell__statusbar-notch" />
          </header>
          <div className="pdf-template-recipient-preview-shell__appbar">
            <span className="pdf-template-recipient-preview-shell__appbar-title">{documentTitle}</span>
            <span className="pdf-template-recipient-preview-shell__badge">문서 미리보기</span>
          </div>
          <div className="pdf-template-recipient-preview-shell__body">
            <p className="pdf-template-recipient-preview-shell__step-label">문서 확인</p>
            <div ref={previewPaneRef} className="pdf-template-recipient-preview-shell__document-scroll">
              <PdfApplicantPreviewStack
                ref={previewRef}
                pdfBuffer={pdfBuffer}
                fields={fields}
                values={sampleValues}
                highlightedFieldKey={highlightedFieldKey}
                selectionHighlight={selectionHighlight}
                previewContainerRef={previewPaneRef}
                sidePreviewScale={DEFAULT_APPLICANT_SIDE_PREVIEW_SCALE}
                className="pdf-template-recipient-preview-shell__stack"
              />
            </div>
          </div>
          <footer className="pdf-template-recipient-preview-shell__footer">
            <button type="button" className="pdf-template-recipient-preview-shell__cta" disabled>
              다음
            </button>
          </footer>
        </div>
      </div>

      <p className="pdf-engine-editor__hint pdf-engine-editor__recipient-page-note">
        편집 중 페이지: {currentPageIndex + 1}
        {highlightedFieldKey ? (
          <>
            {' '}
            · 선택 필드(편집 전용 강조):{' '}
            {fields.find((f) => f.fieldKey === highlightedFieldKey)?.label ?? highlightedFieldKey}
          </>
        ) : null}
      </p>
    </section>
  )
}
