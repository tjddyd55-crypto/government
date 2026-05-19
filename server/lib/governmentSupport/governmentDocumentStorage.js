/**
 * 정부지원 CRM 전용 R2 object key (보험 customer_files / storage API 와 분리).
 */
import { randomUUID } from 'crypto'
import { joinR2Key, withR2ObjectRoot } from '../r2KeyPolicy.js'

/** @param {unknown} raw */
export function sanitizeGovernmentDocumentFileName(raw) {
  return String(raw ?? 'file')
    .trim()
    .replace(/[^\w.\-()\u3131-\u318e\uac00-\ud7a3]/g, '_')
    .slice(0, 120)
}

/**
 * @param {string|number} tenantId
 * @param {string|number} profileId
 * @param {string|number} docId
 * @param {string} fileName
 */
export function buildGovernmentDocumentObjectKey(tenantId, profileId, docId, fileName) {
  const safe = sanitizeGovernmentDocumentFileName(fileName)
  const relative = joinR2Key(
    'government',
    'tenants',
    String(tenantId),
    'profiles',
    String(profileId),
    'documents',
    String(docId),
    `${randomUUID()}_${safe}`,
  )
  return withR2ObjectRoot(relative)
}
