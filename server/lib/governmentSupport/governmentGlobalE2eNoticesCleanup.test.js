import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  GLOBAL_E2E_NOTICE_CONFIRM_VALUE,
  GLOBAL_E2E_NOTICE_PG_PATTERN,
  parseGlobalE2eNoticesCleanupArgv,
} from './governmentGlobalE2eNoticesCleanup.js'

describe('governmentGlobalE2eNoticesCleanup', () => {
  it('parseGlobalE2eNoticesCleanupArgv: default is dry-run', () => {
    assert.deepEqual(parseGlobalE2eNoticesCleanupArgv([]), { dryRun: true, execute: false })
    assert.deepEqual(parseGlobalE2eNoticesCleanupArgv(['--dry-run']), {
      dryRun: true,
      execute: false,
    })
    assert.deepEqual(parseGlobalE2eNoticesCleanupArgv(['--execute']), {
      dryRun: false,
      execute: true,
    })
  })

  it('GLOBAL_E2E_NOTICE_CONFIRM_VALUE is stable contract', () => {
    assert.equal(GLOBAL_E2E_NOTICE_CONFIRM_VALUE, 'DELETE_GLOBAL_E2E_NOTICES')
  })

  it('GLOBAL_E2E_NOTICE_PG_PATTERN includes required tokens', () => {
    for (const token of ['E2E', 'e2e', 'smoke', 'test', 'dummy', 'sample', '테스트', '더미', '샘플']) {
      assert.match(GLOBAL_E2E_NOTICE_PG_PATTERN, new RegExp(token))
    }
  })
})
