import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateAlimtalkTemplateSendEligibility } from './alimtalkTemplateEligibility.mjs'
import { buildAligoAlimtalkForm } from './alimtalkProvider.mjs'
import { GOVERNMENT_ALIMTALK_SUBJECT } from './alimtalkMessage.mjs'

describe('evaluateAlimtalkTemplateSendEligibility', () => {
  it('APR + R 허용', () => {
    const r = evaluateAlimtalkTemplateSendEligibility({
      found: true,
      inspStatus: 'APR',
      status: 'R',
    })
    assert.equal(r.ok, true)
    assert.equal(r.reason, null)
  })

  it('APR + A 허용', () => {
    const r = evaluateAlimtalkTemplateSendEligibility({
      found: true,
      inspStatus: 'APR',
      status: 'A',
    })
    assert.equal(r.ok, true)
  })

  it('APR + S 차단', () => {
    const r = evaluateAlimtalkTemplateSendEligibility({
      found: true,
      inspStatus: 'APR',
      status: 'S',
    })
    assert.equal(r.ok, false)
    assert.equal(r.reason, 'template_stopped')
  })

  it('REG / REQ / REJ 차단', () => {
    for (const inspStatus of ['REG', 'REQ', 'REJ']) {
      const r = evaluateAlimtalkTemplateSendEligibility({
        found: true,
        inspStatus,
        status: 'R',
      })
      assert.equal(r.ok, false, inspStatus)
      assert.equal(r.reason, 'template_not_approved')
    }
  })

  it('템플릿 미조회 차단', () => {
    const r = evaluateAlimtalkTemplateSendEligibility({
      found: false,
      inspStatus: 'APR',
      status: 'R',
    })
    assert.equal(r.ok, false)
    assert.equal(r.reason, 'template_not_found')
  })
})

describe('subject_1 and failover contract', () => {
  it('subject_1 은 템플릿명과 동일한 전자서명', () => {
    assert.equal(GOVERNMENT_ALIMTALK_SUBJECT, '전자서명')
  })

  it('failover=N 고정 · subject_1=전자서명 · message/button 본문 계약 유지', () => {
    const form = buildAligoAlimtalkForm({
      config: {
        aligoApiKey: 'k',
        aligoUserId: 'u',
        aligoSenderKey: 'sk',
        aligoSender: '01022221382',
        governmentTemplateCode: 'UJ_4754',
      },
      recipientPhone: '01099998888',
      templateCode: 'UJ_4754',
      messageVariables: {
        customerName: '홍길동',
        managerName: '박성용',
        managerPhone: '01012345678',
        signToken: 'tok',
      },
      button: {
        name: '전자서명하기',
        mobileUrl: 'https://app-develop-9663.up.railway.app/government/sign/tok',
        pcUrl: 'https://app-develop-9663.up.railway.app/government/sign/tok',
        linkType: 'WL',
      },
    })
    assert.equal(form.get('subject_1'), '전자서명')
    assert.equal(form.get('failover'), 'N')
    assert.equal(form.get('testMode'), 'N')
    assert.match(String(form.get('message_1')), /홍길동님, 전자서명을 요청드립니다/)
    assert.match(String(form.get('message_1')), /요청 담당자: 박성용/)
    const button = JSON.parse(String(form.get('button_1')))
    assert.equal(button.button[0].name, '전자서명하기')
    assert.equal(button.button[0].linkType, 'WL')
  })
})
