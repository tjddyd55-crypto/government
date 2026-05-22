/**
 * 문의 첨부 R2 object key.
 * @module governmentInquiryStorage
 */
import { joinR2Key, stripR2ObjectRootIfPresent, withR2ObjectRoot } from '../r2KeyPolicy.js'
import { sanitizeGovernmentProfileFileName } from './governmentProfileFileStorage.js'

/**
 * @param {{
 *   ownerUserId: string,
 *   inquiryId: string|number,
 *   messageId?: string|number|null,
 *   fileId: string|number,
 *   fileName: string,
 * }}
 */
export function buildGovernmentInquiryObjectKey({
  ownerUserId,
  inquiryId,
  messageId,
  fileId,
  fileName,
}) {
  const ownerSeg = String(ownerUserId ?? '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 128)
  const messageSeg = messageId != null && String(messageId).trim() !== '' ? String(messageId) : 'root'
  const safeName = sanitizeGovernmentProfileFileName(fileName)
  const relative = joinR2Key(
    'government',
    'inquiries',
    ownerSeg || '_',
    String(inquiryId),
    messageSeg,
    String(fileId),
    safeName,
  )
  return withR2ObjectRoot(relative)
}

/**
 * @param {string} objectKey
 * @param {{ ownerUserId: string, inquiryId: string|number, messageId?: string|number|null, fileId: string|number }} expected
 */
export function assertGovernmentInquiryObjectKey(objectKey, expected) {
  const key = stripR2ObjectRootIfPresent(String(objectKey ?? ''))
  const ownerSeg = String(expected.ownerUserId ?? '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 128)
  const messageSeg =
    expected.messageId != null && String(expected.messageId).trim() !== '' ? String(expected.messageId) : 'root'
  const prefix = joinR2Key(
    'government',
    'inquiries',
    ownerSeg || '_',
    String(expected.inquiryId),
    messageSeg,
    String(expected.fileId),
  )
  return key.startsWith(`${prefix}/`) || key === prefix
}
