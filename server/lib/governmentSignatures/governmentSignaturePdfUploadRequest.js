/**
 * 정부지원 PDF 템플릿 업로드 요청 형식 검증.
 */

/**
 * @param {import('express').Request} req
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
export function validateGovernmentSignaturePdfUploadContentType(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  if (!contentType.includes('multipart/form-data')) {
    return {
      ok: false,
      status: 400,
      message: 'PDF 업로드 요청 형식이 올바르지 않습니다.',
    }
  }
  return { ok: true }
}

/**
 * @param {import('multer').MulterError | Error | null | undefined} err
 * @returns {string}
 */
export function governmentSignaturePdfUploadMulterErrorMessage(err) {
  if (!err) {
    return 'PDF 업로드 요청 형식이 올바르지 않습니다.'
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return 'PDF 파일 크기가 제한을 초과했습니다.'
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return 'PDF 업로드 요청 형식이 올바르지 않습니다.'
  }
  const message = typeof err.message === 'string' ? err.message.trim() : ''
  if (message && !message.includes('Unexpected field')) {
    return message
  }
  return 'PDF 업로드 요청 형식이 올바르지 않습니다.'
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isGovernmentSignaturePdfUploadPath(url) {
  return /signature-templates\/pdf\/upload/i.test(String(url || ''))
}
