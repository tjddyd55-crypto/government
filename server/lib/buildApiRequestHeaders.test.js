import assert from 'node:assert/strict'
import test from 'node:test'
import { buildApiRequestHeaders } from '../../shared/buildApiRequestHeaders.js'

test('buildApiRequestHeaders sets application/json for JSON bodies', () => {
  const headers = buildApiRequestHeaders({
    token: 'abc',
    body: JSON.stringify({ title: '테스트' }),
  })
  assert.equal(headers['Content-Type'], 'application/json')
  assert.equal(headers.Authorization, 'Bearer abc')
})

test('buildApiRequestHeaders omits Content-Type for FormData', () => {
  const fd = new FormData()
  fd.append('pdf', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'test.pdf')
  fd.append('title', '테스트')
  fd.append('scopeType', 'agency')
  fd.append('tenantId', '69')

  const headers = buildApiRequestHeaders({
    token: 'abc',
    headers: { 'Content-Type': 'application/json' },
    body: fd,
  })

  assert.equal(headers['Content-Type'], undefined)
  assert.equal(headers['content-type'], undefined)
  assert.equal(headers.Authorization, 'Bearer abc')
})
