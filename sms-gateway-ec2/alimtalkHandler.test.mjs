import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createAlimtalkHandler } from './alimtalkHandler.mjs'

function mockReqRes(body, headers = {}) {
  /** @type {Record<string, string>} */
  const reqHeaders = { ...headers }
  const req = {
    body,
    headers: reqHeaders,
  }
  /** @type {{ statusCode: number, jsonBody: unknown }} */
  const state = { statusCode: 0, jsonBody: null }
  const res = {
    status(code) {
      state.statusCode = code
      return res
    },
    json(payload) {
      state.jsonBody = payload
      return res
    },
  }
  return { req, res, state }
}

const validBody = {
  requestId: 'req-1',
  product: 'government',
  recipientPhone: '01012345678',
  templateCode: 'TPL_TEST',
  messageVariables: {
    customerName: '홍길동',
    companyName: '세승대행',
    requestedDate: '2026-06-25',
    expiryDate: '2026-07-02',
    managerName: '김담당',
    managerPhone: '0212345678',
  },
  button: {
    name: '전자서명 확인',
    mobileUrl: 'https://example.com/government/sign/token',
    pcUrl: 'https://example.com/government/sign/token',
  },
  dryRun: true,
}

describe('POST /send-alimtalk handler', () => {
  const envBackup = { ...process.env }

  beforeEach(() => {
    process.env.ALIMTALK_RELAY_AUTH_TOKEN = 'test-relay-token'
    process.env.ALIMTALK_DRY_RUN = 'true'
  })

  afterEach(() => {
    process.env = { ...envBackup }
  })

  it('relay 인증 실패', async () => {
    const handler = createAlimtalkHandler()
    const { req, res, state } = mockReqRes(validBody, {})
    await handler(req, res)
    assert.equal(state.statusCode, 401)
    assert.equal(/** @type {Record<string, unknown>} */ (state.jsonBody).errorCategory, 'relay_auth_error')
  })

  it('잘못된 휴대폰 번호', async () => {
    const handler = createAlimtalkHandler()
    const { req, res, state } = mockReqRes(
      { ...validBody, recipientPhone: '123' },
      { authorization: 'Bearer test-relay-token' },
    )
    await handler(req, res)
    assert.equal(state.statusCode, 400)
    assert.equal(/** @type {Record<string, unknown>} */ (state.jsonBody).errorCategory, 'invalid_phone')
  })

  it('dry-run 성공 시 Aligo 미호출', async () => {
    const handler = createAlimtalkHandler()
    const { req, res, state } = mockReqRes(validBody, {
      authorization: 'Bearer test-relay-token',
    })
    await handler(req, res)
    assert.equal(state.statusCode, 200)
    const body = /** @type {Record<string, unknown>} */ (state.jsonBody)
    assert.equal(body.ok, true)
    assert.equal(body.status, 'skipped')
    assert.equal(body.dryRun, true)
    assert.equal(body.providerCode, 'DRY_RUN')
    assert.equal(body.sentAt, null)
  })

  it('응답에 secret 미포함', async () => {
    process.env.ALIGO_API_KEY = 'secret-key-should-not-leak'
    const handler = createAlimtalkHandler()
    const { req, res, state } = mockReqRes(validBody, {
      authorization: 'Bearer test-relay-token',
    })
    await handler(req, res)
    const serialized = JSON.stringify(state.jsonBody)
    assert.equal(serialized.includes('secret-key'), false)
  })
})
