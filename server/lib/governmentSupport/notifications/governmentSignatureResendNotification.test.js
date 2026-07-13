import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resendGovernmentSignatureAlimtalkNotification } from './governmentSignatureResendNotification.js'

describe('resendGovernmentSignatureAlimtalkNotification', () => {
  it('pending 세션 → 동일 signToken 재발송 + retry_count 증가', async () => {
    const inserts = []
    const pool = {
      query: async (sql, params) => {
        const s = String(sql)
        if (s.includes('FROM gov_signature_send_sessions s')) {
          return {
            rows: [
              {
                id: 'sess-1',
                status: 'pending',
                sign_token: 'same-token',
                expired_at: new Date(Date.now() + 7 * 86400000),
              },
            ],
          }
        }
        if (s.includes('MAX(retry_count)')) {
          return { rows: [{ max_retry: 1 }] }
        }
        if (s.includes('FROM gov_signature_send_sessions s\n    INNER JOIN')) {
          return {
            rows: [
              {
                send_session_id: 'sess-1',
                sign_token: 'same-token',
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
              },
            ],
          }
        }
        if (s.includes('INSERT INTO gov_signature_notification_logs')) {
          inserts.push(params)
          return { rows: [{ id: inserts.length }] }
        }
        return { rows: [] }
      },
    }

    const result = await resendGovernmentSignatureAlimtalkNotification(pool, {
      sessionId: 'sess-1',
      accessSql: 's.id = $1',
      accessParams: (id) => [id],
      createdBy: 'u1',
    })

    assert.equal(result.ok, true)
    assert.equal(result.signToken, 'same-token')
    assert.equal(result.notification.status, 'skipped')
    assert.equal(inserts.length, 1)
    assert.equal(inserts[0][12], 2)
  })

  it('completed → 409', async () => {
    const pool = {
      query: async () => ({
        rows: [
          {
            id: 'sess-2',
            status: 'completed',
            sign_token: 'tok',
            expired_at: new Date(Date.now() + 86400000),
          },
        ],
      }),
    }
    const result = await resendGovernmentSignatureAlimtalkNotification(pool, {
      sessionId: 'sess-2',
      accessSql: 's.id = $1',
      accessParams: (id) => [id],
    })
    assert.equal(result.ok, false)
    assert.equal(result.status, 409)
  })

  it('세션 없음 → 404', async () => {
    const pool = { query: async () => ({ rows: [], rowCount: 0 }) }
    const result = await resendGovernmentSignatureAlimtalkNotification(pool, {
      sessionId: 'missing',
      accessSql: 's.id = $1',
      accessParams: (id) => [id],
    })
    assert.equal(result.ok, false)
    assert.equal(result.status, 404)
  })
})
