/**
 * 정부지원 CRM — 대행사 운영 대시보드 summary API.
 */
import { createGovernmentSupportGuards } from '../lib/governmentSupport/governmentAccess.js'
import {
  canAccessGovernmentOperationalDashboard,
  loadGovernmentAdminDashboardSummary,
} from '../lib/governmentSupport/governmentAdminDashboard.js'

/**
 * @param {import('express').Router} apiRouter
 * @param {{ pool: import('pg').Pool, requireAuth: Function, handleDbError: Function }} deps
 */
export function registerGovernmentAdminDashboardApi(apiRouter, deps) {
  const { pool, handleDbError } = deps
  const { requireGovernmentMember } = createGovernmentSupportGuards(pool, deps)

  const requireOperationalDashboard = [
    ...requireGovernmentMember,
    (req, res, next) => {
      if (!canAccessGovernmentOperationalDashboard(req.platformContext)) {
        res.status(403).json({ message: '운영 대시보드 권한이 없습니다.' })
        return
      }
      next()
    },
  ]

  apiRouter.get('/government-support/admin/dashboard/summary', ...requireOperationalDashboard, async (req, res) => {
    try {
      const result = await loadGovernmentAdminDashboardSummary(pool, req.platformContext)
      if (!result.ok) {
        res.status(result.status).json({ message: result.message })
        return
      }
      res.json({ success: true, data: result.data })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })
}
