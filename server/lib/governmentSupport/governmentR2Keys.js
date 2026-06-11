/**
 * 정부지원 CRM R2 object key SSOT.
 *
 * Bucket: platform-assets (ENV — object key에 포함하지 않음)
 * Object key root: government/
 *
 * @module governmentR2Keys
 */
import { randomUUID } from 'node:crypto'
import { getR2ObjectRoot, joinR2Key, stripR2ObjectRootIfPresent, withR2ObjectRoot } from '../r2KeyPolicy.js'

export const GOVERNMENT_R2_KEY_ROOT = 'government'

export const GOVERNMENT_R2_SEGMENTS = Object.freeze({
  AGENCIES: 'agencies',
  USERS: 'users',
  PROFILES: 'profiles',
  FILES: 'files',
  DOCUMENT_REQUESTS: 'document-requests',
  DOCUMENTS: 'documents',
  INQUIRIES: 'inquiries',
  SIGNATURES: 'signatures',
  EDOCS: 'edocs',
  SHARED: 'shared',
  RESOURCES: 'resources',
  NOTICES: 'notices',
  SIGNATURE_TEMPLATES: 'signature-templates',
  PDF_TEMPLATES: 'pdf-templates',
  GLOBAL: 'global',
  SYSTEM: 'system',
  PUBLIC_ASSETS: 'public-assets',
  TMP: 'tmp',
  UPLOADS: 'uploads',
  SESSIONS: 'sessions',
  SEND_ATTACHMENTS: 'send-attachments',
})

/** @deprecated read-only — 신규 업로드는 agencies/… 구조 사용. DB legacy key 호환용. */
export const GOVERNMENT_R2_LEGACY_SEGMENTS = Object.freeze({
  PROFILE_FILES: 'profile-files',
  REQUEST_DOCUMENTS: 'request-documents',
  TENANTS: 'tenants',
  RESOURCES_FLAT: 'resources',
  PDF_TEMPLATES_FLAT: 'pdf-templates',
})

/**
 * @param {unknown} value
 */
export function normalizeGovernmentR2Segment(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 128)
}

/**
 * @param {string} fileName
 */
export function sanitizeGovernmentR2FileName(fileName) {
  const raw = String(fileName ?? '').trim() || 'file'
  return raw.replace(/[^\w.\-() \u3131-\u318e\uac00-\ud7a3]/g, '_').slice(0, 120)
}

/**
 * object key에 bucket name(platform-assets)이 섞이면 false.
 * @param {string} objectKey
 */
export function assertGovernmentR2KeyHasNoBucketName(objectKey) {
  const key = stripR2ObjectRootIfPresent(String(objectKey ?? ''))
  return !key.includes('platform-assets')
}

/**
 * CRM_R2_OBJECT_ROOT env가 bucket name이면 throw.
 */
export function validateGovernmentR2ObjectRootEnv() {
  const root = getR2ObjectRoot()
  if (!root) {
    return
  }
  if (root === 'platform-assets' || root.startsWith('platform-assets/')) {
    throw new Error(
      'CRM_R2_OBJECT_ROOT must not be platform-assets (bucket name). Use "government" or leave unset.',
    )
  }
  const norm = root.replace(/\/+$/, '')
  if (norm.endsWith('/government') && norm.split('/').filter(Boolean).length > 1) {
    throw new Error('CRM_R2_OBJECT_ROOT would duplicate government/ object key prefix')
  }
}

/**
 * @param {string} relativeKey government/… 상대 경로 (government 접두 포함)
 */
function finalizeGovernmentObjectKey(relativeKey) {
  validateGovernmentR2ObjectRootEnv()
  const rel = String(relativeKey ?? '').replace(/^\//, '')
  if (!rel.startsWith(`${GOVERNMENT_R2_KEY_ROOT}/`)) {
    throw new Error('Government R2 object key must start with government/')
  }
  const key = withR2ObjectRoot(rel)
  if (!assertGovernmentR2KeyHasNoBucketName(key)) {
    throw new Error('R2 object key must not contain platform-assets bucket name')
  }
  return key
}

/**
 * @param {...unknown} parts
 */
function govKey(...parts) {
  return joinR2Key(GOVERNMENT_R2_KEY_ROOT, ...parts)
}

/**
 * @param {{ tenantId: string|number }} p
 */
export function buildGovernmentAgencyRoot({ tenantId }) {
  return govKey(GOVERNMENT_R2_SEGMENTS.AGENCIES, normalizeGovernmentR2Segment(tenantId))
}

/**
 * @param {{ tenantId: string|number }} p
 */
export function buildGovernmentSharedRoot({ tenantId }) {
  return joinR2Key(buildGovernmentAgencyRoot({ tenantId }), GOVERNMENT_R2_SEGMENTS.SHARED)
}

/**
 * @param {{ tenantId: string|number, userId: string|number, profileId: string|number }} p
 */
export function buildGovernmentProfileRoot({ tenantId, userId, profileId }) {
  return joinR2Key(
    buildGovernmentAgencyRoot({ tenantId }),
    GOVERNMENT_R2_SEGMENTS.USERS,
    normalizeGovernmentR2Segment(userId) || '_',
    GOVERNMENT_R2_SEGMENTS.PROFILES,
    normalizeGovernmentR2Segment(profileId),
  )
}

/**
 * @param {{ tenantId: string|number, userId: string|number, profileId: string|number, fileId: string|number, fileName: string }} p
 */
export function buildGovernmentProfileFileKey({ tenantId, userId, profileId, fileId, fileName }) {
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const relative = joinR2Key(
    buildGovernmentProfileRoot({ tenantId, userId, profileId }),
    GOVERNMENT_R2_SEGMENTS.FILES,
    normalizeGovernmentR2Segment(fileId),
    `${randomUUID()}_${safeName}`,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ tenantId: string|number, userId: string|number, profileId: string|number, requestId: string|number, fileId: string|number, fileName: string }} p
 */
export function buildGovernmentDocumentRequestFileKey({
  tenantId,
  userId,
  profileId,
  requestId,
  fileId,
  fileName,
}) {
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const relative = joinR2Key(
    buildGovernmentProfileRoot({ tenantId, userId, profileId }),
    GOVERNMENT_R2_SEGMENTS.DOCUMENT_REQUESTS,
    normalizeGovernmentR2Segment(requestId),
    normalizeGovernmentR2Segment(fileId),
    `${randomUUID()}_${safeName}`,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ tenantId: string|number, userId: string|number, inquiryId: string|number, fileId: string|number, fileName: string }} p
 */
export function buildGovernmentInquiryFileKey({ tenantId, userId, inquiryId, fileId, fileName }) {
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const relative = joinR2Key(
    buildGovernmentAgencyRoot({ tenantId }),
    GOVERNMENT_R2_SEGMENTS.USERS,
    normalizeGovernmentR2Segment(userId) || '_',
    GOVERNMENT_R2_SEGMENTS.INQUIRIES,
    normalizeGovernmentR2Segment(inquiryId),
    normalizeGovernmentR2Segment(fileId),
    `${randomUUID()}_${safeName}`,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ tenantId?: string|null, resourceId: string|number, fileName: string, scopeType?: string, fileId?: string|number }} p
 */
export function buildGovernmentResourceFileKey({ tenantId, resourceId, fileName, scopeType, fileId }) {
  const scope = String(scopeType ?? 'agency')
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const fileSeg = normalizeGovernmentR2Segment(fileId ?? randomUUID())
  const relative =
    scope === 'global' || tenantId == null
      ? joinR2Key(
          govKey(GOVERNMENT_R2_SEGMENTS.GLOBAL, GOVERNMENT_R2_SEGMENTS.SHARED, GOVERNMENT_R2_SEGMENTS.RESOURCES),
          normalizeGovernmentR2Segment(resourceId),
          fileSeg,
          `${randomUUID()}_${safeName}`,
        )
      : joinR2Key(
          buildGovernmentSharedRoot({ tenantId }),
          GOVERNMENT_R2_SEGMENTS.RESOURCES,
          normalizeGovernmentR2Segment(resourceId),
          fileSeg,
          `${randomUUID()}_${safeName}`,
        )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ tenantId: string|number, userId: string|number, profileId: string|number, docId: string|number, fileName: string }} p
 */
export function buildGovernmentProfileDocumentKey({ tenantId, userId, profileId, docId, fileName }) {
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const relative = joinR2Key(
    buildGovernmentProfileRoot({ tenantId, userId, profileId }),
    GOVERNMENT_R2_SEGMENTS.DOCUMENTS,
    normalizeGovernmentR2Segment(docId),
    `${randomUUID()}_${safeName}`,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ tenantId: string|number, userId: string|number, profileId: string|number, edocId: string|number, fileName: string }} p
 */
export function buildGovernmentEdocFileKey({ tenantId, userId, profileId, edocId, fileName }) {
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const relative = joinR2Key(
    buildGovernmentProfileRoot({ tenantId, userId, profileId }),
    GOVERNMENT_R2_SEGMENTS.EDOCS,
    normalizeGovernmentR2Segment(edocId),
    `${randomUUID()}_${safeName}`,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ tenantId: string|number, pdfTemplateId: string|number, fileName?: string }} p
 */
export function buildGovernmentSignaturePdfTemplateKey({ tenantId, pdfTemplateId, fileName = 'template.pdf' }) {
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const relative = joinR2Key(
    buildGovernmentSharedRoot({ tenantId }),
    GOVERNMENT_R2_SEGMENTS.PDF_TEMPLATES,
    normalizeGovernmentR2Segment(pdfTemplateId),
    `${randomUUID()}_${safeName}`,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ tenantId: string|number, templateId: string|number, fileName?: string }} p
 */
export function buildGovernmentSignatureTemplateAssetKey({ tenantId, templateId, fileName = 'asset.pdf' }) {
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const relative = joinR2Key(
    buildGovernmentSharedRoot({ tenantId }),
    GOVERNMENT_R2_SEGMENTS.SIGNATURE_TEMPLATES,
    normalizeGovernmentR2Segment(templateId),
    `${randomUUID()}_${safeName}`,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ tenantId: string|number, userId: string|number, profileId: string|number, sendSessionId: string|number, documentId: string|number, fileName: string }} p
 */
export function buildGovernmentSignatureCompletedPdfKey({
  tenantId,
  userId,
  profileId,
  sendSessionId,
  documentId,
  fileName,
}) {
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const relative = joinR2Key(
    buildGovernmentProfileRoot({ tenantId, userId, profileId }),
    GOVERNMENT_R2_SEGMENTS.SIGNATURES,
    normalizeGovernmentR2Segment(sendSessionId),
    normalizeGovernmentR2Segment(documentId),
    `${randomUUID()}_${safeName}`,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ sendSessionId: string|number, documentId: string|number, fieldId: string|number }} p
 */
export function buildGovernmentSignatureFieldImageKey({ sendSessionId, documentId, fieldId }) {
  const relative = joinR2Key(
    GOVERNMENT_R2_KEY_ROOT,
    GOVERNMENT_R2_SEGMENTS.SIGNATURES,
    GOVERNMENT_R2_SEGMENTS.SESSIONS,
    normalizeGovernmentR2Segment(sendSessionId),
    'documents',
    normalizeGovernmentR2Segment(documentId),
    'signature',
    `${normalizeGovernmentR2Segment(fieldId)}.png`,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ userId: string|number, fileName: string }} p
 */
export function buildGovernmentSignatureSendAttachmentKey({ userId, fileName }) {
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const uid = normalizeGovernmentR2Segment(userId) || '_'
  const relative = joinR2Key(
    GOVERNMENT_R2_KEY_ROOT,
    GOVERNMENT_R2_SEGMENTS.SIGNATURES,
    GOVERNMENT_R2_SEGMENTS.SEND_ATTACHMENTS,
    uid,
    randomUUID(),
    safeName,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ ownerUserId: string|number, code: string, pdfTemplateId?: string|number, tenantId?: string|number }} p
 */
export function buildGovernmentSignaturePdfTemplateUploadKey({ ownerUserId, code, pdfTemplateId, tenantId }) {
  if (tenantId != null && String(tenantId).trim() !== '') {
    return buildGovernmentSignaturePdfTemplateKey({
      tenantId,
      pdfTemplateId: pdfTemplateId ?? code,
      fileName: `${sanitizeGovernmentR2FileName(code)}.pdf`,
    })
  }
  const safeOwner = normalizeGovernmentR2Segment(ownerUserId) || 'unknown'
  const safeCode = String(code).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
  const relative = joinR2Key(
    GOVERNMENT_R2_LEGACY_SEGMENTS.PDF_TEMPLATES_FLAT,
    `gov-user-${safeOwner}`,
    `${safeCode}-${Date.now()}.pdf`,
  )
  return withR2ObjectRoot(relative)
}

/**
 * @param {{ sendSessionId: string|number, documentId: string|number, fileName: string }} p
 */
export function buildGovernmentSignatureSessionDocumentKey({ sendSessionId, documentId, fileName }) {
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const relative = joinR2Key(
    GOVERNMENT_R2_KEY_ROOT,
    GOVERNMENT_R2_SEGMENTS.SIGNATURES,
    GOVERNMENT_R2_SEGMENTS.SESSIONS,
    normalizeGovernmentR2Segment(sendSessionId),
    'documents',
    normalizeGovernmentR2Segment(documentId),
    safeName,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {{ fileName: string }} p
 */
export function buildGovernmentTempUploadKey({ fileName }) {
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const relative = joinR2Key(
    GOVERNMENT_R2_KEY_ROOT,
    GOVERNMENT_R2_SEGMENTS.TMP,
    GOVERNMENT_R2_SEGMENTS.UPLOADS,
    `${randomUUID()}_${safeName}`,
  )
  return finalizeGovernmentObjectKey(relative)
}

// —— Legacy builders (DB 기존 key 패턴 — 신규 업로드에는 사용하지 않음) ——

/**
 * @param {{ ownerUserId: string, profileId: string|number, fileId: string|number, fileName: string }} p
 */
export function buildLegacyGovernmentProfileFileObjectKey({ ownerUserId, profileId, fileId, fileName }) {
  const ownerSeg = normalizeGovernmentR2Segment(ownerUserId) || '_'
  const safeName = sanitizeGovernmentR2FileName(fileName)
  const relative = joinR2Key(
    GOVERNMENT_R2_KEY_ROOT,
    GOVERNMENT_R2_LEGACY_SEGMENTS.PROFILE_FILES,
    ownerSeg,
    String(profileId),
    String(fileId),
    safeName,
  )
  return finalizeGovernmentObjectKey(relative)
}

/**
 * @param {string} objectKey
 * @param {{ tenantId?: string|number, userId?: string|number, ownerUserId?: string, profileId: string|number, fileId: string|number }} expected
 */
export function assertGovernmentProfileFileObjectKey(objectKey, expected) {
  const key = stripR2ObjectRootIfPresent(String(objectKey ?? ''))
  const userId = expected.userId ?? expected.ownerUserId
  if (expected.tenantId != null && userId != null) {
    const prefix = joinR2Key(
      buildGovernmentProfileRoot({
        tenantId: expected.tenantId,
        userId,
        profileId: expected.profileId,
      }),
      GOVERNMENT_R2_SEGMENTS.FILES,
      normalizeGovernmentR2Segment(expected.fileId),
    )
    if (key.startsWith(`${prefix}/`) || key === prefix) {
      return true
    }
  }
  const ownerSeg = normalizeGovernmentR2Segment(expected.ownerUserId ?? userId) || '_'
  const legacyPrefix = joinR2Key(
    GOVERNMENT_R2_KEY_ROOT,
    GOVERNMENT_R2_LEGACY_SEGMENTS.PROFILE_FILES,
    ownerSeg,
    String(expected.profileId),
    String(expected.fileId),
  )
  return key.startsWith(`${legacyPrefix}/`) || key === legacyPrefix
}

/**
 * @param {string} objectKey
 * @param {{ tenantId?: string|number, userId?: string|number, ownerUserId?: string, profileId: string|number, requestId: string|number, itemId?: string|number, fileId: string|number }} expected
 */
export function assertGovernmentRequestDocumentObjectKey(objectKey, expected) {
  const key = stripR2ObjectRootIfPresent(String(objectKey ?? ''))
  const userId = expected.userId ?? expected.ownerUserId
  if (expected.tenantId != null && userId != null) {
    const prefix = joinR2Key(
      buildGovernmentProfileRoot({
        tenantId: expected.tenantId,
        userId,
        profileId: expected.profileId,
      }),
      GOVERNMENT_R2_SEGMENTS.DOCUMENT_REQUESTS,
      normalizeGovernmentR2Segment(expected.requestId),
      normalizeGovernmentR2Segment(expected.fileId),
    )
    if (key.startsWith(`${prefix}/`) || key === prefix) {
      return true
    }
  }
  const ownerSeg = normalizeGovernmentR2Segment(expected.ownerUserId ?? userId) || '_'
  const legacyPrefix = joinR2Key(
    GOVERNMENT_R2_KEY_ROOT,
    GOVERNMENT_R2_LEGACY_SEGMENTS.REQUEST_DOCUMENTS,
    ownerSeg,
    String(expected.profileId),
    String(expected.requestId),
    expected.itemId != null ? String(expected.itemId) : '',
    String(expected.fileId),
  ).replace(/\/+/g, '/').replace(/\/$/, '')
  return key.startsWith(`${legacyPrefix}/`) || key === legacyPrefix
}

/**
 * @param {string} objectKey
 * @param {{ tenantId?: string|number, userId?: string|number, ownerUserId?: string, inquiryId: string|number, messageId?: string|number|null, fileId: string|number }} expected
 */
export function assertGovernmentInquiryObjectKey(objectKey, expected) {
  const key = stripR2ObjectRootIfPresent(String(objectKey ?? ''))
  const userId = expected.userId ?? expected.ownerUserId
  if (expected.tenantId != null && userId != null) {
    const prefix = joinR2Key(
      buildGovernmentAgencyRoot({ tenantId: expected.tenantId }),
      GOVERNMENT_R2_SEGMENTS.USERS,
      normalizeGovernmentR2Segment(userId) || '_',
      GOVERNMENT_R2_SEGMENTS.INQUIRIES,
      normalizeGovernmentR2Segment(expected.inquiryId),
      normalizeGovernmentR2Segment(expected.fileId),
    )
    if (key.startsWith(`${prefix}/`) || key === prefix) {
      return true
    }
  }
  const ownerSeg = normalizeGovernmentR2Segment(expected.ownerUserId ?? userId) || '_'
  const messageSeg =
    expected.messageId != null && String(expected.messageId).trim() !== '' ? String(expected.messageId) : 'root'
  const legacyPrefix = joinR2Key(
    GOVERNMENT_R2_KEY_ROOT,
    GOVERNMENT_R2_SEGMENTS.INQUIRIES,
    ownerSeg,
    String(expected.inquiryId),
    messageSeg,
    String(expected.fileId),
  )
  return key.startsWith(`${legacyPrefix}/`) || key === legacyPrefix
}

/**
 * @param {string} objectKey
 * @param {{ tenantId?: string|null, resourceId: string|number, scopeType?: string }} expected
 */
export function assertGovernmentResourceObjectKey(objectKey, expected) {
  const key = stripR2ObjectRootIfPresent(String(objectKey ?? ''))
  const scope = String(expected.scopeType ?? 'agency')
  if (scope !== 'global' && expected.tenantId != null) {
    const prefix = joinR2Key(
      buildGovernmentSharedRoot({ tenantId: expected.tenantId }),
      GOVERNMENT_R2_SEGMENTS.RESOURCES,
      normalizeGovernmentR2Segment(expected.resourceId),
    )
    if (key.startsWith(`${prefix}/`) || key === prefix) {
      return true
    }
  }
  if (scope === 'global' || expected.tenantId == null) {
    const globalPrefix = joinR2Key(
      govKey(GOVERNMENT_R2_SEGMENTS.GLOBAL, GOVERNMENT_R2_SEGMENTS.SHARED, GOVERNMENT_R2_SEGMENTS.RESOURCES),
      normalizeGovernmentR2Segment(expected.resourceId),
    )
    if (key.startsWith(`${globalPrefix}/`) || key === globalPrefix) {
      return true
    }
  }
  const tenantSeg =
    scope === 'global' || expected.tenantId == null ? 'global' : String(expected.tenantId)
  const legacyPrefix = joinR2Key(
    GOVERNMENT_R2_KEY_ROOT,
    GOVERNMENT_R2_LEGACY_SEGMENTS.RESOURCES_FLAT,
    tenantSeg,
    String(expected.resourceId),
  )
  return key.startsWith(`${legacyPrefix}/`) || key === legacyPrefix
}

/**
 * @param {string} objectKey
 * @param {{ tenantId: string|number, userId: string|number, profileId: string|number, docId: string|number }} expected
 */
export function assertGovernmentProfileDocumentObjectKey(objectKey, expected) {
  const key = stripR2ObjectRootIfPresent(String(objectKey ?? ''))
  const newPrefix = joinR2Key(
    buildGovernmentProfileRoot({
      tenantId: expected.tenantId,
      userId: expected.userId,
      profileId: expected.profileId,
    }),
    GOVERNMENT_R2_SEGMENTS.DOCUMENTS,
    normalizeGovernmentR2Segment(expected.docId),
  )
  if (key.startsWith(`${newPrefix}/`) || key === newPrefix) {
    return true
  }
  const legacyPrefix = joinR2Key(
    GOVERNMENT_R2_KEY_ROOT,
    GOVERNMENT_R2_LEGACY_SEGMENTS.TENANTS,
    String(expected.tenantId),
    GOVERNMENT_R2_SEGMENTS.PROFILES,
    String(expected.profileId),
    GOVERNMENT_R2_SEGMENTS.DOCUMENTS,
    String(expected.docId),
  )
  return key.startsWith(`${legacyPrefix}/`) || key === legacyPrefix
}
