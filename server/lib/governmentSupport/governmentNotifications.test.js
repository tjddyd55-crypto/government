import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createGovSupportNotifications,
  loadGovSupportNotificationsForAdmin,
  markAllGovSupportNotificationsRead,
  markGovSupportNotificationRead,
  mapGovSupportNotificationRow,
} from './governmentNotifications.js'

describe('mapGovSupportNotificationRow', () => {
  it('maps read_at to isRead', () => {
    const row = mapGovSupportNotificationRow({
      id: 1,
      tenant_id: 12,
      recipient_user_id: 'u1',
      actor_user_id: 'u2',
      owner_user_id: 'u2',
      profile_id: 3,
      event_type: 'inquiry_created',
      title: '새 문의',
      message: 'test',
      target_type: 'inquiry',
      target_id: '9',
      target_url: '/government/admin/inquiries',
      read_at: null,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    })
    assert.equal(row.isRead, false)
    assert.equal(row.eventType, 'inquiry_created')
  })
})

describe('createGovSupportNotifications', () => {
  it('inserts one row per operational user', async () => {
    const inserts = []
    const pool = {
      query: async (sql, params) => {
        const s = String(sql)
        if (s.includes('SELECT DISTINCT m.user_id')) {
          return { rows: [{ user_id: 'staff1' }, { user_id: 'admin1' }] }
        }
        if (s.includes('INSERT INTO gov_support_notifications')) {
          inserts.push(params)
          return {
            rows: [
              {
                id: inserts.length,
                tenant_id: params[0],
                recipient_user_id: params[1],
                actor_user_id: params[2],
                owner_user_id: params[3],
                profile_id: params[4],
                event_type: params[5],
                title: params[6],
                message: params[7],
                target_type: params[8],
                target_id: params[9],
                target_url: params[10],
                read_at: null,
                created_at: new Date(),
              },
            ],
          }
        }
        return { rows: [] }
      },
    }
    const rows = await createGovSupportNotifications(pool, {
      tenantId: 12,
      actorUserId: 'userA',
      eventType: 'inquiry_created',
      title: '새 문의',
      message: 'msg',
      targetType: 'inquiry',
      targetId: '1',
      targetUrl: '/government/admin/inquiries',
    })
    assert.equal(rows.length, 2)
    assert.equal(inserts.length, 2)
  })
})

describe('loadGovSupportNotificationsForAdmin', () => {
  it('returns 403 for program user', async () => {
    const pool = { query: async () => ({ rows: [] }) }
    const r = await loadGovSupportNotificationsForAdmin(pool, {
      userId: 'u1',
      governmentProgramUserTenantIds: ['1'],
    })
    assert.equal(r.ok, false)
    assert.equal(r.status, 403)
  })

  it('scopes by recipient and tenant', async () => {
    let listSql = ''
    const pool = {
      query: async (sql, params) => {
        const s = String(sql)
        if (s.includes('FROM tenants')) {
          return { rows: [{ id: 12 }] }
        }
        if (s.includes('gov_support_notifications')) {
          listSql = s
          assert.deepEqual(params[0], 'staff1')
          return {
            rows: [
              {
                id: 5,
                tenant_id: 12,
                recipient_user_id: 'staff1',
                event_type: 'document_request_submitted',
                title: 't',
                message: 'm',
                target_type: 'document_request',
                target_id: '1',
                target_url: '/government/admin/document-requests',
                read_at: null,
                created_at: new Date(),
              },
            ],
          }
        }
        return { rows: [{ id: 12 }] }
      },
    }
    const r = await loadGovSupportNotificationsForAdmin(pool, {
      userId: 'staff1',
      governmentStaffTenantIds: ['12'],
    })
    assert.equal(r.ok, true)
    assert.equal(r.notifications.length, 1)
    assert.match(listSql, /recipient_user_id/)
  })
})

describe('markGovSupportNotificationRead', () => {
  it('returns 404 when not owned', async () => {
    const pool = {
      query: async (sql) => {
        if (String(sql).includes('UPDATE gov_support_notifications')) {
          return { rowCount: 0, rows: [] }
        }
        return { rows: [{ id: 12 }] }
      },
    }
    const r = await markGovSupportNotificationRead(pool, {
      userId: 'staff1',
      governmentStaffTenantIds: ['12'],
    }, '99')
    assert.equal(r.ok, false)
    assert.equal(r.status, 404)
  })
})

describe('markAllGovSupportNotificationsRead', () => {
  it('updates unread rows', async () => {
    const pool = {
      query: async (sql) => {
        if (String(sql).includes('UPDATE gov_support_notifications')) {
          return { rowCount: 3 }
        }
        return { rows: [{ id: 12 }] }
      },
    }
    const r = await markAllGovSupportNotificationsRead(pool, {
      userId: 'staff1',
      governmentStaffTenantIds: ['12'],
    })
    assert.equal(r.ok, true)
    assert.equal(r.updated, 3)
  })
})
