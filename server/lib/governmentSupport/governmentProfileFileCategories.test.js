import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  GOV_PROFILE_FILE_CATEGORY_NAME_MAX,
  mapGovSupportProfileFileCategoryRow,
  normalizeGovProfileFileCategoryName,
  parseGovProfileFileCategoryPatchBody,
} from './governmentProfileFileCategories.js'
import { canAccessGovernmentProfile } from './governmentAccess.js'

describe('normalizeGovProfileFileCategoryName', () => {
  it('빈 이름 거부', () => {
    const r = normalizeGovProfileFileCategoryName('   ')
    assert.equal(r.ok, false)
    assert.equal(r.status, 400)
  })

  it('최대 길이 초과 trim', () => {
    const r = normalizeGovProfileFileCategoryName('가'.repeat(GOV_PROFILE_FILE_CATEGORY_NAME_MAX + 5))
    assert.equal(r.ok, true)
    assert.equal(r.name.length, GOV_PROFILE_FILE_CATEGORY_NAME_MAX)
  })

  it('유효 이름 허용', () => {
    const r = normalizeGovProfileFileCategoryName('  가입 서류  ')
    assert.equal(r.ok, true)
    assert.equal(r.name, '가입 서류')
  })
})

describe('parseGovProfileFileCategoryPatchBody', () => {
  it('빈 patch 거부', () => {
    const r = parseGovProfileFileCategoryPatchBody({})
    assert.equal(r.ok, false)
  })

  it('이름·정렬 patch 허용', () => {
    const r = parseGovProfileFileCategoryPatchBody({ name: ' 변경 ', sortOrder: 3 })
    assert.equal(r.ok, true)
    assert.equal(r.patch.name, '변경')
    assert.equal(r.patch.sortOrder, 3)
  })
})

describe('mapGovSupportProfileFileCategoryRow', () => {
  it('DB 행을 API 형식으로 매핑', () => {
    const created = new Date('2026-05-19T10:00:00.000Z')
    const row = mapGovSupportProfileFileCategoryRow({
      id: 9,
      tenant_id: 36,
      profile_id: 12,
      owner_user_id: 'u1',
      name: '가입 서류',
      sort_order: 2,
      created_by_user_id: 'u1',
      updated_by_user_id: 'u1',
      created_at: created,
      updated_at: created,
      archived_at: null,
    })
    assert.equal(row.id, '9')
    assert.equal(row.profileId, '12')
    assert.equal(row.name, '가입 서류')
    assert.equal(row.sortOrder, 2)
  })
})

describe('canAccessGovernmentProfile — file category API 권한 기준', () => {
  it('program user: 본인 owner만 허용', () => {
    const ctx = { userId: 'uA', governmentProgramUserTenantIds: ['1'] }
    assert.equal(canAccessGovernmentProfile(ctx, { tenant_id: '1', owner_user_id: 'uA' }), true)
    assert.equal(canAccessGovernmentProfile(ctx, { tenant_id: '1', owner_user_id: 'uB' }), false)
  })
})
