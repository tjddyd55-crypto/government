import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  AGENCY_STAFF_CONFIRM_VALUE,
  AGENCY_STAFF_ROLES,
  isAgencyStaffDeleteCandidate,
  isAgencyStaffDummyUser,
  parseAgencyStaffCleanupArgv,
  resolveBootstrapAdminUsernames,
} from './governmentAgencyStaffCleanup.js'

describe('governmentAgencyStaffCleanup', () => {
  it('parseAgencyStaffCleanupArgv: default is dry-run', () => {
    assert.deepEqual(parseAgencyStaffCleanupArgv([]), { dryRun: true, execute: false })
    assert.deepEqual(parseAgencyStaffCleanupArgv(['--execute']), { dryRun: false, execute: true })
  })

  it('AGENCY_STAFF_CONFIRM_VALUE is stable contract', () => {
    assert.equal(AGENCY_STAFF_CONFIRM_VALUE, 'DELETE_NON_SESUNG_AGENCY_STAFF')
  })

  it('isAgencyStaffDummyUser detects e2e and agencyadm patterns', () => {
    assert.equal(isAgencyStaffDummyUser({ username: 'e2e_aa_sig_test' }), true)
    assert.equal(isAgencyStaffDummyUser({ username: 'agencyadm36' }), true)
    assert.equal(isAgencyStaffDummyUser({ username: 'staff01' }), false)
    assert.equal(isAgencyStaffDummyUser({ username: 'tjddyd77' }), false)
  })

  it('isAgencyStaffDeleteCandidate preserves sesung non-dummy staff', () => {
    const row = { legacy_role: 'USER', username: 'staff01', display_name: '세승관리자' }
    const memberships = [
      { role: 'government_agency_admin', tenantId: '69', tenantExists: true },
    ]
    const decision = isAgencyStaffDeleteCandidate(row, '69', memberships)
    assert.equal(decision.delete, false)
    assert.equal(decision.reason, 'sesung_non_dummy_staff')
  })

  it('isAgencyStaffDeleteCandidate deletes dummy staff on sesung tenant', () => {
    const row = { legacy_role: 'USER', username: 'e2e_st_sig_test', display_name: 'e2e_st_sig_test' }
    const memberships = [{ role: 'government_staff', tenantId: '69', tenantExists: true }]
    const decision = isAgencyStaffDeleteCandidate(row, '69', memberships)
    assert.equal(decision.delete, true)
    assert.equal(decision.reason, 'dummy_username_or_display_name')
  })

  it('isAgencyStaffDeleteCandidate deletes non-sesung tenant staff', () => {
    const row = { legacy_role: 'USER', username: 'partner36_admin', display_name: '대행사36' }
    const memberships = [{ role: 'government_agency_admin', tenantId: '36', tenantExists: false }]
    const decision = isAgencyStaffDeleteCandidate(row, '69', memberships)
    assert.equal(decision.delete, true)
    assert.equal(decision.reason, 'non_sesung_tenant_membership')
  })

  it('isAgencyStaffDeleteCandidate deletes orphan memberships', () => {
    const row = { legacy_role: 'USER', username: 'orphan_staff', display_name: 'orphan' }
    const memberships = [{ role: 'government_staff', tenantId: null, tenantExists: false }]
    const decision = isAgencyStaffDeleteCandidate(row, '69', memberships)
    assert.equal(decision.delete, true)
    assert.equal(decision.reason, 'orphan_tenant_membership')
  })

  it('resolveBootstrapAdminUsernames includes admin fallback', () => {
    const names = resolveBootstrapAdminUsernames()
    assert.ok(names.includes('admin'))
  })

  it('AGENCY_STAFF_ROLES matches admin users API roles', () => {
    assert.deepEqual(AGENCY_STAFF_ROLES, ['government_agency_admin', 'government_staff'])
  })
})
