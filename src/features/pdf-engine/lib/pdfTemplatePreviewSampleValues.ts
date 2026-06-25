/**
 * PDF 템플릿 좌표 편집 — 수신자 문서 미리보기 전용 샘플값.
 *
 * - 실제 DB/발송 데이터가 아니다. PdfTemplateRecipientLivePreview → PdfApplicantPreviewStack 에만 주입한다.
 * - 저장 API·템플릿 persist 경로에서는 사용하지 않는다.
 */
import type { PdfFieldSpec } from '../types'

const DEFAULT_SAMPLE = '샘플 입력값'

function sampleTextForLabel(label: string): string {
  const t = label.trim()
  if (!t) return DEFAULT_SAMPLE
  if (/성명|이름|대표|담당/.test(t)) return '홍길동'
  if (/연락|전화|휴대|핸드폰|mobile/i.test(t)) return '010-1234-5678'
  if (/주소|소재지/.test(t)) return '서울특별시 중구 세종대로 110'
  if (/사업장|상호|회사|업체|법인/.test(t)) return '(주)샘플사업장'
  if (/사업자|등록번호|biz/i.test(t)) return '123-45-67890'
  if (/주민|생년|생일|날짜|일자/.test(t)) return '2026-06-25'
  if (/이메일|mail/i.test(t)) return 'sample@example.com'
  if (/번호|code/i.test(t)) return '1234567890'
  return DEFAULT_SAMPLE
}

/** 미리보기 전용 — fieldKey → 표시 문자열(저장되지 않음) */
export function buildPdfTemplatePreviewSampleValues(fields: PdfFieldSpec[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const field of fields) {
    const key = field.fieldKey
    switch (field.fieldType) {
      case 'text':
      case 'textarea':
        out[key] = sampleTextForLabel(field.label)
        break
      case 'radio': {
        const opts = (field.options ?? []).map((o) => String(o).trim()).filter(Boolean)
        out[key] = opts[0] ?? ''
        break
      }
      case 'checkbox': {
        const opts = (field.options ?? []).map((o) => String(o).trim()).filter(Boolean)
        out[key] = JSON.stringify(opts.slice(0, Math.min(1, opts.length)))
        break
      }
      case 'signature':
        out[key] = ''
        break
      default:
        out[key] = DEFAULT_SAMPLE
    }
  }
  return out
}
