import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { loadGovernmentAuthAlimtalkConfig } from './governmentAuthAlimtalkConfig.js'
import { buildGovernmentAuthAlimtalkMessage } from './governmentAuthAlimtalkMessage.js'
import { sendGovernmentAuthVerificationCode } from './sendGovernmentAuthVerificationCode.js'

describe('sendGovernmentAuthVerificationCode', () => {
  const envBackup = { ...process.env }

  beforeEach(() => {
    process.env.GOVERNMENT_AUTH_ALIMTALK_ENABLED = 'false'
    process.env.GOVERNMENT_AUTH_ALIMTALK_TEMPLATE_CODE = 'UJ_6183'
    process.env.GOVERNMENT_AUTH_ALIMTALK_FALLBACK_SMS_ENABLED = 'true'
    process.env.GOVERNMENT_ALIMTALK_RELAY_URL = 'http://127.0.0.1:9/send-alimtalk'
    process.env.GOVERNMENT_ALIMTALK_RELAY_AUTH_TOKEN = 'relay-token'
  })

  afterEach(() => {
    process.env = { ...envBackup }
  })

  it('ENABLED=false → 알림톡 미호출 · SMS 1회', async () => {
    let smsCalls = 0
    let relayCalls = 0
    const res = await sendGovernmentAuthVerificationCode({
      purpose: 'SIGNUP',
      phoneNumber: '01012345678',
      code: '123456',
      expiresInMinutes: 3,
      config: loadGovernmentAuthAlimtalkConfig(),
      sendSms: async () => {
        smsCalls += 1
        return { success: true, sent: true, deliveryMode: 'live' }
      },
      postRelay: async () => {
        relayCalls += 1
        return { ok: true, status: 'sent', providerCode: '0' }
      },
    })
    assert.equal(res.success, true)
    assert.equal(res.channel, 'sms')
    assert.equal(res.fallbackUsed, false)
    assert.equal(smsCalls, 1)
    assert.equal(relayCalls, 0)
  })

  it('검수중(eligibility fail) → 알림톡 미호출 · SMS 1회', async () => {
    process.env.GOVERNMENT_AUTH_ALIMTALK_ENABLED = 'true'
    let smsCalls = 0
    let relayCalls = 0
    const res = await sendGovernmentAuthVerificationCode({
      purpose: 'PASSWORD_RESET',
      phoneNumber: '01012345678',
      code: '654321',
      expiresInMinutes: 3,
      config: loadGovernmentAuthAlimtalkConfig(),
      evaluateEligibility: async () => ({
        ok: false,
        reason: 'template_not_approved',
        inspStatus: 'REQ',
        status: null,
      }),
      sendSms: async (args) => {
        smsCalls += 1
        assert.equal(args.code, '654321')
        assert.equal(args.purpose, 'PASSWORD_RESET')
        return { success: true, sent: true, deliveryMode: 'live' }
      },
      postRelay: async () => {
        relayCalls += 1
        return { ok: true, status: 'sent', providerCode: '0' }
      },
    })
    assert.equal(res.success, true)
    assert.equal(res.channel, 'sms')
    assert.equal(res.fallbackUsed, true)
    assert.equal(smsCalls, 1)
    assert.equal(relayCalls, 0)
  })

  it('APR+R → 알림톡 1회 · SMS 0회', async () => {
    process.env.GOVERNMENT_AUTH_ALIMTALK_ENABLED = 'true'
    let smsCalls = 0
    let relayCalls = 0
    const res = await sendGovernmentAuthVerificationCode({
      purpose: 'SIGNUP',
      phoneNumber: '01012345678',
      code: '111222',
      config: loadGovernmentAuthAlimtalkConfig(),
      evaluateEligibility: async () => ({ ok: true, inspStatus: 'APR', status: 'R' }),
      sendSms: async () => {
        smsCalls += 1
        return { success: true, sent: true }
      },
      postRelay: async ({ payload }) => {
        relayCalls += 1
        assert.equal(payload.product, 'government_auth')
        assert.equal(payload.templateCode, 'UJ_6183')
        assert.equal(payload.messageVariables.verificationCode, '111222')
        assert.equal(payload.button, undefined)
        return {
          ok: true,
          status: 'sent',
          providerCode: '0',
          providerMessageId: 'mid-1',
          dryRun: false,
        }
      },
    })
    assert.equal(res.success, true)
    assert.equal(res.channel, 'kakao_alimtalk')
    assert.equal(res.fallbackUsed, false)
    assert.equal(smsCalls, 0)
    assert.equal(relayCalls, 1)
  })

  it('APR+A → 알림톡 1회 · SMS 0회', async () => {
    process.env.GOVERNMENT_AUTH_ALIMTALK_ENABLED = 'true'
    let smsCalls = 0
    const res = await sendGovernmentAuthVerificationCode({
      purpose: 'PHONE_CHANGE',
      phoneNumber: '01012345678',
      code: '333444',
      config: loadGovernmentAuthAlimtalkConfig(),
      evaluateEligibility: async () => ({ ok: true, inspStatus: 'APR', status: 'A' }),
      sendSms: async () => {
        smsCalls += 1
        return { success: true, sent: true }
      },
      postRelay: async () => ({
        ok: true,
        status: 'sent',
        providerCode: '0',
        dryRun: false,
      }),
    })
    assert.equal(res.channel, 'kakao_alimtalk')
    assert.equal(smsCalls, 0)
  })

  it('status=S → SMS fallback 1회', async () => {
    process.env.GOVERNMENT_AUTH_ALIMTALK_ENABLED = 'true'
    let smsCalls = 0
    const res = await sendGovernmentAuthVerificationCode({
      purpose: 'SIGNUP',
      phoneNumber: '01012345678',
      code: '555666',
      config: loadGovernmentAuthAlimtalkConfig(),
      evaluateEligibility: async () => ({
        ok: false,
        reason: 'template_stopped',
        inspStatus: 'APR',
        status: 'S',
      }),
      sendSms: async () => {
        smsCalls += 1
        return { success: true, sent: true }
      },
      postRelay: async () => ({ ok: true, status: 'sent', providerCode: '0' }),
    })
    assert.equal(res.channel, 'sms')
    assert.equal(res.fallbackUsed, true)
    assert.equal(smsCalls, 1)
  })

  it('알림톡 provider 음수 code → SMS fallback · 같은 OTP 재사용', async () => {
    process.env.GOVERNMENT_AUTH_ALIMTALK_ENABLED = 'true'
    let smsCode = null
    const res = await sendGovernmentAuthVerificationCode({
      purpose: 'PASSWORD_RESET',
      phoneNumber: '01012345678',
      code: '777888',
      config: loadGovernmentAuthAlimtalkConfig(),
      evaluateEligibility: async () => ({ ok: true }),
      sendSms: async (args) => {
        smsCode = args.code
        return { success: true, sent: true }
      },
      postRelay: async () => ({
        ok: false,
        status: 'failed',
        providerCode: '-99',
        errorCategory: 'provider_rejected',
      }),
    })
    assert.equal(res.channel, 'sms')
    assert.equal(res.fallbackUsed, true)
    assert.equal(smsCode, '777888')
  })

  it('알림톡 code=0 → SMS 0회', async () => {
    process.env.GOVERNMENT_AUTH_ALIMTALK_ENABLED = 'true'
    let smsCalls = 0
    await sendGovernmentAuthVerificationCode({
      purpose: 'SIGNUP',
      phoneNumber: '01012345678',
      code: '121212',
      config: loadGovernmentAuthAlimtalkConfig(),
      evaluateEligibility: async () => ({ ok: true }),
      sendSms: async () => {
        smsCalls += 1
        return { success: true, sent: true }
      },
      postRelay: async () => ({
        ok: true,
        status: 'sent',
        providerCode: '0',
        dryRun: false,
      }),
    })
    assert.equal(smsCalls, 0)
  })

  it('SMS result 실패 → 최종 실패', async () => {
    process.env.GOVERNMENT_AUTH_ALIMTALK_ENABLED = 'false'
    const res = await sendGovernmentAuthVerificationCode({
      purpose: 'SIGNUP',
      phoneNumber: '01012345678',
      code: '999000',
      config: loadGovernmentAuthAlimtalkConfig(),
      sendSms: async () => ({ success: false, sent: false, publicMessage: 'delay' }),
      postRelay: async () => ({ ok: true, status: 'sent', providerCode: '0' }),
    })
    assert.equal(res.success, false)
    assert.equal(res.publicMessage, 'delay')
  })

  it('회원가입·비밀번호 재설정 모두 UJ_6183', async () => {
    process.env.GOVERNMENT_AUTH_ALIMTALK_ENABLED = 'true'
    const codes = []
    for (const purpose of ['SIGNUP', 'PASSWORD_RESET']) {
      await sendGovernmentAuthVerificationCode({
        purpose,
        phoneNumber: '01012345678',
        code: '101010',
        config: loadGovernmentAuthAlimtalkConfig(),
        evaluateEligibility: async () => ({ ok: true }),
        sendSms: async () => ({ success: true, sent: true }),
        postRelay: async ({ payload }) => {
          codes.push(payload.templateCode)
          return { ok: true, status: 'sent', providerCode: '0', dryRun: false }
        },
      })
    }
    assert.deepEqual(codes, ['UJ_6183', 'UJ_6183'])
  })

  it('메시지 본문에 인증번호 자리표시자 치환', () => {
    const msg = buildGovernmentAuthAlimtalkMessage({
      messageTemplate: '인증번호는 #{인증번호} 입니다.\n유효시간: #{유효시간}분',
      varCode: '인증번호',
      varExpires: '유효시간',
      code: '123456',
      expiresInMinutes: 3,
    })
    assert.equal(msg.includes('123456'), true)
    assert.equal(msg.includes('#{'), false)
    assert.equal(msg.includes('3분'), true)
  })

  it('relay URL 은 send-auth-alimtalk 로 유도', () => {
    const cfg = loadGovernmentAuthAlimtalkConfig()
    assert.match(cfg.relayUrl, /send-auth-alimtalk$/)
    assert.equal(cfg.templateCode, 'UJ_6183')
    assert.equal(cfg.enabled, false)
  })
})
