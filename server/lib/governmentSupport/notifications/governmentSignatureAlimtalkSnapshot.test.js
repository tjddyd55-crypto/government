import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGovernmentSignaturePublicSignUrl,
  sanitizeAlimtalkSnapshot,
  validateInternalAlimtalkVariables,
} from './governmentSignatureAlimtalkSnapshot.js'

describe('governmentSignatureAlimtalkSnapshot', () => {
  it('공개 URL 생성', () => {
    const url = buildGovernmentSignaturePublicSignUrl('abc123', 'https://app.example.com')
    assert.equal(url, 'https://app.example.com/government/sign/abc123')
  })

  it('내부 변수 검증 — 승인 4변수만', () => {
    const ok = validateInternalAlimtalkVariables({
      customerName: '홍길동',
      managerName: '김담당',
      managerPhone: '0212345678',
      signToken: 'tok-abc',
    })
    assert.equal(ok.ok, true)
  })

  it('고객명 누락', () => {
    const r = validateInternalAlimtalkVariables({
      customerName: '',
      managerName: '김담당',
      managerPhone: '0212345678',
      signToken: 'tok-abc',
    })
    assert.equal(r.ok, false)
    assert.equal(r.errorCategory, 'missing_customer_name')
  })

  it('전자서명토큰 누락', () => {
    const r = validateInternalAlimtalkVariables({
      customerName: '홍길동',
      managerName: '김담당',
      managerPhone: '0212345678',
      signToken: '',
    })
    assert.equal(r.ok, false)
    assert.equal(r.errorCategory, 'missing_sign_token')
  })

  it('snapshot 민감정보 마스킹', () => {
    const snap = sanitizeAlimtalkSnapshot({
      recipientPhone: '01012345678',
      relayAuthToken: 'secret',
      messageVariables: {
        customerName: '홍길동',
        managerPhone: '01099998888',
      },
    })
    assert.equal(String(snap.recipientPhone).includes('****'), true)
    assert.equal(snap.relayAuthToken, '[redacted]')
    assert.equal(String(/** @type {Record<string, unknown>} */ (snap.messageVariables).managerPhone).includes('****'), true)
  })
})
