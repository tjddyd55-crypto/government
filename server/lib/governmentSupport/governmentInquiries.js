/**
 * gov_support_inquiries 매핑·상수.
 * @module governmentInquiries
 */

export const GOV_INQUIRY_STATUSES = Object.freeze(['open', 'replied', 'closed'])

export const GOV_INQUIRY_SENDER_ROLES = Object.freeze([
  'government_user',
  'government_staff',
  'government_agency_admin',
])

const INQUIRY_FILE_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

export const GOV_INQUIRY_FILE_MAX_BYTES = 10 * 1024 * 1024

/**
 * @param {unknown} status
 */
export function isValidGovInquiryStatus(status) {
  return GOV_INQUIRY_STATUSES.includes(String(status ?? '').trim())
}

/**
 * @param {unknown} role
 */
export function isValidGovInquirySenderRole(role) {
  return GOV_INQUIRY_SENDER_ROLES.includes(String(role ?? '').trim())
}

/**
 * @param {string} contentType
 * @param {number} sizeBytes
 */
export function validateGovInquiryUpload(contentType, sizeBytes) {
  const mime = String(contentType ?? '').trim().toLowerCase() || 'application/octet-stream'
  if (!INQUIRY_FILE_ALLOWED_MIME.has(mime)) {
    return { ok: false, message: '이미지 또는 PDF 파일만 업로드할 수 있습니다.' }
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || sizeBytes > GOV_INQUIRY_FILE_MAX_BYTES) {
    return { ok: false, message: '파일은 최대 10MB까지 업로드할 수 있습니다.' }
  }
  return { ok: true, mime }
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapGovInquiryRow(row) {
  const createdAt = row.created_at
  const updatedAt = row.updated_at
  const lastRepliedAt = row.last_replied_at
  return {
    id: String(row.id),
    profileId: row.profile_id != null ? String(row.profile_id) : null,
    ownerUserId: String(row.owner_user_id ?? ''),
    tenantId: String(row.tenant_id),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    status: String(row.status ?? 'open'),
    createdByUserId: row.created_by_user_id != null ? String(row.created_by_user_id) : null,
    assignedToUserId: row.assigned_to_user_id != null ? String(row.assigned_to_user_id) : null,
    lastRepliedAt:
      lastRepliedAt instanceof Date
        ? lastRepliedAt.toISOString()
        : lastRepliedAt != null
          ? String(lastRepliedAt)
          : null,
    messageCount: Number(row.message_count ?? 0),
    fileCount: Number(row.file_count ?? 0),
    createdAt:
      createdAt instanceof Date ? createdAt.toISOString() : createdAt != null ? String(createdAt) : new Date().toISOString(),
    updatedAt:
      updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt != null ? String(updatedAt) : new Date().toISOString(),
  }
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapGovInquiryMessageRow(row) {
  const createdAt = row.created_at
  return {
    id: String(row.id),
    inquiryId: String(row.inquiry_id),
    ownerUserId: String(row.owner_user_id ?? ''),
    senderUserId: String(row.sender_user_id ?? ''),
    senderRole: String(row.sender_role ?? 'government_user'),
    senderUsername: row.sender_username != null ? String(row.sender_username) : null,
    message: String(row.message ?? ''),
    createdAt:
      createdAt instanceof Date ? createdAt.toISOString() : createdAt != null ? String(createdAt) : new Date().toISOString(),
  }
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapGovInquiryFileRow(row) {
  const createdAt = row.created_at
  return {
    id: String(row.id),
    inquiryId: String(row.inquiry_id),
    messageId: row.message_id != null ? String(row.message_id) : null,
    ownerUserId: String(row.owner_user_id ?? ''),
    fileName: String(row.file_name ?? ''),
    fileKey: String(row.file_key ?? ''),
    fileSize: Number(row.file_size ?? 0),
    mimeType: String(row.mime_type ?? ''),
    createdAt:
      createdAt instanceof Date ? createdAt.toISOString() : createdAt != null ? String(createdAt) : new Date().toISOString(),
  }
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export function resolveGovInquirySenderRole(ctx) {
  const agencyIds = ctx.governmentAgencyAdminTenantIds ?? []
  if (agencyIds.length > 0) {
    return 'government_agency_admin'
  }
  const staffIds = ctx.governmentStaffTenantIds ?? []
  if (staffIds.length > 0) {
    return 'government_staff'
  }
  return 'government_user'
}

/**
 * @param {import('../platformRbac.js').EffectivePlatformContext} ctx
 */
export function resolveProgramUserTenantId(ctx) {
  const ids = (ctx.governmentProgramUserTenantIds ?? []).map(String).filter(Boolean)
  return ids[0] ?? null
}
