/** PdfApplicantPreviewStack 선택 필드 강조 — 편집 미리보기 전용(실제 수신자 화면에는 없음) */
export type PdfApplicantSelectionHighlight = 'default' | 'government-accent'

export type PdfApplicantSelectionHighlightPaint = {
  outline: string
  softBackground: string
  boxShadow: string
}

export function getPdfApplicantSelectionHighlightPaint(
  mode: PdfApplicantSelectionHighlight,
): PdfApplicantSelectionHighlightPaint {
  if (mode === 'government-accent') {
    return {
      outline: '2px solid rgba(242, 184, 0, 0.95)',
      softBackground: 'rgba(242, 184, 0, 0.12)',
      boxShadow: '0 0 0 2px rgba(242, 184, 0, 0.85)',
    }
  }
  return {
    outline: '2px solid rgba(59, 130, 246, 0.95)',
    softBackground: 'rgba(59, 130, 246, 0.08)',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.9)',
  }
}
