import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  appendGovernmentAssigneeFilterSql,
  canManageGovernmentAssignee,
  parseGovernmentAssigneeQuery,
} from './governmentAssignees.js'

describe('parseGovernmentAssigneeQuery', () => {
  it('parses me and unassigned', () => {
    assert.deepEqual(parseGovernmentAssigneeQuery('me', 'u1'), { kind: 'me', userId: 'u1' })
    assert.deepEqual(parseGovernmentAssigneeQuery('unassigned', 'u1'), { kind: 'unassigned' })
    assert.deepEqual(parseGovernmentAssigneeQuery('', 'u1'), { kind: 'all' })
  })

  it('parses user id', () => {
    assert.deepEqual(parseGovernmentAssigneeQuery('staff-42', 'u1'), { kind: 'user', userId: 'staff-42' })
  })
})

describe('appendGovernmentAssigneeFilterSql', () => {
  it('builds me filter sql', () => {
    const params = ['t1']
    const sql = appendGovernmentAssigneeFilterSql({
      filter: { kind: 'me', userId: 'u9' },
      tableAlias: 'i',
      params,
      currentUserId: 'u9',
    })
    assert.match(sql, /assigned_to_user_id/)
    assert.equal(params.length, 2)
    assert.equal(params[1], 'u9')
  })
})

describe('canManageGovernmentAssignee', () => {
  it('staff allowed, program user denied', () => {
    assert.equal(canManageGovernmentAssignee({ governmentStaffTenantIds: ['1'] }), true)
    assert.equal(canManageGovernmentAssignee({ governmentProgramUserTenantIds: ['1'] }), false)
  })
})
