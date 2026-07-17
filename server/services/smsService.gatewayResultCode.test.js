import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'

const ENV_KEYS = [
  'NODE_ENV',
  'RAILWAY_ENVIRONMENT',
  'SMS_HTTP_GATEWAY_URL',
  'SMS_GATEWAY_HEALTH_CHECK',
  'ALIGO_API_KEY',
  'ALIGO_USER_ID',
  'ALIGO_SENDER',
  'ALIGO_TEST_MODE',
]

async function withEnv(overrides, fn) {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]))
  try {
    for (const key of ENV_KEYS) {
      if (overrides[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = overrides[key]
      }
    }
    return await fn()
  } finally {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = saved[key]
      }
    }
  }
}

async function importFreshSmsService() {
  const stamp = `${Date.now()}-${Math.random()}`
  return import(`./smsService.js?test=${stamp}`)
}

function listenOnce(handler) {
  const server = http.createServer(handler)
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      resolve({
        server,
        url: `http://127.0.0.1:${addr.port}/send-sms`,
      })
    })
  })
}

test('sendVerificationCode — gateway HTTP 200 with Aligo result_code=-102 is failure', async () => {
  let hits = 0
  const { server, url } = await listenOnce((_req, res) => {
    hits += 1
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ result_code: -102, message: 'API 인증오류입니다.' }))
  })
  try {
    await withEnv(
      {
        NODE_ENV: 'production',
        RAILWAY_ENVIRONMENT: 'develop',
        SMS_HTTP_GATEWAY_URL: url,
        SMS_GATEWAY_HEALTH_CHECK: 'false',
        ALIGO_TEST_MODE: 'N',
      },
      async () => {
        const { sendVerificationCode } = await importFreshSmsService()
        const result = await sendVerificationCode({
          phoneNumber: '01012345678',
          code: '123456',
          purpose: 'gov_signature',
          relayOnly: true,
        })
        assert.equal(result.success, false)
        assert.equal(result.sent, false)
        assert.equal(result.deliveryMode, 'live')
        assert.ok(hits >= 1)
      },
    )
  } finally {
    server.close()
  }
})

test('sendVerificationCode — gateway HTTP 200 with Aligo result_code=1 is success', async () => {
  let hits = 0
  const { server, url } = await listenOnce((_req, res) => {
    hits += 1
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ result_code: 1, message: 'success', msg_id: '1' }))
  })
  try {
    await withEnv(
      {
        NODE_ENV: 'production',
        RAILWAY_ENVIRONMENT: 'develop',
        SMS_HTTP_GATEWAY_URL: url,
        SMS_GATEWAY_HEALTH_CHECK: 'false',
        ALIGO_TEST_MODE: 'N',
      },
      async () => {
        const { sendVerificationCode } = await importFreshSmsService()
        const result = await sendVerificationCode({
          phoneNumber: '01012345678',
          code: '654321',
          purpose: 'gov_signature',
          relayOnly: true,
        })
        assert.equal(result.success, true)
        assert.equal(result.sent, true)
        assert.equal(result.deliveryMode, 'live')
        assert.equal(hits, 1)
      },
    )
  } finally {
    server.close()
  }
})
