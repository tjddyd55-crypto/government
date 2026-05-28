import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessGovernmentOperationalDashboard,
  loadGovernmentAdminDashboardSummary,
} from './governmentAdminDashboard.js'

describe('canAccessGovernmentOperationalDashboard', () => {
  it('program user: denied', () => {
    assert.equal(
      canAccessGovernmentOperationalDashboard({
        governmentProgramUserTenantIds: ['1'],
      }),
      false,
    )
  })

  it('industry admin (non-super): denied', () => {
    assert.equal(
      canAccessGovernmentOperationalDashboard({
        governmentIndustryAdminIndustryIds: ['3'],
      }),
      false,
    )
  })

  it('staff: allowed', () => {
    assert.equal(
      canAccessGovernmentOperationalDashboard({
        governmentStaffTenantIds: ['12'],
      }),
      true,
    )
  })

  it('agency admin: allowed', () => {
    assert.equal(
      canAccessGovernmentOperationalDashboard({
        governmentAgencyAdminTenantIds: ['15'],
      }),
      true,
    )
  })
})

describe('loadGovernmentAdminDashboardSummary', () => {
  it('returns 403 for program user', async () => {
    const pool = { query: async () => ({ rows: [] }) }
    const r = await loadGovernmentAdminDashboardSummary(pool, {
      governmentProgramUserTenantIds: ['1'],
    })
    assert.equal(r.ok, false)
    assert.equal(r.status, 403)
  })

  it('scopes tenant ids for staff', async () => {
    const queries = []
    const pool = {
      query: async (sql, params) => {
        queries.push({ sql: String(sql), params })
        if (String(sql).includes('pending_document_requests')) {
          return {
            rows: [
              {
                pending_document_requests: 2,
                submitted_document_requests: 1,
                open_inquiries: 3,
                unanswered_inquiries: 3,
                sent_signatures: 4,
                completed_signatures: 5,
                completed_signatures_needing_review: 1,
                cancelled_signatures: 0,
                expired_signatures: 1,
                program_users_count: 10,
                profiles_count: 3,
              },
            ],
          }
        }
        return { rows: [] }
      },
    }
    const r = await loadGovernmentAdminDashboardSummary(pool, {
      governmentStaffTenantIds: ['36'],
      governmentAgencyAdminTenantIds: [],
    })
    assert.equal(r.ok, true)
    assert.equal(r.data.pendingDocumentRequests, 2)
    assert.equal(r.data.programUsersCount, 10)
    assert.equal(typeof r.data.profilesCount, 'number')
    const countQuery = queries.find((q) => q.sql.includes('pending_document_requests'))
    assert.ok(countQuery)
    assert.deepEqual(countQuery.params[0], ['36'])
  })
})
