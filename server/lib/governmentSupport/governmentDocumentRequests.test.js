import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseDocumentRequestItemsInput } from './governmentDocumentRequests.js'

describe('parseDocumentRequestItemsInput', () => {
  it('항목 없으면 거부', () => {
    const r = parseDocumentRequestItemsInput([])
    assert.equal(r.ok, false)
  })

  it('docType/label 파싱', () => {
    const r = parseDocumentRequestItemsInput([{ docType: '사업자등록증', label: '사업자등록증' }])
    assert.equal(r.ok, true)
    assert.equal(r.items[0].label, '사업자등록증')
  })
})
