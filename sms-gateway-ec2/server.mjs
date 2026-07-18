/**
 * 운영 시 실제 SMS 업체(알리고 등) 호출 로직을 이 파일에 연결하세요.
 * 메인 앱은 SMS_HTTP_GATEWAY_URL 로 이 서버에 { phone, message } JSON POST 합니다.
 *
 * 알림톡(정부지원 전자서명): POST /send-alimtalk — 기존 /send-sms 와 독립.
 * 알림톡(계정 인증번호 UJ_6183): POST /send-auth-alimtalk — 버튼 없음, 전자서명과 분리.
 * env: ALIMTALK_RELAY_AUTH_TOKEN, ALIMTALK_DRY_RUN,
 *      ALIGO_KAKAO_API_KEY, ALIGO_KAKAO_USER_ID, ALIGO_KAKAO_SENDER_KEY,
 *      ALIGO_SENDER (발신번호만 재사용), GOVERNMENT_ALIMTALK_TEMPLATE_CODE
 *
 * 헬스체크: GET /health → { "status": "ok" }
 */
import express from 'express'
import { createAlimtalkHandler } from './alimtalkHandler.mjs'
import { createAuthAlimtalkHandler } from './alimtalkAuthHandler.mjs'

const PORT = Number(process.env.PORT ?? 3080)

const app = express()
app.use(express.json({ limit: '32kb' }))

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

const smsHandler = async (req, res) => {
  const phone = String(req.body?.phone ?? '').trim()
  const message = String(req.body?.message ?? '').trim()
  if (!phone || !message) {
    res.status(400).json({ error: 'phone and message required' })
    return
  }

  // TODO: 여기서 알리고·AWS SNS 등 실제 발송
  if (String(process.env.SMS_GATEWAY_STUB_OK ?? '').trim() === 'true') {
    res.status(200).json({ ok: true, stub: true })
    return
  }

  res.status(501).json({ error: 'SMS provider not wired; set SMS_GATEWAY_STUB_OK=true for smoke test' })
}

app.post('/', smsHandler)
app.post('/send-sms', smsHandler)

app.post('/send-alimtalk', createAlimtalkHandler())
app.post('/send-auth-alimtalk', createAuthAlimtalkHandler())

app.listen(PORT, () => {
  console.log(`[sms-gateway-ec2] listening on ${PORT}`)
})
