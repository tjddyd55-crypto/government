import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runPostCommitGovernmentSignatureAlimtalk } from './governmentSignaturePostCommit.js'

describe('runPostCommitGovernmentSignatureAlimtalk', () => {
  it('disabled → skipped (Aligo 미호출)', async () => {
    const pool = {
      query: async (sql) => {
        const s = String(sql)
        if (s.includes('FROM gov_signature_send_sessions s')) {
          return {
            rows: [
              {
                send_session_id: 'sess-1',
                sign_token: 'tok',
                tenant_id: 10,
                profile_id: 20,
                sent_by_user_id: 'u1',
                expired_at: new Date(Date.now() + 7 * 86400000),
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
          return { rows: [{ id: 1 }] }
        }
        return { rows: [] }
      },
    }

    const prev = process.env.GOVERNMENT_ALIMTALK_ENABLED
    process.env.GOVERNMENT_ALIMTALK_ENABLED = 'false'

    const notification = await runPostCommitGovernmentSignatureAlimtalk(pool, {
      sendSessionId: 'sess-1',
      createdBy: 'u1',
    })

    if (prev == null) delete process.env.GOVERNMENT_ALIMTALK_ENABLED
    else process.env.GOVERNMENT_ALIMTALK_ENABLED = prev

    assert.equal(notification.status, 'skipped')
    assert.equal(notification.errorCategory, 'disabled')
    assert.equal(notification.channel, 'kakao_alimtalk')
  })

  it('sender phone 없음 → failed + missing_verified_phone, 세션 서비스는 계속', async () => {
    const pool = {
      query: async (sql) => {
        const s = String(sql)
        if (s.includes('FROM gov_signature_send_sessions s')) {
          return {
            rows: [
              {
                send_session_id: 'sess-2',
                sign_token: 'tok',
                tenant_id: 10,
                profile_id: 20,
                sent_by_user_id: 'u1',
                expired_at: new Date(Date.now() + 7 * 86400000),
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
          return { rows: [{ id: 2 }] }
        }
        return { rows: [] }
      },
    }

    const prevEnabled = process.env.GOVERNMENT_ALIMTALK_ENABLED
    const prevTpl = process.env.GOVERNMENT_ALIMTALK_TEMPLATE_CODE
    const prevBase = process.env.GOVERNMENT_PUBLIC_BASE_URL
    process.env.GOVERNMENT_ALIMTALK_ENABLED = 'true'
    process.env.GOVERNMENT_ALIMTALK_TEMPLATE_CODE = 'TPL_TEST'
    process.env.GOVERNMENT_PUBLIC_BASE_URL = 'https://app-develop.example.com'

    const notification = await runPostCommitGovernmentSignatureAlimtalk(pool, {
      sendSessionId: 'sess-2',
    })

    if (prevEnabled == null) delete process.env.GOVERNMENT_ALIMTALK_ENABLED
    else process.env.GOVERNMENT_ALIMTALK_ENABLED = prevEnabled
    if (prevTpl == null) delete process.env.GOVERNMENT_ALIMTALK_TEMPLATE_CODE
    else process.env.GOVERNMENT_ALIMTALK_TEMPLATE_CODE = prevTpl
    if (prevBase == null) delete process.env.GOVERNMENT_PUBLIC_BASE_URL
    else process.env.GOVERNMENT_PUBLIC_BASE_URL = prevBase

    assert.equal(notification.status, 'failed')
    assert.equal(notification.errorCategory, 'missing_verified_phone')
  })
})
