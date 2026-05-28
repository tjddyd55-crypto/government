/**
 * 정부지원 CRM — 대행사 운영 대시보드 집계 (tenant 스코프, PII 최소).
 * @module governmentAdminDashboard
 */
import { GOVERNMENT_PROGRAM_USER_ROLE } from './governmentSignup.js'
import {
  isGovernmentIndustryAdmin,
  isGovernmentProgramUser,
  isGovernmentSuperAdmin,
  resolveGovernmentTenantScopeForQuery,
} from './governmentAccess.js'
import {
  countUnreadGovSupportNotifications,
  loadGovSupportNotificationsForAdmin,
} from './governmentNotifications.js'

const RECENT_LIMIT = 5

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export function canAccessGovernmentOperationalDashboard(ctx) {
  if (isGovernmentProgramUser(ctx)) {
    return false
  }
  if (isGovernmentIndustryAdmin(ctx) && !isGovernmentSuperAdmin(ctx)) {
    return false
  }
  return (
    isGovernmentSuperAdmin(ctx) ||
    (ctx.governmentAgencyAdminTenantIds?.length ?? 0) > 0 ||
    (ctx.governmentStaffTenantIds?.length ?? 0) > 0
  )
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {string[]} tenantIds
 */
function resolveOperationalTenantIds(ctx, tenantIds) {
  if (isGovernmentSuperAdmin(ctx)) {
    return tenantIds
  }
  const allowed = new Set([
    ...(ctx.governmentAgencyAdminTenantIds ?? []).map(String),
    ...(ctx.governmentStaffTenantIds ?? []).map(String),
  ])
  return tenantIds.filter((id) => allowed.has(String(id)))
}

/**
 * @param {Record<string, unknown>} row
 */
function mapRecentDocumentRequest(row) {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    status: String(row.status ?? ''),
    profileDisplayName: String(row.profile_display_name ?? ''),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at ?? ''),
  }
}

/**
 * @param {Record<string, unknown>} row
 */
function mapRecentInquiry(row) {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    status: String(row.status ?? 'open'),
    profileDisplayName: String(row.profile_display_name ?? ''),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at ?? ''),
  }
}

/**
 * @param {Record<string, unknown>} row
 */
function mapRecentSignature(row) {
  return {
    id: String(row.id),
    status: String(row.status ?? ''),
    profileDisplayName: String(row.profile_display_name ?? ''),
    sentAt: row.sent_at instanceof Date ? row.sent_at.toISOString() : row.sent_at != null ? String(row.sent_at) : null,
    completedAt:
      row.completed_at instanceof Date ? row.completed_at.toISOString() : row.completed_at != null ? String(row.completed_at) : null,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at ?? ''),
  }
}

/**
 * @param {Record<string, unknown>} row
 */
function mapRecentProgramUser(row) {
  return {
    id: String(row.id),
    username: String(row.username ?? ''),
    displayName: String(row.display_name ?? ''),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ''),
  }
}

/**
 * @param {Record<string, unknown>} row
 */
function mapRecentProfile(row) {
  return {
    id: String(row.id),
    businessName: String(row.business_name ?? row.customer_name ?? ''),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ''),
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export async function loadGovernmentAdminDashboardSummary(pool, ctx) {
  if (!canAccessGovernmentOperationalDashboard(ctx)) {
    return { ok: false, status: 403, message: '운영 대시보드 권한이 없습니다.' }
  }

  const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
  if (!scope.ok) {
    return scope
  }

  const tenantIds = resolveOperationalTenantIds(ctx, scope.tenantIds)
  if (tenantIds.length === 0) {
    return {
      ok: true,
      data: {
        pendingDocumentRequests: 0,
        submittedDocumentRequests: 0,
        openInquiries: 0,
        unansweredInquiries: 0,
        inProgressInquiries: 0,
        sentSignatures: 0,
        completedSignatures: 0,
        completedSignaturesNeedingReview: 0,
        cancelledSignatures: 0,
        expiredSignatures: 0,
        programUsersCount: 0,
        profilesCount: 0,
        recentDocumentRequests: [],
        recentInquiries: [],
        recentSignatures: [],
        recentProgramUsers: [],
        recentProfiles: [],
        unreadNotifications: 0,
        recentNotifications: [],
        myAssignedOpenInquiries: 0,
        myAssignedDocumentRequestsReview: 0,
        unassignedOpenInquiries: 0,
        unassignedDocumentRequestsReview: 0,
      },
    }
  }

  const currentUserId = ctx.userId != null ? String(ctx.userId) : ''

  const [countsR, recentDocsR, recentInqR, recentSigR, recentUsersR, recentProfilesR, unreadResult, recentNotifResult] =
    await Promise.all([
      pool.query(
        `
    SELECT
      (SELECT COUNT(*)::int FROM gov_support_document_requests r
        WHERE r.tenant_id = ANY($1::bigint[]) AND r.archived_at IS NULL AND r.status = 'open') AS pending_document_requests,
      (SELECT COUNT(*)::int FROM gov_support_document_requests r
        WHERE r.tenant_id = ANY($1::bigint[]) AND r.archived_at IS NULL
          AND (r.status IN ('partial', 'completed')
            OR EXISTS (
              SELECT 1 FROM gov_support_document_request_items i
              WHERE i.request_id = r.id AND i.status = '제출 완료'
            ))) AS submitted_document_requests,
      (SELECT COUNT(*)::int FROM gov_support_inquiries i
        WHERE i.tenant_id = ANY($1::bigint[]) AND i.archived_at IS NULL AND i.status = 'open') AS open_inquiries,
      (SELECT COUNT(*)::int FROM gov_support_inquiries i
        WHERE i.tenant_id = ANY($1::bigint[]) AND i.archived_at IS NULL AND i.status = 'open') AS unanswered_inquiries,
      (SELECT COUNT(*)::int FROM gov_support_inquiries i
        WHERE i.tenant_id = ANY($1::bigint[]) AND i.archived_at IS NULL AND i.status = 'replied') AS in_progress_inquiries,
      (SELECT COUNT(*)::int FROM gov_signature_send_sessions s
        WHERE s.tenant_id = ANY($1::bigint[])
          AND s.status NOT IN ('completed', 'expired', 'cancelled')) AS sent_signatures,
      (SELECT COUNT(*)::int FROM gov_signature_send_sessions s
        WHERE s.tenant_id = ANY($1::bigint[]) AND s.status = 'completed') AS completed_signatures,
      (SELECT COUNT(*)::int FROM gov_signature_send_sessions s
        WHERE s.tenant_id = ANY($1::bigint[]) AND s.status = 'completed'
          AND s.completed_at IS NOT NULL
          AND s.completed_at >= NOW() - INTERVAL '30 days') AS completed_signatures_needing_review,
      (SELECT COUNT(*)::int FROM gov_signature_send_sessions s
        WHERE s.tenant_id = ANY($1::bigint[]) AND s.status = 'cancelled') AS cancelled_signatures,
      (SELECT COUNT(*)::int FROM gov_signature_send_sessions s
        WHERE s.tenant_id = ANY($1::bigint[]) AND s.status = 'expired') AS expired_signatures,
      (SELECT COUNT(DISTINCT u.id)::int FROM users u
        INNER JOIN user_memberships m ON m.user_id = u.id AND m.role = $2
        WHERE m.tenant_id = ANY($1::bigint[])
          AND COALESCE(u.is_deleted, false) IS NOT TRUE) AS program_users_count,
      (SELECT COUNT(*)::int FROM gov_support_profiles p
        WHERE p.tenant_id = ANY($1::bigint[])) AS profiles_count,
      (SELECT COUNT(*)::int FROM gov_support_inquiries i
        WHERE i.tenant_id = ANY($1::bigint[]) AND i.archived_at IS NULL AND i.status = 'open'
          AND i.assigned_to_user_id = $3) AS my_assigned_open_inquiries,
      (SELECT COUNT(*)::int FROM gov_support_inquiries i
        WHERE i.tenant_id = ANY($1::bigint[]) AND i.archived_at IS NULL AND i.status = 'open'
          AND i.assigned_to_user_id IS NULL) AS unassigned_open_inquiries,
      (SELECT COUNT(*)::int FROM gov_support_document_requests r
        WHERE r.tenant_id = ANY($1::bigint[]) AND r.archived_at IS NULL
          AND r.assigned_to_user_id = $3
          AND (r.status IN ('partial', 'completed')
            OR EXISTS (
              SELECT 1 FROM gov_support_document_request_items i
              WHERE i.request_id = r.id AND i.status = '제출 완료'
            ))) AS my_assigned_document_requests_review,
      (SELECT COUNT(*)::int FROM gov_support_document_requests r
        WHERE r.tenant_id = ANY($1::bigint[]) AND r.archived_at IS NULL
          AND r.assigned_to_user_id IS NULL
          AND (r.status IN ('partial', 'completed')
            OR EXISTS (
              SELECT 1 FROM gov_support_document_request_items i
              WHERE i.request_id = r.id AND i.status = '제출 완료'
            ))) AS unassigned_document_requests_review
    `,
        [tenantIds, GOVERNMENT_PROGRAM_USER_ROLE, currentUserId],
      ),
      pool.query(
        `
      SELECT r.id, r.title, r.status, r.updated_at,
        COALESCE(NULLIF(TRIM(p.business_name), ''), p.customer_name, '') AS profile_display_name
      FROM gov_support_document_requests r
      LEFT JOIN gov_support_profiles p ON p.id = r.profile_id
      WHERE r.tenant_id = ANY($1::bigint[]) AND r.archived_at IS NULL
      ORDER BY r.updated_at DESC, r.id DESC
      LIMIT $2
      `,
        [tenantIds, RECENT_LIMIT],
      ),
      pool.query(
        `
      SELECT i.id, i.title, i.status, i.updated_at,
        COALESCE(NULLIF(TRIM(p.business_name), ''), p.customer_name, '') AS profile_display_name
      FROM gov_support_inquiries i
      LEFT JOIN gov_support_profiles p ON p.id = i.profile_id
      WHERE i.tenant_id = ANY($1::bigint[]) AND i.archived_at IS NULL
      ORDER BY i.updated_at DESC, i.id DESC
      LIMIT $2
      `,
        [tenantIds, RECENT_LIMIT],
      ),
      pool.query(
        `
      SELECT s.id, s.status, s.sent_at, s.completed_at, s.updated_at,
        COALESCE(NULLIF(TRIM(p.business_name), ''), p.customer_name, '') AS profile_display_name
      FROM gov_signature_send_sessions s
      LEFT JOIN gov_support_profiles p ON p.id = s.profile_id
      WHERE s.tenant_id = ANY($1::bigint[])
      ORDER BY COALESCE(s.completed_at, s.sent_at, s.updated_at) DESC, s.id DESC
      LIMIT $2
      `,
        [tenantIds, RECENT_LIMIT],
      ),
      pool.query(
        `
      SELECT u.id::text AS id, u.username, COALESCE(u.display_name, '') AS display_name, u.created_at
      FROM users u
      INNER JOIN user_memberships m ON m.user_id = u.id AND m.role = $2
      WHERE m.tenant_id = ANY($1::bigint[])
        AND COALESCE(u.is_deleted, false) IS NOT TRUE
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT $3
      `,
        [tenantIds, GOVERNMENT_PROGRAM_USER_ROLE, RECENT_LIMIT],
      ),
      pool.query(
        `
      SELECT p.id, COALESCE(NULLIF(TRIM(p.business_name), ''), p.customer_name, '') AS business_name, p.created_at
      FROM gov_support_profiles p
      WHERE p.tenant_id = ANY($1::bigint[])
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $2
      `,
        [tenantIds, RECENT_LIMIT],
      ),
      countUnreadGovSupportNotifications(pool, ctx),
      loadGovSupportNotificationsForAdmin(pool, ctx, { limit: RECENT_LIMIT }),
    ])

  const counts = countsR.rows[0] ?? {}
  const unreadNotifications = unreadResult.ok ? Number(unreadResult.count ?? 0) : 0
  const recentNotifications = recentNotifResult.ok ? recentNotifResult.notifications : []

  return {
    ok: true,
    data: {
      pendingDocumentRequests: Number(counts.pending_document_requests ?? 0),
      submittedDocumentRequests: Number(counts.submitted_document_requests ?? 0),
      openInquiries: Number(counts.open_inquiries ?? 0),
      unansweredInquiries: Number(counts.unanswered_inquiries ?? 0),
      inProgressInquiries: Number(counts.in_progress_inquiries ?? 0),
      sentSignatures: Number(counts.sent_signatures ?? 0),
      completedSignatures: Number(counts.completed_signatures ?? 0),
      completedSignaturesNeedingReview: Number(counts.completed_signatures_needing_review ?? 0),
      cancelledSignatures: Number(counts.cancelled_signatures ?? 0),
      expiredSignatures: Number(counts.expired_signatures ?? 0),
      programUsersCount: Number(counts.program_users_count ?? 0),
      profilesCount: Number(counts.profiles_count ?? 0),
      recentDocumentRequests: recentDocsR.rows.map(mapRecentDocumentRequest),
      recentInquiries: recentInqR.rows.map(mapRecentInquiry),
      recentSignatures: recentSigR.rows.map(mapRecentSignature),
      recentProgramUsers: recentUsersR.rows.map(mapRecentProgramUser),
      recentProfiles: recentProfilesR.rows.map(mapRecentProfile),
      unreadNotifications,
      recentNotifications,
      myAssignedOpenInquiries: Number(counts.my_assigned_open_inquiries ?? 0),
      myAssignedDocumentRequestsReview: Number(counts.my_assigned_document_requests_review ?? 0),
      unassignedOpenInquiries: Number(counts.unassigned_open_inquiries ?? 0),
      unassignedDocumentRequestsReview: Number(counts.unassigned_document_requests_review ?? 0),
    },
  }
}
