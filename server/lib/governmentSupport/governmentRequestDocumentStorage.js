/**
 * 요청서류 업로드 R2 object key.
 * @module governmentRequestDocumentStorage
 */
import { joinR2Key, stripR2ObjectRootIfPresent, withR2ObjectRoot } from '../r2KeyPolicy.js'
import { sanitizeGovernmentProfileFileName } from './governmentProfileFileStorage.js'

/**
 * @param {{
 *   ownerUserId: string,
 *   profileId: string|number,
 *   requestId: string|number,
 *   itemId: string|number,
 *   fileId: string|number,
 *   fileName: string,
 * }}
 */
export function buildGovernmentRequestDocumentObjectKey({
  ownerUserId,
  profileId,
  requestId,
  itemId,
  fileId,
  fileName,
}) {
  const ownerSeg = String(ownerUserId ?? '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 128)
  const safeName = sanitizeGovernmentProfileFileName(fileName)
  const relative = joinR2Key(
    'government',
    'request-documents',
    ownerSeg || '_',
    String(profileId),
    String(requestId),
    String(itemId),
    String(fileId),
    safeName,
  )
  return withR2ObjectRoot(relative)
}

/**
 * @param {string} objectKey
 * @param {{ ownerUserId: string, profileId: string|number, requestId: string|number, itemId: string|number, fileId: string|number }} expected
 */
export function assertGovernmentRequestDocumentObjectKey(objectKey, expected) {
  const key = stripR2ObjectRootIfPresent(String(objectKey ?? ''))
  const ownerSeg = String(expected.ownerUserId ?? '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 128)
  const prefix = joinR2Key(
    'government',
    'request-documents',
    ownerSeg || '_',
    String(expected.profileId),
    String(expected.requestId),
    String(expected.itemId),
    String(expected.fileId),
  )
  return key.startsWith(`${prefix}/`) || key === prefix
}
