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

  it('draft: 7일 서명기한·URL 매핑', () => {
    const draft = buildGovernmentSignatureAlimtalkDraft({
      companyName: '세승대행',
      customerName: '홍길동',
      phone: '010-1234-5678',
      senderDisplayName: '김담당',
      tenantConfig: { governmentAgency: { contactPhone: '02-1234-5678' } },
      signToken: 'tok-abc',
      publicBaseUrl: 'https://app-develop.example.com',
    })
    assert.equal(draft.phoneDigits, '01012345678')
    assert.equal(draft.expiry.ok, true)
    assert.equal(draft.expiry.expiryDateDisplay, '2026-07-02')
    assert.equal(draft.signUrl, 'https://app-develop.example.com/government/sign/tok-abc')
    assert.equal(draft.messageVariables?.managerPhone, '0212345678')
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
                tenant_config: { governmentAgency: { contactPhone: '0211112222' } },
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

  it('dryRun relay 성공 정규화', async () => {
    const pool = {
      query: async (sql) => {
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
                tenant_config: { governmentAgency: { contactPhone: '0211112222' } },
                ga_company_name: '세승GA',
                sender_display_name: '김담당',
                sender_username: 'kim',
              },
            ],
          }
        }
        if (s.includes('INSERT INTO gov_signature_notification_logs')) {
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
        providerMessageId: null,
        providerCode: 'DRY_RUN',
        providerMessage: 'dry-run',
        requestedAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        raw: { dryRun: true },
      }),
    })
    assert.equal(res.ok, true)
    assert.equal(res.status, 'sent')
    assert.equal(res.dryRun, true)
  })

  it('담당자 연락처 누락 차단', async () => {
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
                tenant_config: {},
                ga_company_name: '세승GA',
                sender_display_name: '김담당',
                sender_username: 'kim',
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
    const res = await sendGovernmentSignatureAlimtalk(pool, {
      sendSessionId: 'sess-3',
      config: loadGovernmentSignatureAlimtalkConfig(),
      relayPoster: async () => ({ ok: false, status: 'failed', errorCategory: 'missing_contact' }),
    })
    assert.equal(res.ok, false)
    assert.equal(res.errorCategory, 'missing_contact')
  })
})
