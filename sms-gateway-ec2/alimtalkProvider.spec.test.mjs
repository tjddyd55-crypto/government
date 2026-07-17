import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { buildAligoAlimtalkForm, sendAligoAlimtalk } from './alimtalkProvider.mjs'
import { loadAlimtalkGatewayConfig } from './alimtalkConfig.mjs'

const REQUIRED_FORM_KEYS = [
  'apikey',
  'userid',
  'senderkey',
  'tpl_code',
  'sender',
  'receiver_1',
  'subject_1',
  'message_1',
]

function sampleFormInput() {
  return {
    config: {
      aligoApiKey: 'kakao-api-key',
      aligoUserId: 'tjddy55',
      aligoSenderKey: 'sender-key-40chars-------------------',
      aligoSender: '01022221382',
      governmentTemplateCode: 'UJ_4754',
      sendTimeoutMs: 8000,
    },
    recipientPhone: '01099998888',
    templateCode: 'UJ_4754',
    messageVariables: {
      customerName: '홍길동',
      managerName: '박성용',
      managerPhone: '01012345678',
      signToken: 'tok-abc',
    },
    button: {
      name: '전자서명하기',
      mobileUrl: 'https://app-develop-9663.up.railway.app/government/sign/tok-abc',
      pcUrl: 'https://app-develop-9663.up.railway.app/government/sign/tok-abc',
      linkType: 'WL',
    },
  }
}

describe('alimtalkProvider official spec payload', () => {
  it('공식 필수 필드 + button_1 JSON 을 모두 포함한다', () => {
    const form = buildAligoAlimtalkForm(sampleFormInput())
    for (const key of REQUIRED_FORM_KEYS) {
      assert.ok(form.get(key), `missing required field: ${key}`)
    }
    assert.equal(form.get('subject_1'), '전자서명')
    assert.equal(form.get('failover'), 'N')
    assert.equal(form.get('testMode'), 'N')

    const button = JSON.parse(String(form.get('button_1')))
    assert.ok(Array.isArray(button.button))
    assert.equal(button.button[0].name, '전자서명하기')
    assert.equal(button.button[0].linkType, 'WL')
    assert.equal(button.button[0].linkTypeName, '웹링크')
    assert.match(button.button[0].linkMo, /\/government\/sign\/tok-abc$/)
    assert.match(button.button[0].linkPc, /\/government\/sign\/tok-abc$/)
  })

  it('음수 provider code 는 HTTP 200이어도 failed 로 처리한다', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock.fn(async () => ({
      status: 200,
      text: async () => JSON.stringify({ code: -99, message: '가입된 아이디가 아닙니다.' }),
    }))
    try {
      const result = await sendAligoAlimtalk({ ...sampleFormInput(), dryRun: false })
      assert.equal(result.ok, false)
      assert.equal(result.status, 'failed')
      assert.equal(result.providerCode, '-99')
      assert.match(String(result.providerMessage), /가입된 아이디/)
      assert.equal(result.sentAt, null)
      assert.equal(result.errorCategory, 'provider_rejected')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('code=0 이면 sent 로 저장하고 info.mid 를 providerMessageId 로 사용한다', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock.fn(async () => ({
      status: 200,
      text: async () =>
        JSON.stringify({
          code: 0,
          message: '성공적으로 전송요청 하였습니다.',
          info: { mid: 123456, scnt: 1, fcnt: 0 },
        }),
    }))
    try {
      const result = await sendAligoAlimtalk({ ...sampleFormInput(), dryRun: false })
      assert.equal(result.ok, true)
      assert.equal(result.status, 'sent')
      assert.equal(result.providerCode, '0')
      assert.equal(result.providerMessageId, '123456')
      assert.ok(result.sentAt)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('dry-run 은 Aligo 를 호출하지 않고 skipped 를 반환한다', async () => {
    const originalFetch = globalThis.fetch
    let called = false
    globalThis.fetch = mock.fn(async () => {
      called = true
      return { status: 200, text: async () => '{}' }
    })
    try {
      const result = await sendAligoAlimtalk({ ...sampleFormInput(), dryRun: true })
      assert.equal(called, false)
      assert.equal(result.status, 'skipped')
      assert.equal(result.providerCode, 'DRY_RUN')
      assert.equal(result.dryRun, true)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('alimtalkConfig kakao-only credentials', () => {
  it('ALIGO_KAKAO_* 만 읽고 SMS ALIGO_API_KEY 로 fallback 하지 않는다', () => {
    const prev = { ...process.env }
    try {
      process.env.ALIGO_API_KEY = 'sms-key-should-not-be-used'
      process.env.ALIGO_USER_ID = 'sms-user'
      process.env.ALIGO_SENDER = '01011112222'
      delete process.env.ALIGO_KAKAO_API_KEY
      delete process.env.ALIGO_KAKAO_USER_ID
      delete process.env.ALIGO_KAKAO_SENDER_KEY
      process.env.ALIMTALK_DRY_RUN = 'true'

      const empty = loadAlimtalkGatewayConfig()
      assert.equal(empty.aligoApiKey, '')
      assert.equal(empty.aligoUserId, '')
      assert.equal(empty.aligoSenderKey, '')
      assert.equal(empty.aligoSender, '01011112222')

      process.env.ALIGO_KAKAO_API_KEY = 'kakao-key'
      process.env.ALIGO_KAKAO_USER_ID = 'tjddy55'
      process.env.ALIGO_KAKAO_SENDER_KEY = 'kakao-sender'
      const cfg = loadAlimtalkGatewayConfig()
      assert.equal(cfg.aligoApiKey, 'kakao-key')
      assert.equal(cfg.aligoUserId, 'tjddy55')
      assert.equal(cfg.aligoSenderKey, 'kakao-sender')
    } finally {
      for (const k of Object.keys(process.env)) {
        if (!(k in prev)) delete process.env[k]
      }
      Object.assign(process.env, prev)
    }
  })
})
