import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createAuthAlimtalkHandler } from './alimtalkAuthHandler.mjs'
import { buildAuthAlimtalkMessageBody } from './alimtalkAuthMessage.mjs'
import { buildAuthAligoAlimtalkForm } from './alimtalkAuthProvider.mjs'
import { evaluateAlimtalkTemplateSendEligibility } from './alimtalkTemplateEligibility.mjs'

function mockReqRes(body, headers = {}) {
  const req = { body, headers: { ...headers } }
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
  requestId: 'auth-1',
  product: 'government_auth',
  recipientPhone: '01012345678',
  templateCode: 'UJ_6183',
  subject: '인증번호',
  messageVariables: {
    verificationCode: '123456',
    expiresInMinutes: '3',
  },
  varMap: {
    verificationCode: '인증번호',
    expiresInMinutes: '유효시간',
  },
  messageTemplate: '인증번호는 #{인증번호} 입니다.\n유효시간: #{유효시간}분',
  dryRun: false,
}

describe('POST /send-auth-alimtalk', () => {
  const envBackup = { ...process.env }

  beforeEach(() => {
    process.env.ALIMTALK_RELAY_AUTH_TOKEN = 'test-relay-token'
    process.env.ALIMTALK_DRY_RUN = 'false'
    process.env.ALIGO_KAKAO_API_KEY = 'k'.repeat(32)
    process.env.ALIGO_KAKAO_USER_ID = 'userid01'
    process.env.ALIGO_KAKAO_SENDER_KEY = 's'.repeat(40)
    process.env.ALIGO_SENDER = '021234567'
  })

  afterEach(() => {
    process.env = { ...envBackup }
  })

  it('버튼 포함 요청 거부', async () => {
    const handler = createAuthAlimtalkHandler({
      fetchTemplateMeta: async () => ({ found: true, inspStatus: 'APR', status: 'R' }),
      sendAuth: async () => ({ ok: true, status: 'sent', providerCode: '0' }),
    })
    const { req, res, state } = mockReqRes(
      { ...validBody, button: { name: 'x', mobileUrl: 'https://x' } },
      { authorization: 'Bearer test-relay-token' },
    )
    await handler(req, res)
    assert.equal(state.statusCode, 400)
    assert.equal(state.jsonBody.errorCategory, 'button_not_allowed')
  })

  it('검수중 템플릿은 skipped · Aligo send 미호출', async () => {
    let sendCalls = 0
    const handler = createAuthAlimtalkHandler({
      fetchTemplateMeta: async () => ({ found: true, inspStatus: 'REQ', status: null }),
      sendAuth: async () => {
        sendCalls += 1
        return { ok: true, status: 'sent', providerCode: '0' }
      },
    })
    const { req, res, state } = mockReqRes(validBody, {
      authorization: 'Bearer test-relay-token',
    })
    await handler(req, res)
    assert.equal(state.statusCode, 200)
    assert.equal(state.jsonBody.status, 'skipped')
    assert.equal(state.jsonBody.errorCategory, 'template_not_approved')
    assert.equal(sendCalls, 0)
  })

  it('APR+R 이면 send 호출 · form 에 button_1/failover=N', async () => {
    let formSnapshot = null
    const handler = createAuthAlimtalkHandler({
      fetchTemplateMeta: async () => ({ found: true, inspStatus: 'APR', status: 'R' }),
      sendAuth: async (p) => {
        formSnapshot = buildAuthAligoAlimtalkForm(p)
        return {
          ok: true,
          status: 'sent',
          provider: 'aligo',
          channel: 'kakao_alimtalk',
          dryRun: false,
          providerCode: '0',
          providerMessageId: 'm1',
          providerMessage: 'success',
        }
      },
    })
    const { req, res, state } = mockReqRes(validBody, {
      authorization: 'Bearer test-relay-token',
    })
    await handler(req, res)
    assert.equal(state.statusCode, 200)
    assert.equal(state.jsonBody.providerCode, '0')
    assert.equal(formSnapshot.get('failover'), 'N')
    assert.equal(formSnapshot.has('button_1'), false)
    assert.equal(formSnapshot.get('tpl_code'), 'UJ_6183')
    assert.equal(formSnapshot.get('subject_1'), '인증번호')
  })

  it('eligibility SSOT: APR+A 허용 · S 차단', () => {
    assert.equal(
      evaluateAlimtalkTemplateSendEligibility({ found: true, inspStatus: 'APR', status: 'A' }).ok,
      true,
    )
    assert.equal(
      evaluateAlimtalkTemplateSendEligibility({ found: true, inspStatus: 'APR', status: 'S' }).ok,
      false,
    )
  })

  it('본문 치환에 코드 평문만 포함 · 자리표시자 제거', () => {
    const body = buildAuthAlimtalkMessageBody({
      messageTemplate: '인증번호는 #{인증번호} 입니다.\n유효시간: #{유효시간}분',
      varMap: { verificationCode: '인증번호', expiresInMinutes: '유효시간' },
      messageVariables: { verificationCode: '123456', expiresInMinutes: '3' },
    })
    assert.match(body, /123456/)
    assert.equal(body.includes('#{'), false)
  })
})
