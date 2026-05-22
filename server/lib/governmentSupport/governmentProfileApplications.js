/**
 * gov_support_profile_applications 행 매핑·검증.
 * 보험 customer_claim_requests 대응.
 * @module governmentProfileApplications
 */

export const GOV_PROFILE_APPLICATION_CONTENT_MAX = 20000
export const GOV_PROFILE_APPLICATION_TITLE_MAX = 500

/** @type {readonly string[]} */
export const GOV_PROFILE_APPLICATION_STATUSES = Object.freeze([
  'requested',
  'processing',
  'done',
  'rejected',
  'canceled',
])

/**
 * @param {Record<string, unknown>} row
 */
export function mapGovSupportProfileApplicationRow(row) {
  const createdAt = row.created_at
  const updatedAt = row.updated_at
  const archivedAt = row.archived_at
  const submittedAt = row.submitted_at
  const completedAt = row.completed_at
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    ownerUserId: String(row.owner_user_id ?? ''),
    title: String(row.title ?? ''),
    applicationType: String(row.application_type ?? ''),
    status: String(row.status ?? 'requested'),
    content: String(row.content ?? ''),
    submittedAt:
      submittedAt instanceof Date
        ? submittedAt.toISOString()
        : submittedAt != null
          ? String(submittedAt)
          : null,
    completedAt:
      completedAt instanceof Date
        ? completedAt.toISOString()
        : completedAt != null
          ? String(completedAt)
          : null,
    createdByUserId: row.created_by_user_id != null ? String(row.created_by_user_id) : null,
    updatedByUserId: row.updated_by_user_id != null ? String(row.updated_by_user_id) : null,
    createdAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : createdAt != null
          ? String(createdAt)
          : new Date().toISOString(),
    updatedAt:
      updatedAt instanceof Date
        ? updatedAt.toISOString()
        : updatedAt != null
          ? String(updatedAt)
          : new Date().toISOString(),
    archivedAt:
      archivedAt instanceof Date
        ? archivedAt.toISOString()
        : archivedAt != null
          ? String(archivedAt)
          : null,
  }
}

/**
 * @param {unknown} rawStatus
 * @returns {{ ok: true, status: string } | { ok: false, status: number, message: string }}
 */
export function normalizeGovProfileApplicationStatus(rawStatus) {
  const status = rawStatus != null ? String(rawStatus).trim() : ''
  if (!status) {
    return { ok: false, status: 400, message: '상태를 선택해 주세요.' }
  }
  if (!GOV_PROFILE_APPLICATION_STATUSES.includes(status)) {
    return { ok: false, status: 400, message: '유효하지 않은 신청 상태입니다.' }
  }
  return { ok: true, status }
}

/**
 * @param {unknown} rawTitle
 * @param {{ required?: boolean }} [opts]
 */
export function normalizeGovProfileApplicationTitle(rawTitle, opts = {}) {
  const { required = false } = opts
  const title = rawTitle != null ? String(rawTitle).trim() : ''
  if (!title) {
    if (required) {
      return { ok: false, status: 400, message: '신청 제목을 입력해 주세요.' }
    }
    return { ok: true, title: '' }
  }
  if (title.length > GOV_PROFILE_APPLICATION_TITLE_MAX) {
    return {
      ok: false,
      status: 400,
      message: `신청 제목은 ${GOV_PROFILE_APPLICATION_TITLE_MAX}자 이하로 입력해 주세요.`,
    }
  }
  return { ok: true, title }
}

/**
 * @param {unknown} rawContent
 * @param {{ required?: boolean }} [opts]
 */
export function normalizeGovProfileApplicationContent(rawContent, opts = {}) {
  const { required = false } = opts
  const content = rawContent != null ? String(rawContent).trim() : ''
  if (!content) {
    if (required) {
      return { ok: false, status: 400, message: '신청 내용을 입력해 주세요.' }
    }
    return { ok: true, content: '' }
  }
  if (content.length > GOV_PROFILE_APPLICATION_CONTENT_MAX) {
    return {
      ok: false,
      status: 400,
      message: `신청 내용은 ${GOV_PROFILE_APPLICATION_CONTENT_MAX}자 이하로 입력해 주세요.`,
    }
  }
  return { ok: true, content }
}

/**
 * POST/PATCH body에서 신청 필드 추출.
 * @param {Record<string, unknown>|null|undefined} body
 * @param {{ requireTitle?: boolean, requireContent?: boolean }} [opts]
 */
export function parseGovProfileApplicationPatchBody(body, opts = {}) {
  const { requireTitle = false, requireContent = false } = opts
  const b = body ?? {}
  const hasTitle = b.title != null
  const hasContent = b.content != null
  const hasType = b.applicationType != null || b.application_type != null
  const hasStatus = b.status != null

  /** @type {{ title?: string, content?: string, applicationType?: string, status?: string }} */
  const patch = {}

  if (hasTitle) {
    const normalized = normalizeGovProfileApplicationTitle(b.title, { required: requireTitle })
    if (!normalized.ok) {
      return normalized
    }
    patch.title = normalized.title
  } else if (requireTitle) {
    return { ok: false, status: 400, message: '신청 제목을 입력해 주세요.' }
  }

  if (hasContent) {
    const normalized = normalizeGovProfileApplicationContent(b.content, { required: requireContent })
    if (!normalized.ok) {
      return normalized
    }
    patch.content = normalized.content
  } else if (requireContent) {
    return { ok: false, status: 400, message: '신청 내용을 입력해 주세요.' }
  }

  if (hasType) {
    patch.applicationType = String(b.applicationType ?? b.application_type ?? '').trim()
  }

  if (hasStatus) {
    const normalized = normalizeGovProfileApplicationStatus(b.status)
    if (!normalized.ok) {
      return normalized
    }
    patch.status = normalized.status
  }

  if (
    !requireTitle &&
    !requireContent &&
    !hasTitle &&
    !hasContent &&
    !hasType &&
    !hasStatus
  ) {
    return { ok: false, status: 400, message: '수정할 필드가 없습니다.' }
  }

  return { ok: true, patch }
}
