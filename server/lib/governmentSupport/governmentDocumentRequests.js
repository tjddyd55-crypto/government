/**
 * gov_support_document_requests 매핑.
 * @module governmentDocumentRequests
 */

/**
 * @param {Record<string, unknown>} row
 */
export function mapGovDocumentRequestRow(row) {
  const createdAt = row.created_at
  const updatedAt = row.updated_at
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    profileId: String(row.profile_id),
    ownerUserId: String(row.owner_user_id ?? ''),
    applicationId: row.application_id != null ? String(row.application_id) : null,
    title: String(row.title ?? ''),
    message: String(row.message ?? ''),
    status: String(row.status ?? 'open'),
    createdByUserId: row.created_by_user_id != null ? String(row.created_by_user_id) : null,
    createdAt:
      createdAt instanceof Date ? createdAt.toISOString() : createdAt != null ? String(createdAt) : new Date().toISOString(),
    updatedAt:
      updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt != null ? String(updatedAt) : new Date().toISOString(),
  }
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapGovDocumentRequestItemRow(row) {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    docType: String(row.doc_type ?? ''),
    label: String(row.label ?? ''),
    status: String(row.status ?? '요청 전'),
    sortOrder: Number(row.sort_order ?? 0),
    fileCount: Number(row.file_count ?? 0),
  }
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapGovDocumentRequestFileRow(row) {
  const createdAt = row.created_at
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    itemId: String(row.item_id),
    profileId: String(row.profile_id),
    fileName: String(row.file_name ?? ''),
    fileKey: String(row.file_key ?? ''),
    fileSize: Number(row.file_size ?? 0),
    mimeType: String(row.mime_type ?? ''),
    createdAt:
      createdAt instanceof Date ? createdAt.toISOString() : createdAt != null ? String(createdAt) : new Date().toISOString(),
  }
}

/**
 * @param {unknown} rawItems
 */
export function parseDocumentRequestItemsInput(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, status: 400, message: '요청 서류 항목을 1개 이상 지정해 주세요.' }
  }
  /** @type {{ docType: string, label: string, sortOrder: number }[]} */
  const items = []
  for (let i = 0; i < rawItems.length; i += 1) {
    const raw = rawItems[i]
    if (!raw || typeof raw !== 'object') {
      continue
    }
    const docType = String(raw.docType ?? raw.doc_type ?? '').trim()
    const label = String(raw.label ?? raw.docType ?? raw.doc_type ?? '').trim()
    if (!label) {
      return { ok: false, status: 400, message: `서류 항목 ${i + 1}의 이름을 입력해 주세요.` }
    }
    items.push({ docType: docType || label, label, sortOrder: i })
  }
  if (items.length === 0) {
    return { ok: false, status: 400, message: '요청 서류 항목을 1개 이상 지정해 주세요.' }
  }
  return { ok: true, items }
}
