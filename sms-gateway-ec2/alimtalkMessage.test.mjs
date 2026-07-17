import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGovernmentAlimtalkApprovedMessage,
  resolveAlimtalkMessageVariables,
} from './alimtalkMessage.mjs'
import { buildAligoAlimtalkForm } from './alimtalkProvider.mjs'

describe('alimtalkMessage', () => {
  it('승인 템플릿 본문 치환 (추가 필드 없음)', () => {
    const msg = buildGovernmentAlimtalkApprovedMessage({
      customerName: '홍길동',
      managerName: '박성용',
      managerPhone: '01012345678',
    })
    assert.match(msg, /^홍길동님, 전자서명을 요청드립니다\./)
    assert.match(msg, /요청 담당자: 박성용/)
    assert.match(msg, /문의 연락처: 01012345678/)
    assert.equal(msg.includes('서명기한'), false)
    assert.equal(msg.includes('업체'), false)
    assert.equal(msg.includes('government/sign'), false)
  })

  it('Aligo form 은 failover=N · testMode=N · sender 포함', () => {
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
    assert.equal(form.get('failover'), 'N')
    assert.equal(form.get('testMode'), 'N')
    assert.equal(form.get('sender'), '01022221382')
    assert.equal(form.get('tpl_code'), 'UJ_4754')
    assert.equal(form.get('subject_1'), '전자서명')
    assert.match(String(form.get('message_1')), /홍길동님/)
    const button = JSON.parse(String(form.get('button_1')))
    assert.equal(button.button[0].name, '전자서명하기')
    assert.match(button.button[0].linkMo, /\/government\/sign\/tok$/)
  })

  it('변수 resolve', () => {
    const v = resolveAlimtalkMessageVariables({
      customerName: ' A ',
      managerName: 'B',
      managerPhone: '010',
      signToken: 't',
      companyName: '무시',
    })
    assert.equal(v.customerName, 'A')
    assert.equal(Object.prototype.hasOwnProperty.call(v, 'companyName'), false)
  })
})
