import assert from 'node:assert/strict'
import test from 'node:test'
import { SMS_PUBLIC_SERVER_CONFIG_FAILED_MESSAGE } from './smsPublicMessages.js'

const ENV_KEYS = [
  'NODE_ENV',
  'RAILWAY_ENVIRONMENT',
  'GOV_SIGNATURE_OTP_SMS_MOCK',
  'ALIGO_API_KEY',
  'ALIGO_USER_ID',
  'ALIGO_SENDER',
  'ALIGO_TEST_MODE',
  'SMS_HTTP_GATEWAY_URL',
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

async function importFreshGovSmsSend() {
  const stamp = `${Date.now()}-${Math.random()}`
  return import(`./governmentSignatureSelfSmsSend.js?test=${stamp}`)
}

test('sendGovernmentSignatureSelfSmsOtp — production without EC2 relay returns unconfigured (Aligo creds ignored)', async () => {
  await withEnv(
    {
      NODE_ENV: 'production',
      RAILWAY_ENVIRONMENT: 'production',
      ALIGO_API_KEY: 'key',
      ALIGO_USER_ID: 'user',
      ALIGO_SENDER: '01012345678',
      ALIGO_TEST_MODE: 'Y',
      SMS_HTTP_GATEWAY_URL: '',
    },
    async () => {
      const { sendGovernmentSignatureSelfSmsOtp } = await importFreshGovSmsSend()
      const result = await sendGovernmentSignatureSelfSmsOtp({
        phoneDigits: '01012345678',
        code: '123456',
        purpose: 'gov_signature',
      })
      assert.equal(result.ok, false)
      assert.equal(result.error, 'sms_provider_unconfigured')
      assert.equal(result.publicMessage, SMS_PUBLIC_SERVER_CONFIG_FAILED_MESSAGE)
    },
  )
})

test('sendGovernmentSignatureSelfSmsOtp — live mode uses EC2 relay when ALIGO_TEST_MODE=N', async () => {
  await withEnv(
    {
      NODE_ENV: 'production',
      RAILWAY_ENVIRONMENT: 'production',
      ALIGO_API_KEY: 'key',
      ALIGO_USER_ID: 'user',
      ALIGO_SENDER: '01012345678',
      ALIGO_TEST_MODE: 'N',
      SMS_HTTP_GATEWAY_URL: 'http://127.0.0.1:9/unreachable-sms-gateway',
    },
    async () => {
      const { sendGovernmentSignatureSelfSmsOtp } = await importFreshGovSmsSend()
      const result = await sendGovernmentSignatureSelfSmsOtp({
        phoneDigits: '01012345678',
        code: '123456',
        purpose: 'gov_signature',
      })
      assert.equal(result.ok, false)
      assert.equal(result.error, 'sms_send_failed')
      assert.equal(result.publicMessage, SMS_PUBLIC_SERVER_CONFIG_FAILED_MESSAGE)
    },
  )
})

test('sendGovernmentSignatureSelfSmsOtp — missing relay in production returns unconfigured error', async () => {
  await withEnv(
    {
      NODE_ENV: 'production',
      RAILWAY_ENVIRONMENT: 'production',
      ALIGO_TEST_MODE: 'N',
      ALIGO_API_KEY: '',
      ALIGO_USER_ID: '',
      ALIGO_SENDER: '',
      SMS_HTTP_GATEWAY_URL: '',
    },
    async () => {
      const { sendGovernmentSignatureSelfSmsOtp } = await importFreshGovSmsSend()
      const result = await sendGovernmentSignatureSelfSmsOtp({
        phoneDigits: '01012345678',
        code: '123456',
        purpose: 'gov_signature',
      })
      assert.equal(result.ok, false)
      assert.equal(result.error, 'sms_provider_unconfigured')
      assert.equal(result.publicMessage, SMS_PUBLIC_SERVER_CONFIG_FAILED_MESSAGE)
    },
  )
})

test('sendGovernmentSignatureSelfSmsOtp — invalid params rejected', async () => {
  const { sendGovernmentSignatureSelfSmsOtp } = await import('./governmentSignatureSelfSmsSend.js')
  const result = await sendGovernmentSignatureSelfSmsOtp({
    phoneDigits: '',
    code: '12',
    purpose: 'gov_signature',
  })
  assert.equal(result.ok, false)
  assert.equal(result.error, 'invalid_send_params')
})
