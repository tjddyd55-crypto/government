import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertCanArchiveGovernmentAgency,
  isSesungAgencyTenant,
  mapGovernmentAgencyRow,
  parseGovernmentAgencyPatchBody,
} from './governmentAgencies.js'

describe('governmentAgencies', () => {
  it('isSesungAgencyTenant detects 세승', () => {
    assert.equal(isSesungAgencyTenant({ name: '세승', code: 'ABC' }), true)
    assert.equal(isSesungAgencyTenant({ name: '서울센터', code: 'SESUNG01' }), false)
    assert.equal(isSesungAgencyTenant({ name: '테스트', code: '세승코드' }), true)
  })

  it('mapGovernmentAgencyRow reads config.governmentAgency', () => {
    const row = mapGovernmentAgencyRow({
      id: '12',
      code: 'ABC',
      name: '테스트 대행사',
      status: 'active',
      config: {
        governmentAgency: {
          representativeName: '홍길동',
          contactPhone: '010-1234-5678',
          registrationCodeEnabled: false,
        },
      },
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    })
    assert.equal(row.representativeName, '홍길동')
    assert.equal(row.contactPhone, '010-1234-5678')
    assert.equal(row.registrationCodeEnabled, false)
  })

  it('parseGovernmentAgencyPatchBody rejects empty patch', () => {
    const result = parseGovernmentAgencyPatchBody({})
    assert.equal(result.ok, false)
  })

  it('parseGovernmentAgencyPatchBody accepts name and gov fields', () => {
    const result = parseGovernmentAgencyPatchBody({
      name: '새 이름',
      memo: '메모',
      registrationCodeEnabled: true,
    })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.patch.name, '새 이름')
      assert.deepEqual(result.patch.governmentAgency, {
        memo: '메모',
        registrationCodeEnabled: true,
      })
    }
  })

  it('assertCanArchiveGovernmentAgency blocks 세승', () => {
    const guard = assertCanArchiveGovernmentAgency({ name: '세승', code: 'SS01', status: 'active' })
    assert.equal(guard.ok, false)
    assert.equal(guard.status, 409)
  })

  it('assertCanArchiveGovernmentAgency blocks actor tenant', () => {
    const guard = assertCanArchiveGovernmentAgency(
      { id: '9', name: '테스트', code: 'ABC', status: 'active' },
      { tenantId: '9', actorTenantIds: ['9'] },
    )
    assert.equal(guard.ok, false)
    assert.equal(guard.status, 409)
  })
})
