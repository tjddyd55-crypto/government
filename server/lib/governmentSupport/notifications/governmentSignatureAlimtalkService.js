import { randomUUID } from 'node:crypto'
import { normalizeKrMobile, validateKrMobileDigits } from '../../phoneNormalize.js'
import { maskKrMobileForDisplay } from '../../../utils/maskKrMobile.js'
import { loadGovernmentSignatureAlimtalkConfig } from './governmentSignatureAlimtalkConfig.js'
import {
  resolveGovernmentSignatureManagerContactPhone,
  resolveGovernmentSignatureManagerName,
} from './governmentSignatureAlimtalkContact.js'
import { resolveGovernmentSignatureExpiryAt } from './governmentSignatureAlimtalkExpiry.js'
import { postGovernmentSignatureAlimtalkRelay } from './governmentSignatureAlimtalkRelayClient.js'
import { insertGovSignatureNotificationLog } from './governmentSignatureAlimtalkRepository.js'
import {
  buildGovernmentSignaturePublicSignUrl,
  sanitizeAlimtalkSnapshot,
  validateInternalAlimtalkVariables,
} from './governmentSignatureAlimtalkSnapshot.js'
import { GOV_SIGNATURE_ALIMTALK_PRODUCT } from './governmentSignatureAlimtalkConstants.js'
import { normalizeGovernmentAlimtalkRelayOutcome } from './governmentSignatureAlimtalkNormalize.js'

function failAlimtalkResult(errorCategory, logId) {
  return {
    ok: false,
    status: 'failed',
    errorCategory,
    providerCode: null,
    providerMessage: null,
    retryable: false,
    logId,
  }
}

/**
 * @param {import('pg').Pool | { query: Function }} exec
 * @param {string} sendSessionId
 */
async function loadSendContext(exec, sendSessionId) {
  const res = await exec.query(
    `
    SELECT
      s.id AS send_session_id,
      s.sign_token,
      s.tenant_id,
      s.profile_id,
      s.sent_by_user_id,
      s.expired_at,
      s.sent_at,
      s.created_at,
      p.customer_name,
      p.phone AS profile_phone,
      p.business_name,
      t.name AS tenant_name,
      t.config AS tenant_config,
      g.name AS ga_company_name,
      u.display_name AS sender_display_name,
      u.username AS sender_username,
      u.phone_number AS sender_phone_number
    FROM gov_signature_send_sessions s
    INNER JOIN gov_support_profiles p ON p.id = s.profile_id
    LEFT JOIN tenants t ON t.id = s.tenant_id
    LEFT JOIN ga_companies g ON g.id = t.legacy_ga_id
    LEFT JOIN users u ON u.id = s.sent_by_user_id
    WHERE s.id = $1
    LIMIT 1
    `,
    [sendSessionId],
  )
  return res.rows[0] ?? null
}

/**
 * 최초 알림톡 로그의 managerSnapshot (재발송 시 담당자 고정).
 * @param {import('pg').Pool | { query: Function }} exec
 * @param {string} sendSessionId
 * @returns {Promise<{ managerName: string, managerPhone: string } | null>}
 */
async function loadManagerSnapshotFromFirstNotification(exec, sendSessionId) {
  const res = await exec.query(
    `
    SELECT request_snapshot
    FROM gov_signature_notification_logs
    WHERE send_session_id = $1
      AND request_snapshot IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 1
    `,
    [sendSessionId],
  )
  const snap = res.rows[0]?.request_snapshot
  if (!snap || typeof snap !== 'object' || Array.isArray(snap)) return null
  const ms = /** @type {Record<string, unknown>} */ (snap).managerSnapshot
  if (!ms || typeof ms !== 'object' || Array.isArray(ms)) return null
  const managerName = String(/** @type {Record<string, unknown>} */ (ms).managerName ?? '').trim()
  const managerPhone = String(/** @type {Record<string, unknown>} */ (ms).managerPhone ?? '')
    .trim()
    .replace(/\D/g, '')
  if (!managerName || !managerPhone) return null
  return { managerName, managerPhone }
}

/**
 * @param {Record<string, unknown>} ctx
 */
function mapSendContextToPayload(ctx, config, overrides = {}) {
  const customerName = String(ctx.customer_name ?? '').trim()
  const phoneDigits = normalizeKrMobile(ctx.profile_phone)
  const managerNameFromUser = resolveGovernmentSignatureManagerName({
    displayName: ctx.sender_display_name,
    username: ctx.sender_username,
  })
  const managerPhoneFromUser = resolveGovernmentSignatureManagerContactPhone({
    senderPhoneNumber: ctx.sender_phone_number,
  })
  const managerName =
    overrides.managerName != null && String(overrides.managerName).trim()
      ? String(overrides.managerName).trim()
      : managerNameFromUser
  const managerPhone =
    overrides.managerPhone != null && String(overrides.managerPhone).trim()
      ? String(overrides.managerPhone).trim().replace(/\D/g, '')
      : managerPhoneFromUser
  const now = overrides.requestedAt instanceof Date ? overrides.requestedAt : new Date()
  const expiry = resolveGovernmentSignatureExpiryAt(
    overrides.expiresAt ?? ctx.expired_at,
    now,
    {
      defaultExpiryDays: config.defaultExpiryDays,
      maxExpiryDays: config.maxExpiryDays,
    },
  )
  const signToken = String(ctx.sign_token ?? '').trim()
  const signUrl = buildGovernmentSignaturePublicSignUrl(signToken, config.publicBaseUrl)

  return {
    customerName,
    phoneDigits,
    managerName,
    managerPhone,
    expiry,
    signUrl,
    signToken,
    tenantId: ctx.tenant_id,
    profileId: ctx.profile_id,
    sentByUserId: ctx.sent_by_user_id,
  }
}

/**
 * 정부지원 전자서명 알림톡 발송 (세션 COMMIT 이후 호출 전제).
 * 실패해도 세션 롤백하지 않음.
 *
 * @param {import('pg').Pool | { query: Function }} exec
 * @param {{
 *   sendSessionId: string,
 *   expiresAt?: string | Date | null,
 *   requestedAt?: Date,
 *   retryCount?: number,
 *   createdBy?: string | null,
 *   config?: ReturnType<typeof loadGovernmentSignatureAlimtalkConfig>,
 *   relayPoster?: typeof postGovernmentSignatureAlimtalkRelay,
 * }} params
 */
export async function sendGovernmentSignatureAlimtalk(exec, params) {
  const config = params.config ?? loadGovernmentSignatureAlimtalkConfig()
  const relayPoster = params.relayPoster ?? postGovernmentSignatureAlimtalkRelay
  const sendSessionId = String(params.sendSessionId ?? '').trim()
  const retryCount = Number(params.retryCount ?? 0)
  const requestedAt = params.requestedAt ?? new Date()

  if (!sendSessionId) {
    return { ok: false, status: 'failed', errorCategory: 'unknown' }
  }

  const ctx = await loadSendContext(exec, sendSessionId)
  if (!ctx) {
    return { ok: false, status: 'failed', errorCategory: 'unknown', message: 'session not found' }
  }

  const phoneMasked = maskKrMobileForDisplay(normalizeKrMobile(ctx.profile_phone))

  if (!config.enabled) {
    const log = await insertGovSignatureNotificationLog(exec, {
      tenantId: ctx.tenant_id,
      profileId: ctx.profile_id,
      sendSessionId,
      templateCode: config.templateCode || null,
      recipientPhoneMasked: phoneMasked,
      status: 'skipped',
      errorCategory: 'disabled',
      retryCount,
      requestSnapshot: { reason: 'disabled' },
      requestedAt,
      createdBy: params.createdBy ?? ctx.sent_by_user_id,
    })
    return {
      ok: true,
      status: 'skipped',
      errorCategory: 'disabled',
      providerCode: null,
      providerMessage: null,
      retryable: false,
      logId: log?.id,
    }
  }

  /** @type {{ managerName?: string, managerPhone?: string }} */
  const managerOverrides = {}
  if (retryCount > 0) {
    const frozen = await loadManagerSnapshotFromFirstNotification(exec, sendSessionId)
    if (frozen) {
      managerOverrides.managerName = frozen.managerName
      managerOverrides.managerPhone = frozen.managerPhone
    }
  }

  const mapped = mapSendContextToPayload(ctx, config, {
    expiresAt: params.expiresAt,
    requestedAt,
    ...managerOverrides,
  })

  const phoneErr = validateKrMobileDigits(mapped.phoneDigits)
  if (phoneErr || !mapped.phoneDigits) {
    const log = await insertGovSignatureNotificationLog(exec, {
      tenantId: mapped.tenantId,
      profileId: mapped.profileId,
      sendSessionId,
      templateCode: config.templateCode || null,
      recipientPhoneMasked: phoneMasked,
      status: 'failed',
      errorCategory: 'invalid_phone',
      retryCount,
      requestedAt,
      failedAt: new Date(),
      createdBy: params.createdBy ?? mapped.sentByUserId,
    })
    return {
      ok: false,
      status: 'failed',
      errorCategory: 'invalid_phone',
      providerCode: null,
      providerMessage: null,
      retryable: false,
      logId: log?.id,
    }
  }

  if (!mapped.customerName) {
    const log = await insertGovSignatureNotificationLog(exec, {
      tenantId: mapped.tenantId,
      profileId: mapped.profileId,
      sendSessionId,
      templateCode: config.templateCode || null,
      recipientPhoneMasked: phoneMasked,
      status: 'failed',
      errorCategory: 'missing_customer_name',
      retryCount,
      requestedAt,
      failedAt: new Date(),
      createdBy: params.createdBy ?? mapped.sentByUserId,
    })
    return failAlimtalkResult('missing_customer_name', log?.id)
  }

  if (!mapped.signToken) {
    const log = await insertGovSignatureNotificationLog(exec, {
      tenantId: mapped.tenantId,
      profileId: mapped.profileId,
      sendSessionId,
      templateCode: config.templateCode || null,
      recipientPhoneMasked: phoneMasked,
      status: 'failed',
      errorCategory: 'missing_sign_token',
      retryCount,
      requestedAt,
      failedAt: new Date(),
      createdBy: params.createdBy ?? mapped.sentByUserId,
    })
    return failAlimtalkResult('missing_sign_token', log?.id)
  }

  if (!mapped.managerPhone) {
    const log = await insertGovSignatureNotificationLog(exec, {
      tenantId: mapped.tenantId,
      profileId: mapped.profileId,
      sendSessionId,
      templateCode: config.templateCode || null,
      recipientPhoneMasked: phoneMasked,
      status: 'failed',
      errorCategory: 'missing_verified_phone',
      retryCount,
      requestedAt,
      failedAt: new Date(),
      createdBy: params.createdBy ?? mapped.sentByUserId,
    })
    return failAlimtalkResult('missing_verified_phone', log?.id)
  }

  if (!config.templateCode) {
    const log = await insertGovSignatureNotificationLog(exec, {
      tenantId: mapped.tenantId,
      profileId: mapped.profileId,
      sendSessionId,
      templateCode: null,
      recipientPhoneMasked: phoneMasked,
      status: 'failed',
      errorCategory: 'missing_template',
      retryCount,
      requestedAt,
      failedAt: new Date(),
      createdBy: params.createdBy ?? mapped.sentByUserId,
    })
    return failAlimtalkResult('missing_template', log?.id)
  }

  if (!mapped.signUrl) {
    const log = await insertGovSignatureNotificationLog(exec, {
      tenantId: mapped.tenantId,
      profileId: mapped.profileId,
      sendSessionId,
      templateCode: config.templateCode,
      recipientPhoneMasked: phoneMasked,
      status: 'failed',
      errorCategory: 'unknown',
      retryCount,
      requestedAt,
      failedAt: new Date(),
      createdBy: params.createdBy ?? mapped.sentByUserId,
    })
    return failAlimtalkResult('unknown', log?.id)
  }

  /** @type {Record<string, string>} */
  const messageVariables = {
    customerName: mapped.customerName,
    managerName: mapped.managerName,
    managerPhone: mapped.managerPhone,
    signToken: mapped.signToken,
  }

  const varCheck = validateInternalAlimtalkVariables(messageVariables)
  if (!varCheck.ok) {
    const log = await insertGovSignatureNotificationLog(exec, {
      tenantId: mapped.tenantId,
      profileId: mapped.profileId,
      sendSessionId,
      templateCode: config.templateCode,
      recipientPhoneMasked: phoneMasked,
      status: 'failed',
      errorCategory: varCheck.errorCategory ?? 'unknown',
      retryCount,
      requestSnapshot: { messageVariables: sanitizeAlimtalkSnapshot({ messageVariables }) },
      requestedAt,
      failedAt: new Date(),
      createdBy: params.createdBy ?? mapped.sentByUserId,
    })
    return failAlimtalkResult(varCheck.errorCategory ?? 'unknown', log?.id)
  }

  const relayPayload = {
    requestId: randomUUID(),
    product: GOV_SIGNATURE_ALIMTALK_PRODUCT,
    recipientPhone: mapped.phoneDigits,
    templateCode: config.templateCode,
    messageVariables,
    variableNameMap: config.templateVariableMap,
    button: {
      name: config.buttonName,
      mobileUrl: mapped.signUrl,
      pcUrl: mapped.signUrl,
      linkType: config.buttonLinkType,
    },
    dryRun: config.dryRun,
  }

  const relayResult = await relayPoster({
    relayUrl: config.relayUrl,
    relayAuthToken: config.relayAuthToken,
    relayTimeoutMs: config.relayTimeoutMs,
    payload: relayPayload,
  })

  const normalized = normalizeGovernmentAlimtalkRelayOutcome(relayResult, config)
  const isLiveSent = normalized.status === 'sent'
  const isSkippedOk = normalized.ok && normalized.status === 'skipped'
  const log = await insertGovSignatureNotificationLog(exec, {
    tenantId: mapped.tenantId,
    profileId: mapped.profileId,
    sendSessionId,
    templateCode: config.templateCode,
    recipientPhoneMasked: phoneMasked,
    status: normalized.status,
    providerMessageId: isLiveSent ? relayResult.providerMessageId ?? null : null,
    providerCode: relayResult.providerCode ?? null,
    providerMessage: relayResult.providerMessage ?? null,
    errorCategory: normalized.errorCategory,
    retryCount,
    requestSnapshot: {
      ...relayPayload,
      managerSnapshot: {
        managerName: mapped.managerName,
        managerPhone: mapped.managerPhone,
      },
    },
    responseSnapshot: relayResult.raw
      ? { ...relayResult.raw, normalizedStatus: normalized.status, dryRun: normalized.dryRun }
      : { status: relayResult.status, normalizedStatus: normalized.status, dryRun: normalized.dryRun },
    requestedAt: relayResult.requestedAt ?? requestedAt,
    sentAt: normalized.recordSentAt ? relayResult.sentAt ?? new Date() : null,
    failedAt: normalized.ok ? null : relayResult.failedAt ?? new Date(),
    createdBy: params.createdBy ?? mapped.sentByUserId,
  })

  return {
    ok: isLiveSent || isSkippedOk,
    status: normalized.status,
    dryRun: normalized.dryRun,
    errorCategory: normalized.errorCategory,
    providerMessageId: isLiveSent ? relayResult.providerMessageId ?? null : null,
    providerCode: relayResult.providerCode ?? null,
    providerMessage: relayResult.providerMessage ?? null,
    retryable: Boolean(relayResult.retryable) && !normalized.ok,
    logId: log?.id,
  }
}

/**
 * dry-run / 단위 테스트용 — DB 없이 payload만 조립·검증.
 * @param {Record<string, unknown>} input
 * @param {ReturnType<typeof loadGovernmentSignatureAlimtalkConfig>} [config]
 */
export function buildGovernmentSignatureAlimtalkDraft(input, config = loadGovernmentSignatureAlimtalkConfig()) {
  const customerName = String(input.customerName ?? '').trim()
  const phoneDigits = normalizeKrMobile(input.phone)
  const managerName = resolveGovernmentSignatureManagerName({
    displayName: input.senderDisplayName,
    username: input.senderUsername,
  })
  const managerPhone = resolveGovernmentSignatureManagerContactPhone({
    senderPhoneNumber: input.senderPhoneNumber ?? input.phoneNumber,
  })
  const now = input.requestedAt instanceof Date ? input.requestedAt : new Date('2026-06-25T04:00:00.000Z')
  const expiry = resolveGovernmentSignatureExpiryAt(input.expiresAt, now, {
    defaultExpiryDays: config.defaultExpiryDays,
    maxExpiryDays: config.maxExpiryDays,
  })
  const signToken = String(input.signToken ?? 'test-token').trim()
  const signUrl = buildGovernmentSignaturePublicSignUrl(signToken, config.publicBaseUrl || input.publicBaseUrl)

  return {
    customerName,
    phoneDigits,
    managerName,
    managerPhone,
    expiry,
    signUrl,
    signToken,
    messageVariables:
      customerName && managerName && managerPhone && signToken
        ? {
            customerName,
            managerName,
            managerPhone,
            signToken,
          }
        : null,
  }
}
