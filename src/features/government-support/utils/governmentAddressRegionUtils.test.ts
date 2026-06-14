import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  filterGovernmentProfilesByRegion,
  getGovernmentProfileAddress,
  groupGovernmentProfilesByRegion,
  parseGovernmentRegionFromAddress,
} from './governmentAddressRegionUtils'
import type { GovSupportProfile } from '../types/governmentProfile.types'

function profile(partial: Partial<GovSupportProfile> & Pick<GovSupportProfile, 'id'>): GovSupportProfile {
  return {
    id: partial.id,
    tenantId: 't1',
    customerName: partial.customerName ?? '홍길동',
    phone: partial.phone ?? '010-1234-5678',
    carrier: '',
    ssn: '',
    homeAddress: partial.homeAddress ?? '',
    homeType: '',
    deposit: '',
    monthlyRent: '',
    creditScore1: '',
    creditScore2: '',
    businessName: partial.businessName ?? '테스트 사업장',
    businessOpenedAt: '',
    businessNumber: partial.businessNumber ?? '',
    businessAddress: partial.businessAddress ?? '',
    businessCategory: '',
    businessType: '',
    businessForm: '',
    businessPhone: '',
    productName: '',
    availableProduct: '',
    progressStatus: partial.progressStatus ?? '서류준비중',
    scheduleAt: '',
    agencyOrg: '',
    assigneeUserId: null,
    region: '',
    note: '',
    specialNote: '',
    vatReport: '',
    annualIncome: '',
    incomeCert: '',
    taxArrears: '',
    requiredFunds: '',
    fee: '',
    certDelegate: '',
    certType: '',
    delegateStatus: '',
    delegationMemo: '',
    edocStatus: partial.edocStatus ?? '',
    docStatus: partial.docStatus ?? '',
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt,
  }
}

describe('parseGovernmentRegionFromAddress', () => {
  it('parses Seoul address with postal prefix', () => {
    const parsed = parseGovernmentRegionFromAddress('(04991) 서울 광진구 광나루로 447')
    assert.equal(parsed.sido, '서울특별시')
    assert.equal(parsed.sigungu, '광진구')
    assert.equal(parsed.groupLabel, '서울특별시 광진구')
  })

  it('parses Gyeongnam Changwon Masan district', () => {
    const parsed = parseGovernmentRegionFromAddress('경남 창원시 마산회원구 중앙동 123')
    assert.equal(parsed.sido, '경상남도')
    assert.equal(parsed.sigungu, '창원시')
    assert.equal(parsed.eupmyeondong, '마산회원구')
    assert.equal(parsed.groupLabel, '경상남도 창원시 마산회원구')
  })

  it('parses full province name with Masan HapPo', () => {
    const parsed = parseGovernmentRegionFromAddress('경상남도 창원시 마산합포구 합포로 1')
    assert.equal(parsed.eupmyeondong, '마산합포구')
  })

  it('returns no-address group for empty input', () => {
    const parsed = parseGovernmentRegionFromAddress('')
    assert.equal(parsed.hasAddress, false)
    assert.equal(parsed.groupLabel, '주소 없음')
  })
})

describe('groupGovernmentProfilesByRegion', () => {
  it('groups profiles and keeps no-address group', () => {
    const rows = [
      profile({ id: '1', businessAddress: '서울특별시 강남구 테헤란로 1' }),
      profile({ id: '2', businessAddress: '서울 강남구 역삼동 2' }),
      profile({ id: '3', businessAddress: '' }),
    ]
    const groups = groupGovernmentProfilesByRegion(rows)
    assert.ok(groups.some((g) => g.label === '주소 없음' && g.count === 1))
    assert.ok(groups.some((g) => g.label.includes('강남구') && g.count === 2))
  })
})

describe('filterGovernmentProfilesByRegion', () => {
  it('filters by masan keyword across districts', () => {
    const rows = [
      profile({ id: '1', businessAddress: '경남 창원시 마산회원구 중앙동' }),
      profile({ id: '2', businessAddress: '경상남도 창원시 마산합포구 합포로' }),
      profile({ id: '3', businessAddress: '서울특별시 강남구' }),
    ]
    const filtered = filterGovernmentProfilesByRegion(rows, {
      searchQuery: '마산',
      sido: '',
      sigungu: '',
      eupmyeondong: '',
      progressStatus: '',
      docStatus: '',
      sort: 'region',
    })
    assert.equal(filtered.length, 2)
  })

  it('filters by sido select', () => {
    const rows = [
      profile({ id: '1', businessAddress: '서울특별시 강남구' }),
      profile({ id: '2', businessAddress: '부산 해운대구' }),
    ]
    const filtered = filterGovernmentProfilesByRegion(rows, {
      searchQuery: '',
      sido: '서울특별시',
      sigungu: '',
      eupmyeondong: '',
      progressStatus: '',
      docStatus: '',
      sort: 'region',
    })
    assert.equal(filtered.length, 1)
    assert.equal(getGovernmentProfileAddress(filtered[0]), '서울특별시 강남구')
  })
})
