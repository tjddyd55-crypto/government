import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGovernmentSignatureAlimtalkDraft,
  sendGovernmentSignatureAlimtalk,
} from './governmentSignatureAlimtalkService.js'
import { loadGovernmentSignatureAlimtalkConfig } from './governmentSignatureAlimtalkConfig.js'

describe('governmentSignatureAlimtalkService', () => {
  const envBackup = { ...process.env }

  beforeEach(() => {
    process.env.GOVERNMENT_ALIMTALK_ENABLED = 'false'
    process.env.GOVERNMENT_ALIMTALK_DRY_RUN = 'true'
    process.env.GOVERNMENT_PUBLIC_BASE_URL = 'https://app-develop.example.com'
    process.env.GOVERNMENT_ALIMTALK_TEMPLATE_CODE = 'TPL_GOV_SIG'
    process.env.GOVERNMENT_ALIMTALK_RELAY_URL = 'http://127.0.0.1:9/send-alimtalk'
    process.env.GOVERNMENT_ALIMTALK_RELAY_AUTH_TOKEN = 'relay-token'
  })

  afterEach(() => {
    process.env = { ...envBackup }
  })

  it('draft: 승인 템플릿 4변수만 · 서명기한은 세션 정책으로만', () => {
    const draft = buildGovernmentSignatureAlimtalkDraft({
      customerName: '홍길동',
      phone: '010-1234-5678',
      senderDisplayName: '김담당',
      senderPhoneNumber: '01099998888',
      signToken: 'tok-abc',
      publicBaseUrl: 'https://app-develop.example.com',
    })
    assert.equal(draft.phoneDigits, '01012345678')
    assert.equal(draft.expiry.ok, true)
    assert.equal(draft.expiry.expiryDateDisplay, '2026-07-02')
    assert.equal(draft.signUrl, 'https://app-develop.example.com/government/sign/tok-abc')
    assert.equal(draft.signToken, 'tok-abc')
    assert.deepEqual(draft.messageVariables, {
      customerName: '홍길동',
      managerName: '김담당',
      managerPhone: '01099998888',
      signToken: 'tok-abc',
    })
    assert.equal(Object.prototype.hasOwnProperty.call(draft.messageVariables, 'companyName'), false)
    assert.equal(Object.prototype.hasOwnProperty.call(draft.messageVariables, 'requestedDate'), false)
    assert.equal(Object.prototype.hasOwnProperty.call(draft.messageVariables, 'expiryDate'), false)
    assert.equal(Object.prototype.hasOwnProperty.call(draft.messageVariables, 'signUrl'), false)
  })

  it('dry-run relay payload에 승인 외 변수 미포함', async () => {
    /** @type {Record<string, unknown> | null} */
    let capturedPayload = null
    const pool = {
      query: async (sql) => {
        const s = String(sql)
        if (s.includes('FROM gov_signature_send_sessions')) {
          return {
            rows: [
              {
                send_session_id: 'sess-payload',
                sign_token: 'same-sign-token',
                tenant_id: 10,
                profile_id: 20,
                sent_by_user_id: 'u1',
                expired_at: new Date('2026-07-02T14:59:59.999Z'),
                customer_name: '홍길동',
                profile_phone: '01012345678',
                business_name: '사업장A',
                tenant_name: '세승',
                tenant_config: {},
                sender_phone_number: '01011112222',
                ga_company_name: '세승GA',
                sender_display_name: '김담당',
                sender_username: 'kim',
              },
            ],
          }
        }
        if (s.includes('INSERT INTO gov_signature_notification_logs')) {
          return { rows: [{ id: 99 }] }
        }
        return { rows: [] }
      },
    }
    process.env.GOVERNMENT_ALIMTALK_ENABLED = 'true'
    process.env.GOVERNMENT_ALIMTALK_VAR_CUSTOMER_NAME = '고객명'
    process.env.GOVERNMENT_ALIMTALK_VAR_MANAGER_NAME = '담당자명'
    process.env.GOVERNMENT_ALIMTALK_VAR_MANAGER_PHONE = '담당자연락처'
    process.env.GOVERNMENT_ALIMTALK_VAR_SIGN_TOKEN = '전자서명토큰'
    process.env.GOVERNMENT_ALIMTALK_BUTTON_NAME = '전자서명하기'
    const config = loadGovernmentSignatureAlimtalkConfig()
    const res = await sendGovernmentSignatureAlimtalk(pool, {
      sendSessionId: 'sess-payload',
      config,
      relayPoster: async ({ payload }) => {
        capturedPayload = payload
        return {
          ok: true,
          status: 'sent',
          dryRun: true,
          providerMessageId: null,
          providerCode: 'DRY_RUN',
          providerMessage: 'dry-run',
          requestedAt: new Date().toISOString(),
          sentAt: new Date().toISOString(),
          raw: { dryRun: true },
        }
      },
    })
    assert.equal(res.ok, true)
    assert.ok(capturedPayload)
    const vars = /** @type {Record<string, string>} */ (capturedPayload.messageVariables)
    assert.deepEqual(Object.keys(vars).sort(), ['customerName', 'managerName', 'managerPhone', 'signToken'])
    assert.equal(vars.customerName, '홍길동')
    assert.equal(vars.managerName, '김담당')
    assert.equal(vars.managerPhone, '01011112222')
    assert.equal(vars.signToken, 'same-sign-token')
    assert.equal(vars.companyName, undefined)
    assert.equal(vars.requestedDate, undefined)
    assert.equal(vars.expiryDate, undefined)
    assert.equal(vars.signUrl, undefined)
    assert.deepEqual(capturedPayload.variableNameMap, {
      customerName: '고객명',
      managerName: '담당자명',
      managerPhone: '담당자연락처',
      signToken: '전자서명토큰',
    })
    assert.equal(capturedPayload.button.name, '전자서명하기')
    assert.equal(
      capturedPayload.button.mobileUrl,
      'https://app-develop.example.com/government/sign/same-sign-token',
    )
    assert.equal(capturedPayload.button.pcUrl, capturedPayload.button.mobileUrl)
  })

  it('enabled=false → skipped 로그', async () => {
    const inserts = []
    const pool = {
      query: async (sql, params) => {
        const s = String(sql)
        if (s.includes('FROM gov_signature_send_sessions')) {
          return {
            rows: [
              {
                send_session_id: 'sess-1',
                sign_token: 'tok-1',
                tenant_id: 10,
                profile_id: 20,
                sent_by_user_id: 'u1',
                expired_at: null,
                customer_name: '홍길동',
                profile_phone: '01012345678',
                business_name: '사업장',
                tenant_name: '세승',
                tenant_config: {},
                sender_phone_number: '01011112222',
                ga_company_name: '세승GA',
                sender_display_name: '김담당',
                sender_username: 'kim',
              },
            ],
          }
        }
        if (s.includes('INSERT INTO gov_signature_notification_logs')) {
          inserts.push(params)
          return { rows: [{ id: 1, ...Object.fromEntries(params.map((v, i) => [`c${i}`, v])) }] }
        }
        return { rows: [] }
      },
    }
    const res = await sendGovernmentSignatureAlimtalk(pool, { sendSessionId: 'sess-1' })
    assert.equal(res.ok, true)
    assert.equal(res.status, 'skipped')
    assert.equal(res.errorCategory, 'disabled')
    assert.equal(inserts.length, 1)
    assert.equal(inserts[0][7], 'skipped')
  })

  it('dryRun relay 성공 → skipped 정규화 (sentAt 미기록)', async () => {
    const inserts = []
    const pool = {
      query: async (sql, params) => {
        const s = String(sql)
        if (s.includes('FROM gov_signature_send_sessions')) {
          return {
            rows: [
              {
                send_session_id: 'sess-2',
                sign_token: 'tok-2',
                tenant_id: 10,
                profile_id: 20,
                sent_by_user_id: 'u1',
                expired_at: null,
                customer_name: '홍길동',
                profile_phone: '01012345678',
                business_name: '',
                tenant_name: '세승',
                tenant_config: {},
                sender_phone_number: '01011112222',
                ga_company_name: '세승GA',
                sender_display_name: '김담당',
                sender_username: 'kim',
              },
            ],
          }
        }
        if (s.includes('INSERT INTO gov_signature_notification_logs')) {
          inserts.push(params)
          return { rows: [{ id: 2 }] }
        }
        return { rows: [] }
      },
    }
    process.env.GOVERNMENT_ALIMTALK_ENABLED = 'true'
    const config = loadGovernmentSignatureAlimtalkConfig()
    const res = await sendGovernmentSignatureAlimtalk(pool, {
      sendSessionId: 'sess-2',
      config,
      relayPoster: async () => ({
        ok: true,
        status: 'sent',
        dryRun: true,
        providerMessageId: 'should-not-persist',
        providerCode: 'DRY_RUN',
        providerMessage: 'dry-run',
        requestedAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        raw: { dryRun: true },
      }),
    })
    assert.equal(res.ok, true)
    assert.equal(res.status, 'skipped')
    assert.equal(res.dryRun, true)
    assert.equal(res.providerCode, 'DRY_RUN')
    assert.equal(res.providerMessageId, null)
    assert.equal(inserts.length, 1)
    assert.equal(inserts[0][7], 'skipped')
    assert.equal(inserts[0][8], null)
  })

  it('dryRun=false live sent 유지', async () => {
    const inserts = []
    const pool = {
      query: async (sql, params) => {
        const s = String(sql)
        if (s.includes('FROM gov_signature_send_sessions')) {
          return {
            rows: [
              {
                send_session_id: 'sess-live',
                sign_token: 'tok-live',
                tenant_id: 10,
                profile_id: 20,
                sent_by_user_id: 'u1',
                expired_at: null,
                customer_name: '홍길동',
                profile_phone: '01012345678',
                business_name: '',
                tenant_name: '세승',
                tenant_config: {},
                sender_phone_number: '01011112222',
                ga_company_name: '세승GA',
                sender_display_name: '김담당',
                sender_username: 'kim',
              },
            ],
          }
        }
        if (s.includes('INSERT INTO gov_signature_notification_logs')) {
          inserts.push(params)
          return { rows: [{ id: 3 }] }
        }
        return { rows: [] }
      },
    }
    process.env.GOVERNMENT_ALIMTALK_ENABLED = 'true'
    process.env.GOVERNMENT_ALIMTALK_DRY_RUN = 'false'
    const config = loadGovernmentSignatureAlimtalkConfig()
    const res = await sendGovernmentSignatureAlimtalk(pool, {
      sendSessionId: 'sess-live',
      config,
      relayPoster: async () => ({
        ok: true,
        status: 'sent',
        dryRun: false,
        providerMessageId: 'mid-1',
        providerCode: '0',
        providerMessage: 'ok',
        requestedAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        raw: {},
      }),
    })
    assert.equal(res.ok, true)
    assert.equal(res.status, 'sent')
    assert.equal(res.dryRun, false)
    assert.equal(res.providerMessageId, 'mid-1')
    assert.equal(inserts[0][7], 'sent')
    assert.equal(inserts[0][8], 'mid-1')
  })

  it('발송자 인증 휴대폰 누락 차단', async () => {
    const pool = {
      query: async (sql) => {
        const s = String(sql)
        if (s.includes('FROM gov_signature_send_sessions')) {
          return {
            rows: [
              {
                send_session_id: 'sess-3',
                sign_token: 'tok-3',
                tenant_id: 10,
                profile_id: 20,
                sent_by_user_id: 'u1',
                expired_at: null,
                customer_name: '홍길동',
                profile_phone: '01012345678',
                business_name: '',
                tenant_name: '세승',
                tenant_config: { governmentAgency: { contactPhone: '0211112222' } },
                ga_company_name: '세승GA',
                sender_display_name: '김담당',
                sender_username: 'kim',
                sender_phone_number: null,
              },
            ],
          }
        }
        if (s.includes('INSERT INTO gov_signature_notification_logs')) {
          return { rows: [{ id: 3 }] }
        }
        return { rows: [] }
      },
    }
    process.env.GOVERNMENT_ALIMTALK_ENABLED = 'true'
    let relayCalled = false
    const res = await sendGovernmentSignatureAlimtalk(pool, {
      sendSessionId: 'sess-3',
      config: loadGovernmentSignatureAlimtalkConfig(),
      relayPoster: async () => {
        relayCalled = true
        return { ok: false, status: 'failed' }
      },
    })
    assert.equal(relayCalled, false)
    assert.equal(res.ok, false)
    assert.equal(res.errorCategory, 'missing_verified_phone')
  })
})
