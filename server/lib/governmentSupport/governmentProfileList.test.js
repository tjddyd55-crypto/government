import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProfileListFilterClauses,
  parseProfileListFilters,
} from './governmentProfileList.js'

describe('parseProfileListFilters', () => {
  it('검색·필터 파라미터 파싱', () => {
    const filters = parseProfileListFilters({
      q: '홍길동',
      customer_status_option_id: '12',
      business_type: '음식점',
      owner_user_id: 'u1',
    })
    assert.equal(filters.q, '홍길동')
    assert.equal(filters.customerStatusOptionId, '12')
    assert.equal(filters.businessType, '음식점')
    assert.equal(filters.ownerUserId, 'u1')
  })

  it('camelCase 별칭 지원', () => {
    const filters = parseProfileListFilters({
      search: '카페',
      customerStatusOptionId: 'none',
      businessType: '소매',
      ownerUserId: 'u2',
    })
    assert.equal(filters.q, '카페')
    assert.equal(filters.customerStatusOptionId, 'none')
    assert.equal(filters.businessType, '소매')
    assert.equal(filters.ownerUserId, 'u2')
  })
})

describe('buildProfileListFilterClauses', () => {
  it('고객상태 none 은 IS NULL', () => {
    const { clauses } = buildProfileListFilterClauses({
      q: '',
      customerStatusOptionId: 'none',
      businessType: '',
      ownerUserId: '',
    })
    assert.match(clauses.join(' '), /customer_status_option_id IS NULL/)
  })

  it('검색어가 있으면 ILIKE 절 생성', () => {
    const { clauses, params } = buildProfileListFilterClauses({
      q: 'test',
      customerStatusOptionId: '',
      businessType: '',
      ownerUserId: '',
    })
    assert.ok(clauses.length > 0)
    assert.equal(params[0], '%test%')
  })
})
