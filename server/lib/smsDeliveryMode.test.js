import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isAligoTestModeOn,
  normalizeBooleanEnv,
  resolveSmsDeliveryMode,
} from './smsDeliveryMode.js'

const ENV_KEYS = [
  'NODE_ENV',
  'RAILWAY_ENVIRONMENT',
  'ALIGO_TEST_MODE',
  'ALIGO_API_KEY',
  'ALIGO_USER_ID',
  'ALIGO_SENDER',
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

test('normalizeBooleanEnv treats Y/true/1 as true', () => {
  assert.equal(normalizeBooleanEnv('Y'), true)
  assert.equal(normalizeBooleanEnv('false'), false)
  assert.equal(normalizeBooleanEnv('N'), false)
})

test('resolveSmsDeliveryMode — explicit ALIGO_TEST_MODE=Y forces test', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      RAILWAY_ENVIRONMENT: 'production',
      ALIGO_TEST_MODE: 'Y',
      ALIGO_API_KEY: 'key',
      ALIGO_USER_ID: 'user',
      ALIGO_SENDER: '01012345678',
    },
    () => {
      assert.equal(resolveSmsDeliveryMode(), 'test')
      assert.equal(isAligoTestModeOn(), true)
    },
  )
})

test('resolveSmsDeliveryMode — explicit ALIGO_TEST_MODE=N forces live', () => {
  withEnv(
    {
      NODE_ENV: 'production',
      RAILWAY_ENVIRONMENT: 'production',
      ALIGO_TEST_MODE: 'N',
      ALIGO_API_KEY: 'key',
      ALIGO_USER_ID: 'user',
      ALIGO_SENDER: '01012345678',
    },
    () => {
      assert.equal(resolveSmsDeliveryMode(), 'live')
      assert.equal(isAligoTestModeOn(), false)
    },
  )
})

async function importFreshSmsDeliveryMode() {
  const stamp = `${Date.now()}-${Math.random()}`
  return import(`./smsDeliveryMode.js?test=${stamp}`)
}

test('resolveSmsDeliveryMode — unset ALIGO_TEST_MODE on production with credentials defaults live', async () => {
  await withEnv(
    {
      NODE_ENV: 'production',
      RAILWAY_ENVIRONMENT: 'production',
      ALIGO_API_KEY: 'key',
      ALIGO_USER_ID: 'user',
      ALIGO_SENDER: '01012345678',
    },
    async () => {
      const { resolveSmsDeliveryMode, isAligoTestModeOn } = await importFreshSmsDeliveryMode()
      assert.equal(resolveSmsDeliveryMode(), 'live')
      assert.equal(isAligoTestModeOn(), false)
    },
  )
})

test('resolveSmsDeliveryMode — unset credentials defaults test', () => {
  withEnv(
    {
      NODE_ENV: 'development',
    },
    () => {
      assert.equal(resolveSmsDeliveryMode(), 'test')
    },
  )
})

test('resolveSmsDeliveryMode — SMS_HTTP_GATEWAY_URL forces live', () => {
  withEnv(
    {
      NODE_ENV: 'development',
      ALIGO_TEST_MODE: 'Y',
      SMS_HTTP_GATEWAY_URL: 'https://sms.example/send',
    },
    () => {
      assert.equal(resolveSmsDeliveryMode(), 'live')
    },
  )
})
