import assert from 'node:assert/strict'
import test from 'node:test'
import {
  governmentSignaturePdfUploadMulterErrorMessage,
  isGovernmentSignaturePdfUploadPath,
  validateGovernmentSignaturePdfUploadContentType,
} from './governmentSignaturePdfUploadRequest.js'
import { shouldSkipJsonBodyParser } from '../http/shouldSkipJsonBodyParser.js'

test('validateGovernmentSignaturePdfUploadContentType rejects non-multipart', () => {
  const result = validateGovernmentSignaturePdfUploadContentType({
    headers: { 'content-type': 'application/json' },
  })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.status, 400)
    assert.equal(result.message, 'PDF 업로드 요청 형식이 올바르지 않습니다.')
  }
})

test('validateGovernmentSignaturePdfUploadContentType accepts multipart', () => {
  const result = validateGovernmentSignaturePdfUploadContentType({
    headers: { 'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary' },
  })
  assert.deepEqual(result, { ok: true })
})

test('governmentSignaturePdfUploadMulterErrorMessage maps unexpected field', () => {
  const message = governmentSignaturePdfUploadMulterErrorMessage({
    code: 'LIMIT_UNEXPECTED_FILE',
    message: 'Unexpected field',
  })
  assert.equal(message, 'PDF 업로드 요청 형식이 올바르지 않습니다.')
})

test('isGovernmentSignaturePdfUploadPath matches upload route', () => {
  assert.equal(
    isGovernmentSignaturePdfUploadPath('/backend/government-support/signature-templates/pdf/upload'),
    true,
  )
  assert.equal(isGovernmentSignaturePdfUploadPath('/government-support/signature-templates/pdf'), false)
})

test('shouldSkipJsonBodyParser skips pdf upload and multipart requests', () => {
  assert.equal(
    shouldSkipJsonBodyParser({
      originalUrl: '/backend/government-support/signature-templates/pdf/upload',
      headers: {},
    }),
    true,
  )
  assert.equal(
    shouldSkipJsonBodyParser({
      originalUrl: '/backend/government-support/signature-templates/pdf',
      headers: { 'content-type': 'multipart/form-data; boundary=abc' },
    }),
    true,
  )
  assert.equal(
    shouldSkipJsonBodyParser({
      originalUrl: '/backend/government-support/signature-templates/pdf',
      headers: { 'content-type': 'application/json' },
    }),
    false,
  )
})
