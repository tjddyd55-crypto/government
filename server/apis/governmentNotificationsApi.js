/**
 * 정부지원 CRM — 운영 알림 API.
 */
import { createGovernmentSupportGuards } from '../lib/governmentSupport/governmentAccess.js'
import { canAccessGovernmentOperationalDashboard } from '../lib/governmentSupport/governmentAdminDashboard.js'
import {
  countUnreadGovSupportNotifications,
  loadGovSupportNotificationsForAdmin,
  markAllGovSupportNotificationsRead,
  markGovSupportNotificationRead,
} from '../lib/governmentSupport/governmentNotifications.js'

const LIST_LIMIT_DEFAULT = 20
const LIST_LIMIT_MAX = 50

/**
 * @param {import('express').Router} apiRouter
 * @param {{ pool: import('pg').Pool, requireAuth: Function, handleDbError: Function }} deps
 */
export function registerGovernmentNotificationsApi(apiRouter, deps) {
  const { pool, handleDbError } = deps
  const { requireGovernmentMember } = createGovernmentSupportGuards(pool, deps)

  const requireOperationalNotifications = [
    ...requireGovernmentMember,
    (req, res, next) => {
      if (!canAccessGovernmentOperationalDashboard(req.platformContext)) {
        res.status(403).json({ message: '알림 권한이 없습니다.' })
        return
      }
      next()
    },
  ]

  apiRouter.get('/government-support/admin/notifications/unread-count', ...requireOperationalNotifications, async (req, res) => {
    try {
      const result = await countUnreadGovSupportNotifications(pool, req.platformContext)
      if (!result.ok) {
        res.status(result.status).json({ message: result.message })
        return
      }
      res.json({ success: true, count: result.count })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get('/government-support/admin/notifications', ...requireOperationalNotifications, async (req, res) => {
    try {
      const limRaw = Number(req.query?.limit ?? LIST_LIMIT_DEFAULT)
      const limit = Math.min(
        LIST_LIMIT_MAX,
        Math.max(1, Number.isFinite(limRaw) ? Math.floor(limRaw) : LIST_LIMIT_DEFAULT),
      )
      const result = await loadGovSupportNotificationsForAdmin(pool, req.platformContext, { limit })
      if (!result.ok) {
        res.status(result.status).json({ message: result.message })
        return
      }
      res.json({ success: true, notifications: result.notifications })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.patch('/government-support/admin/notifications/read-all', ...requireOperationalNotifications, async (req, res) => {
    try {
      const result = await markAllGovSupportNotificationsRead(pool, req.platformContext)
      if (!result.ok) {
        res.status(result.status).json({ message: result.message })
        return
      }
      res.json({ success: true, updated: result.updated })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.patch('/government-support/admin/notifications/:notificationId/read', ...requireOperationalNotifications, async (req, res) => {
    try {
      const notificationId = String(req.params.notificationId ?? '').trim()
      const result = await markGovSupportNotificationRead(pool, req.platformContext, notificationId)
      if (!result.ok) {
        res.status(result.status).json({ message: result.message })
        return
      }
      res.json({ success: true })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })
}
