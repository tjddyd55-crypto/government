import { isGovernmentSignaturePdfUploadPath } from '../governmentSignatures/governmentSignaturePdfUploadRequest.js'

/**
 * multipart 업로드가 express.json() 에 걸리지 않도록 스킵 여부를 판단한다.
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export function shouldSkipJsonBodyParser(req) {
  const url = String(req.originalUrl || req.url || '')
  if (isGovernmentSignaturePdfUploadPath(url)) {
    return true
  }
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  return contentType.startsWith('multipart/form-data')
}
