/**
 * 정부지원 CRM — 운영 알림 (tenant 스코프, staff/agency admin 수신).
 * @module governmentNotifications
 */
import {
  isGovernmentIndustryAdmin,
  isGovernmentProgramUser,
  isGovernmentSuperAdmin,
  resolveGovernmentTenantScopeForQuery,
} from './governmentAccess.js'
import {
  GOV_NOTIFICATION_EVENT_TYPES,
  GOV_NOTIFICATION_TARGET_TYPES,
  GOV_NOTIFICATION_TARGET_URLS,
} from './governmentNotificationKeys.js'

export { GOV_NOTIFICATION_EVENT_TYPES }

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
function canAccessGovOperationalNotifications(ctx) {
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

const OPERATIONAL_ROLES = Object.freeze(['government_staff', 'government_agency_admin'])

const LIST_LIMIT_DEFAULT = 20
const LIST_LIMIT_MAX = 50

/**
 * @param {import('pg').Pool | import('pg').PoolClient} poolExec
 * @param {string|number} tenantId
 */
export async function listTenantOperationalUserIds(poolExec, tenantId) {
  const r = await poolExec.query(
    `
    SELECT DISTINCT m.user_id::text AS user_id
    FROM user_memberships m
    WHERE m.tenant_id = $1::bigint
      AND m.role = ANY($2::text[])
      AND COALESCE(m.status, 'active') = 'active'
    `,
    [String(tenantId), OPERATIONAL_ROLES],
  )
  return r.rows.map((row) => String(row.user_id)).filter(Boolean)
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapGovSupportNotificationRow(row) {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    recipientUserId: row.recipient_user_id != null ? String(row.recipient_user_id) : null,
    actorUserId: row.actor_user_id != null ? String(row.actor_user_id) : null,
    ownerUserId: row.owner_user_id != null ? String(row.owner_user_id) : null,
    profileId: row.profile_id != null ? String(row.profile_id) : null,
    eventType: String(row.event_type ?? ''),
    title: String(row.title ?? ''),
    message: String(row.message ?? ''),
    targetType: String(row.target_type ?? ''),
    targetId: String(row.target_id ?? ''),
    targetUrl: String(row.target_url ?? ''),
    isRead: row.read_at != null,
    readAt: row.read_at instanceof Date ? row.read_at.toISOString() : row.read_at != null ? String(row.read_at) : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ''),
  }
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} poolExec
 * @param {{
 *   tenantId: string|number,
 *   actorUserId?: string|null,
 *   ownerUserId?: string|null,
 *   profileId?: string|number|null,
 *   eventType: string,
 *   title: string,
 *   message: string,
 *   targetType?: string,
 *   targetId?: string|number,
 *   targetUrl?: string,
 *   excludeUserIds?: string[],
 *   recipientUserIds?: string[],
 * }} params
 */
export async function createGovSupportNotifications(poolExec, params) {
  const tenantId = String(params.tenantId ?? '').trim()
  if (!tenantId) {
    return []
  }
  const eventType = String(params.eventType ?? '').trim()
  if (!Object.values(GOV_NOTIFICATION_EVENT_TYPES).includes(eventType)) {
    throw new Error(`invalid gov notification event_type: ${eventType}`)
  }

  const exclude = new Set((params.excludeUserIds ?? []).map(String))
  if (params.actorUserId) {
    exclude.add(String(params.actorUserId))
  }

  let recipients =
    params.recipientUserIds?.length > 0
      ? params.recipientUserIds.map(String).filter(Boolean)
      : await listTenantOperationalUserIds(poolExec, tenantId)

  recipients = recipients.filter((id) => !exclude.has(id))
  if (recipients.length === 0) {
    return []
  }

  const title = String(params.title ?? '').trim()
  const message = String(params.message ?? '').trim()
  const targetType = String(params.targetType ?? '').trim()
  const targetId = params.targetId != null ? String(params.targetId) : ''
  const targetUrl = String(params.targetUrl ?? '').trim()
  const actorUserId = params.actorUserId != null ? String(params.actorUserId) : null
  const ownerUserId = params.ownerUserId != null ? String(params.ownerUserId) : null
  const profileId = params.profileId != null ? String(params.profileId) : null

  const inserted = []
  for (const recipientUserId of recipients) {
    const ins = await poolExec.query(
      `
      INSERT INTO gov_support_notifications (
        tenant_id, recipient_user_id, actor_user_id, owner_user_id, profile_id,
        event_type, title, message, target_type, target_id, target_url
      ) VALUES (
        $1::bigint, $2, $3, $4, $5::bigint,
        $6, $7, $8, $9, $10, $11
      )
      RETURNING *
      `,
      [
        tenantId,
        recipientUserId,
        actorUserId,
        ownerUserId,
        profileId,
        eventType,
        title,
        message,
        targetType,
        targetId,
        targetUrl,
      ],
    )
    if (ins.rows[0]) {
      inserted.push(mapGovSupportNotificationRow(ins.rows[0]))
    }
  }
  return inserted
}

/**
 * @param {import('pg').Pool} pool
 * @param {Function} fn
 */
export async function safeEmitGovNotification(pool, fn) {
  try {
    await fn(pool)
  } catch (e) {
    console.error('[gov_notification]', e?.message ?? e)
  }
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {string[]} tenantIds
 */
function resolveOperationalTenantIdsForUser(ctx, tenantIds) {
  const allowed = new Set([
    ...(ctx.governmentAgencyAdminTenantIds ?? []).map(String),
    ...(ctx.governmentStaffTenantIds ?? []).map(String),
  ])
  if (isGovernmentSuperAdmin(ctx)) {
    return tenantIds.map(String)
  }
  return tenantIds.map(String).filter((id) => allowed.has(id))
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {{ limit?: number }} [opts]
 */
export async function loadGovSupportNotificationsForAdmin(pool, ctx, opts = {}) {
  if (!canAccessGovOperationalNotifications(ctx)) {
    return { ok: false, status: 403, message: '알림 조회 권한이 없습니다.' }
  }
  const userId = ctx.userId != null ? String(ctx.userId) : ''
  if (!userId) {
    return { ok: false, status: 401, message: '로그인이 필요합니다.' }
  }

  const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
  if (!scope.ok) {
    return scope
  }
  const tenantIds = resolveOperationalTenantIdsForUser(ctx, scope.tenantIds)
  if (tenantIds.length === 0) {
    return { ok: true, notifications: [] }
  }

  const limRaw = Number(opts.limit ?? LIST_LIMIT_DEFAULT)
  const limit = Math.min(
    LIST_LIMIT_MAX,
    Math.max(1, Number.isFinite(limRaw) ? Math.floor(limRaw) : LIST_LIMIT_DEFAULT),
  )

  const r = await pool.query(
    `
    SELECT *
    FROM gov_support_notifications
    WHERE recipient_user_id = $1
      AND tenant_id = ANY($2::bigint[])
      AND archived_at IS NULL
    ORDER BY created_at DESC, id DESC
    LIMIT $3
    `,
    [userId, tenantIds, limit],
  )

  return { ok: true, notifications: r.rows.map(mapGovSupportNotificationRow) }
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export async function countUnreadGovSupportNotifications(pool, ctx) {
  if (!canAccessGovOperationalNotifications(ctx)) {
    return { ok: false, status: 403, message: '알림 조회 권한이 없습니다.' }
  }
  const userId = ctx.userId != null ? String(ctx.userId) : ''
  if (!userId) {
    return { ok: false, status: 401, message: '로그인이 필요합니다.' }
  }

  const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
  if (!scope.ok) {
    return scope
  }
  const tenantIds = resolveOperationalTenantIdsForUser(ctx, scope.tenantIds)
  if (tenantIds.length === 0) {
    return { ok: true, count: 0 }
  }

  const r = await pool.query(
    `
    SELECT COUNT(*)::int AS c
    FROM gov_support_notifications
    WHERE recipient_user_id = $1
      AND tenant_id = ANY($2::bigint[])
      AND read_at IS NULL
      AND archived_at IS NULL
    `,
    [userId, tenantIds],
  )
  return { ok: true, count: Number(r.rows[0]?.c ?? 0) }
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 * @param {string} notificationId
 */
export async function markGovSupportNotificationRead(pool, ctx, notificationId) {
  if (!canAccessGovOperationalNotifications(ctx)) {
    return { ok: false, status: 403, message: '알림 권한이 없습니다.' }
  }
  const userId = ctx.userId != null ? String(ctx.userId) : ''
  const nid = String(notificationId ?? '').trim()
  if (!nid || !/^\d+$/.test(nid)) {
    return { ok: false, status: 400, message: '알림을 찾을 수 없습니다.' }
  }

  const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
  if (!scope.ok) {
    return scope
  }
  const tenantIds = resolveOperationalTenantIdsForUser(ctx, scope.tenantIds)
  if (tenantIds.length === 0) {
    return { ok: false, status: 404, message: '알림을 찾을 수 없습니다.' }
  }

  const upd = await pool.query(
    `
    UPDATE gov_support_notifications
    SET read_at = COALESCE(read_at, NOW())
    WHERE id = $1::bigint
      AND recipient_user_id = $2
      AND tenant_id = ANY($3::bigint[])
      AND archived_at IS NULL
    RETURNING id
    `,
    [nid, userId, tenantIds],
  )
  if ((upd.rowCount ?? 0) === 0) {
    return { ok: false, status: 404, message: '알림을 찾을 수 없습니다.' }
  }
  return { ok: true }
}

/**
 * @param {import('pg').Pool} pool
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export async function markAllGovSupportNotificationsRead(pool, ctx) {
  if (!canAccessGovOperationalNotifications(ctx)) {
    return { ok: false, status: 403, message: '알림 권한이 없습니다.' }
  }
  const userId = ctx.userId != null ? String(ctx.userId) : ''
  const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
  if (!scope.ok) {
    return scope
  }
  const tenantIds = resolveOperationalTenantIdsForUser(ctx, scope.tenantIds)
  if (tenantIds.length === 0) {
    return { ok: true, updated: 0 }
  }

  const upd = await pool.query(
    `
    UPDATE gov_support_notifications
    SET read_at = NOW()
    WHERE recipient_user_id = $1
      AND tenant_id = ANY($2::bigint[])
      AND read_at IS NULL
      AND archived_at IS NULL
    `,
    [userId, tenantIds],
  )
  return { ok: true, updated: upd.rowCount ?? 0 }
}

/**
 * @param {import('pg').Pool} pool
 * @param {{
 *   tenantId: string|number,
 *   actorUserId: string,
 *   profileId?: string|number|null,
 *   ownerUserId?: string|null,
 *   requestId: string|number,
 *   requestTitle?: string,
 *   itemLabel?: string,
 * }} params
 */
export async function notifyDocumentRequestSubmitted(pool, params) {
  const label = String(params.itemLabel ?? '요청 항목').trim()
  const reqTitle = String(params.requestTitle ?? '요청서류').trim()
  return createGovSupportNotifications(pool, {
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    ownerUserId: params.ownerUserId ?? params.actorUserId,
    profileId: params.profileId,
    eventType: GOV_NOTIFICATION_EVENT_TYPES.DOCUMENT_REQUEST_SUBMITTED,
    title: '요청서류 제출',
    message: `${reqTitle} — ${label} 항목이 제출되었습니다.`,
    targetType: GOV_NOTIFICATION_TARGET_TYPES.DOCUMENT_REQUEST,
    targetId: params.requestId,
    targetUrl: GOV_NOTIFICATION_TARGET_URLS.DOCUMENT_REQUESTS,
  })
}

/**
 * @param {import('pg').Pool} pool
 * @param {{
 *   tenantId: string|number,
 *   actorUserId: string,
 *   profileId?: string|number|null,
 *   ownerUserId: string,
 *   inquiryId: string|number,
 *   inquiryTitle?: string,
 * }} params
 */
export async function notifyInquiryCreated(pool, params) {
  const title = String(params.inquiryTitle ?? '새 문의').trim()
  return createGovSupportNotifications(pool, {
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    ownerUserId: params.ownerUserId,
    profileId: params.profileId,
    eventType: GOV_NOTIFICATION_EVENT_TYPES.INQUIRY_CREATED,
    title: '새 문의',
    message: `이용자 문의가 등록되었습니다: ${title}`,
    targetType: GOV_NOTIFICATION_TARGET_TYPES.INQUIRY,
    targetId: params.inquiryId,
    targetUrl: GOV_NOTIFICATION_TARGET_URLS.INQUIRIES,
  })
}

/**
 * @param {import('pg').Pool} pool
 * @param {{
 *   tenantId: string|number,
 *   actorUserId: string,
 *   ownerUserId: string,
 *   profileId?: string|number|null,
 *   inquiryId: string|number,
 *   inquiryTitle?: string,
 * }} params
 */
export async function notifyInquiryReplied(pool, params) {
  const title = String(params.inquiryTitle ?? '문의').trim()
  return createGovSupportNotifications(pool, {
    tenantId: params.tenantId,
    ownerUserId: params.ownerUserId,
    profileId: params.profileId,
    eventType: GOV_NOTIFICATION_EVENT_TYPES.INQUIRY_REPLIED,
    title: '문의 답변',
    message: `문의에 답변이 등록되었습니다: ${title}`,
    targetType: GOV_NOTIFICATION_TARGET_TYPES.INQUIRY,
    targetId: params.inquiryId,
    targetUrl: GOV_NOTIFICATION_TARGET_URLS.INQUIRIES,
  })
}

/**
 * @param {import('pg').Pool} pool
 * @param {{
 *   tenantId: string|number,
 *   actorUserId?: string|null,
 *   ownerUserId?: string|null,
 *   profileId?: string|number|null,
 *   sessionId: string|number,
 *   profileDisplayName?: string,
 * }} params
 */
export async function notifySignatureCompleted(pool, params) {
  const name = String(params.profileDisplayName ?? '이용자').trim()
  return createGovSupportNotifications(pool, {
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    ownerUserId: params.ownerUserId,
    profileId: params.profileId,
    eventType: GOV_NOTIFICATION_EVENT_TYPES.SIGNATURE_COMPLETED,
    title: '전자서명 완료',
    message: `${name} — 전자서명이 완료되었습니다.`,
    targetType: GOV_NOTIFICATION_TARGET_TYPES.SIGNATURE_SESSION,
    targetId: params.sessionId,
    targetUrl: GOV_NOTIFICATION_TARGET_URLS.ADMIN_HOME,
  })
}

/**
 * @param {import('pg').Pool} pool
 * @param {{
 *   tenantId: string|number,
 *   actorUserId: string,
 *   username?: string,
 *   displayName?: string,
 * }} params
 */
export async function notifyProgramUserJoined(pool, params) {
  const label =
    String(params.displayName ?? '').trim() ||
    String(params.username ?? '이용자').trim()
  return createGovSupportNotifications(pool, {
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    ownerUserId: params.actorUserId,
    eventType: GOV_NOTIFICATION_EVENT_TYPES.PROGRAM_USER_JOINED,
    title: '신규 이용자 가입',
    message: `기관 코드로 새 이용자가 가입했습니다: ${label}`,
    targetType: GOV_NOTIFICATION_TARGET_TYPES.PROGRAM_USER,
    targetId: params.actorUserId,
    targetUrl: GOV_NOTIFICATION_TARGET_URLS.PROGRAM_USERS,
  })
}

/**
 * @param {import('pg').Pool} pool
 * @param {{
 *   tenantId: string|number,
 *   assigneeUserId: string,
 *   actorUserId?: string|null,
 *   ownerUserId?: string|null,
 *   profileId?: string|number|null,
 *   inquiryId: string|number,
 *   inquiryTitle?: string,
 * }} params
 */
export async function notifyInquiryAssigned(pool, params) {
  const assigneeUserId = String(params.assigneeUserId ?? '').trim()
  if (!assigneeUserId) {
    return []
  }
  const title = String(params.inquiryTitle ?? '문의').trim()
  return createGovSupportNotifications(pool, {
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    ownerUserId: params.ownerUserId,
    profileId: params.profileId,
    recipientUserIds: [assigneeUserId],
    eventType: GOV_NOTIFICATION_EVENT_TYPES.INQUIRY_ASSIGNED,
    title: '문의 담당 지정',
    message: `문의 담당자로 지정되었습니다: ${title}`,
    targetType: GOV_NOTIFICATION_TARGET_TYPES.INQUIRY,
    targetId: params.inquiryId,
    targetUrl: GOV_NOTIFICATION_TARGET_URLS.INQUIRIES,
  })
}

/**
 * @param {import('pg').Pool} pool
 * @param {{
 *   tenantId: string|number,
 *   assigneeUserId: string,
 *   actorUserId?: string|null,
 *   ownerUserId?: string|null,
 *   profileId?: string|number|null,
 *   requestId: string|number,
 *   requestTitle?: string,
 * }} params
 */
export async function notifyDocumentRequestAssigned(pool, params) {
  const assigneeUserId = String(params.assigneeUserId ?? '').trim()
  if (!assigneeUserId) {
    return []
  }
  const title = String(params.requestTitle ?? '요청서류').trim()
  return createGovSupportNotifications(pool, {
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    ownerUserId: params.ownerUserId,
    profileId: params.profileId,
    recipientUserIds: [assigneeUserId],
    eventType: GOV_NOTIFICATION_EVENT_TYPES.DOCUMENT_REQUEST_ASSIGNED,
    title: '요청서류 담당 지정',
    message: `요청서류 담당자로 지정되었습니다: ${title}`,
    targetType: GOV_NOTIFICATION_TARGET_TYPES.DOCUMENT_REQUEST,
    targetId: params.requestId,
    targetUrl: GOV_NOTIFICATION_TARGET_URLS.DOCUMENT_REQUESTS,
  })
}
