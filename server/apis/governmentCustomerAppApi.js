/**
 * 정부지원 고객앱(유저앱) API — 보험 customer-app API 대응.
 * @module governmentCustomerAppApi
 */
import {
  canAccessGovernmentTenant,
  createGovernmentSupportGuards,
  isGovernmentIndustryAdmin,
  isGovernmentProgramUser,
  isGovernmentSuperAdmin,
  resolveGovernmentTenantScopeForQuery,
} from '../lib/governmentSupport/governmentAccess.js'
import { loadGovernmentProfileAccessRow } from '../lib/governmentSupport/governmentProfileAccessHelpers.js'
import {
  mapGovDocumentRequestFileRow,
  mapGovDocumentRequestItemRow,
  mapGovDocumentRequestRow,
  parseDocumentRequestItemsInput,
} from '../lib/governmentSupport/governmentDocumentRequests.js'
import { mapGovSupportProfileProgressEventRow } from '../lib/governmentSupport/governmentProfileProgress.js'
import {
  GOV_PROFILE_FILE_ALLOWED_MIME,
  GOV_PROFILE_FILE_BLOCKED_MIME,
  isValidGovProfileFileName,
  normalizeGovProfileFileName,
  resolveGovProfileFileContentType,
} from '../lib/governmentSupport/governmentProfileFiles.js'
import {
  notifyDocumentRequestSubmitted,
  notifyDocumentRequestAssigned,
  safeEmitGovNotification,
} from '../lib/governmentSupport/governmentNotifications.js'
import {
  appendGovernmentAssigneeFilterSql,
  mapAssigneeDisplayFields,
  parseGovernmentAssigneeQuery,
  validateGovernmentOperationalAssignee,
} from '../lib/governmentSupport/governmentAssignees.js'
import {
  assertGovernmentRequestDocumentObjectKey,
  buildGovernmentRequestDocumentObjectKey,
} from '../lib/governmentSupport/governmentRequestDocumentStorage.js'
import {
  consentGetSignedDownloadUrl,
  getR2InsurerAttachmentsCacheControl,
  isConsentR2Enabled,
  logR2EnvDiagnosticCheck,
  r2GetPresignedPutUrl,
} from '../lib/consentStorage.js'

const REQUEST_DOC_MAX_BYTES = 10 * 1024 * 1024

/**
 * @param {import('../lib/platformRbac.js').EffectivePlatformContext} ctx
 * @param {{ tenant_id?: string|number|null, owner_user_id?: string|null }} profileRow
 */
function canStaffAccessDocumentRequests(ctx) {
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

function canAgencyCreateDocumentRequest(ctx, profileRow) {
  if (isGovernmentProgramUser(ctx)) {
    return false
  }
  const tenantId = profileRow?.tenant_id != null ? String(profileRow.tenant_id) : ''
  if (!tenantId || !canAccessGovernmentTenant(ctx, tenantId)) {
    return false
  }
  return canStaffAccessDocumentRequests(ctx) && canAccessGovernmentTenant(ctx, tenantId)
}

/**
 * @param {import('express').Router} apiRouter
 * @param {{ pool: import('pg').Pool, requireAuth: Function, handleDbError: Function }} deps
 */
export function registerGovernmentCustomerAppApi(apiRouter, deps) {
  const { pool, handleDbError } = deps
  const { requireGovernmentMember } = createGovernmentSupportGuards(pool, deps)

  const requireProgramUser = [
    ...requireGovernmentMember,
    (req, res, next) => {
      const ctx = req.platformContext
      if (!isGovernmentProgramUser(ctx)) {
        res.status(403).json({ message: '고객앱은 프로그램 이용자만 이용할 수 있습니다.' })
        return
      }
      next()
    },
  ]

  const requireStaffDocumentRequests = [
    ...requireGovernmentMember,
    (req, res, next) => {
      if (!canStaffAccessDocumentRequests(req.platformContext)) {
        res.status(403).json({ message: '요청서류 관리 권한이 없습니다.' })
        return
      }
      next()
    },
  ]

  async function loadDocumentRequestForStaff(requestId, tenantIds) {
    const r = await pool.query(
      `
      SELECT r.*,
        (SELECT COUNT(*)::int FROM gov_support_document_request_items i WHERE i.request_id = r.id) AS item_count,
        (SELECT COUNT(*)::int FROM gov_support_document_request_items i WHERE i.request_id = r.id AND i.status IN ('제출 완료', '검토 완료', '최종 완료')) AS submitted_count,
        COALESCE(NULLIF(TRIM(p.business_name), ''), p.customer_name, '') AS profile_display_name
      FROM gov_support_document_requests r
      LEFT JOIN gov_support_profiles p ON p.id = r.profile_id
      WHERE r.id = $1::bigint AND r.tenant_id = ANY($2::bigint[]) AND r.archived_at IS NULL
      LIMIT 1
      `,
      [requestId, tenantIds],
    )
    return r.rows[0] ?? null
  }

  async function loadRequestForOwner(requestId, ownerUserId) {
    const r = await pool.query(
      `
      SELECT *
      FROM gov_support_document_requests
      WHERE id = $1::bigint AND owner_user_id = $2 AND archived_at IS NULL
      LIMIT 1
      `,
      [requestId, ownerUserId],
    )
    return r.rows[0] ?? null
  }

  async function loadRequestItemForOwner(itemId, requestId, ownerUserId) {
    const r = await pool.query(
      `
      SELECT i.*, r.profile_id, r.owner_user_id, r.tenant_id
      FROM gov_support_document_request_items i
      INNER JOIN gov_support_document_requests r ON r.id = i.request_id
      WHERE i.id = $1::bigint AND i.request_id = $2::bigint
        AND r.owner_user_id = $3 AND r.archived_at IS NULL
      LIMIT 1
      `,
      [itemId, requestId, ownerUserId],
    )
    return r.rows[0] ?? null
  }

  async function syncRequestAggregateStatus(client, requestId) {
    const counts = await client.query(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('제출 완료', '검토 완료', '최종 완료'))::int AS submitted
      FROM gov_support_document_request_items
      WHERE request_id = $1::bigint
      `,
      [requestId],
    )
    const total = counts.rows[0]?.total ?? 0
    const submitted = counts.rows[0]?.submitted ?? 0
    let status = 'open'
    if (total > 0 && submitted >= total) {
      status = 'completed'
    } else if (submitted > 0) {
      status = 'partial'
    }
    await client.query(
      `UPDATE gov_support_document_requests SET status = $2, updated_at = NOW() WHERE id = $1::bigint`,
      [requestId, status],
    )
  }

  apiRouter.post('/government-support/profiles/:profileId/document-requests', ...requireGovernmentMember, async (req, res) => {
    try {
      const ctx = req.platformContext
      const profileId = String(req.params.profileId ?? '').trim()
      const profileRow = await loadGovernmentProfileAccessRow(pool, profileId)
      if (!profileRow) {
        res.status(404).json({ message: '프로필을 찾을 수 없습니다.' })
        return
      }
      if (!canAgencyCreateDocumentRequest(ctx, profileRow)) {
        res.status(403).json({ message: '요청서류는 대행사 직원·관리자만 등록할 수 있습니다.' })
        return
      }
      const b = req.body ?? {}
      const title = String(b.title ?? '요청 서류').trim() || '요청 서류'
      const message = String(b.message ?? b.content ?? '').trim()
      const parsedItems = parseDocumentRequestItemsInput(b.items ?? b.documents)
      if (!parsedItems.ok) {
        res.status(parsedItems.status).json({ message: parsedItems.message })
        return
      }
      const ownerUserId = String(profileRow.owner_user_id ?? '')
      const tenantId = profileRow.tenant_id
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const ins = await client.query(
          `
          INSERT INTO gov_support_document_requests (
            tenant_id, profile_id, owner_user_id, title, message,
            created_by_user_id, updated_by_user_id
          ) VALUES ($1::bigint, $2::bigint, $3, $4, $5, $6, $6)
          RETURNING *
          `,
          [tenantId, profileId, ownerUserId, title, message, ctx.userId],
        )
        const requestId = ins.rows[0].id
        for (const item of parsedItems.items) {
          await client.query(
            `
            INSERT INTO gov_support_document_request_items (request_id, doc_type, label, sort_order)
            VALUES ($1::bigint, $2, $3, $4)
            `,
            [requestId, item.docType, item.label, item.sortOrder],
          )
        }
        await client.query('COMMIT')
        res.status(201).json({ success: true, data: mapGovDocumentRequestRow(ins.rows[0]) })
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get('/government-support/my/document-requests', ...requireProgramUser, async (req, res) => {
    try {
      const ctx = req.platformContext
      const r = await pool.query(
        `
        SELECT r.*,
          (SELECT COUNT(*)::int FROM gov_support_document_request_items i WHERE i.request_id = r.id) AS item_count,
          (SELECT COUNT(*)::int FROM gov_support_document_request_items i WHERE i.request_id = r.id AND i.status IN ('제출 완료', '검토 완료', '최종 완료')) AS submitted_count
        FROM gov_support_document_requests r
        WHERE r.owner_user_id = $1 AND r.archived_at IS NULL
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 100
        `,
        [ctx.userId],
      )
      res.json({
        success: true,
        data: r.rows.map((row) => ({
          ...mapGovDocumentRequestRow(row),
          itemCount: Number(row.item_count ?? 0),
          submittedCount: Number(row.submitted_count ?? 0),
        })),
      })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get('/government-support/my/document-requests/:requestId', ...requireProgramUser, async (req, res) => {
    try {
      const ctx = req.platformContext
      const requestId = String(req.params.requestId ?? '').trim()
      const row = await loadRequestForOwner(requestId, ctx.userId)
      if (!row) {
        res.status(404).json({ message: '요청서류를 찾을 수 없습니다.' })
        return
      }
      const itemsR = await pool.query(
        `
        SELECT i.*,
          (SELECT COUNT(*)::int FROM gov_support_document_request_files f
           WHERE f.item_id = i.id AND f.archived_at IS NULL) AS file_count
        FROM gov_support_document_request_items i
        WHERE i.request_id = $1::bigint
        ORDER BY i.sort_order ASC, i.id ASC
        `,
        [requestId],
      )
      const filesR = await pool.query(
        `
        SELECT *
        FROM gov_support_document_request_files
        WHERE request_id = $1::bigint AND archived_at IS NULL
        ORDER BY created_at DESC, id DESC
        `,
        [requestId],
      )
      const filesByItem = new Map()
      for (const f of filesR.rows) {
        const itemId = String(f.item_id)
        if (!filesByItem.has(itemId)) {
          filesByItem.set(itemId, [])
        }
        filesByItem.get(itemId).push(mapGovDocumentRequestFileRow(f))
      }
      const items = itemsR.rows.map((item) => ({
        ...mapGovDocumentRequestItemRow(item),
        files: filesByItem.get(String(item.id)) ?? [],
      }))
      res.json({
        success: true,
        data: {
          ...mapGovDocumentRequestRow(row),
          items,
        },
      })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.post(
    '/government-support/my/document-requests/:requestId/items/:itemId/files/presign',
    ...requireProgramUser,
    async (req, res) => {
      try {
        if (!isConsentR2Enabled()) {
          logR2EnvDiagnosticCheck()
          res.status(503).json({ message: '파일 저장소가 구성되지 않았습니다.' })
          return
        }
        const ctx = req.platformContext
        const requestId = String(req.params.requestId ?? '').trim()
        const itemId = String(req.params.itemId ?? '').trim()
        const itemRow = await loadRequestItemForOwner(itemId, requestId, ctx.userId)
        if (!itemRow) {
          res.status(404).json({ message: '요청 항목을 찾을 수 없습니다.' })
          return
        }
        const body = req.body ?? {}
        const fileName = normalizeGovProfileFileName(body.fileName ?? body.file_name ?? '')
        const contentType = resolveGovProfileFileContentType(body.contentType ?? body.content_type ?? body.mimeType)
        const sizeBytes = Number(body.sizeBytes ?? body.size ?? body.fileSize ?? 0)
        if (!isValidGovProfileFileName(fileName)) {
          res.status(400).json({ message: '파일 이름이 올바르지 않습니다.' })
          return
        }
        if (GOV_PROFILE_FILE_BLOCKED_MIME.has(contentType) || !GOV_PROFILE_FILE_ALLOWED_MIME.has(contentType)) {
          res.status(400).json({ message: '허용되지 않은 파일 형식입니다.' })
          return
        }
        if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || sizeBytes > REQUEST_DOC_MAX_BYTES) {
          res.status(400).json({ message: '파일 크기가 허용 범위를 벗어났습니다.' })
          return
        }
        const ownerUserId = String(itemRow.owner_user_id ?? ctx.userId)
        const profileId = String(itemRow.profile_id)
        const ins = await pool.query(
          `
          INSERT INTO gov_support_document_request_files (
            request_id, item_id, profile_id, owner_user_id,
            file_name, file_key, file_size, mime_type, created_by_user_id
          ) VALUES ($1::bigint, $2::bigint, $3::bigint, $4, $5, '', $6, $7, $8)
          RETURNING id
          `,
          [requestId, itemId, profileId, ownerUserId, fileName, sizeBytes, contentType, ctx.userId],
        )
        const fileId = String(ins.rows[0].id)
        const objectKey = buildGovernmentRequestDocumentObjectKey({
          tenantId: String(itemRow.tenant_id ?? ''),
          userId: ownerUserId,
          profileId,
          requestId,
          fileId,
          fileName,
        })
        await pool.query(
          `UPDATE gov_support_document_request_files SET file_key = $2, updated_at = NOW() WHERE id = $1::bigint`,
          [fileId, objectKey],
        )
        const cacheControl = getR2InsurerAttachmentsCacheControl()
        const uploadUrl = await r2GetPresignedPutUrl(objectKey, contentType, 900, { cacheControl })
        if (!uploadUrl) {
          await pool.query(`DELETE FROM gov_support_document_request_files WHERE id = $1::bigint`, [fileId])
          res.status(503).json({ message: '업로드 URL을 만들 수 없습니다.' })
          return
        }
        res.status(201).json({
          success: true,
          data: {
            fileId,
            objectKey,
            uploadUrl,
            putHeaders: cacheControl ? { 'Cache-Control': cacheControl } : {},
          },
        })
      } catch (e) {
        handleDbError(e, req, res)
      }
    },
  )

  apiRouter.post(
    '/government-support/my/document-requests/:requestId/items/:itemId/files',
    ...requireProgramUser,
    async (req, res) => {
      try {
        const ctx = req.platformContext
        const requestId = String(req.params.requestId ?? '').trim()
        const itemId = String(req.params.itemId ?? '').trim()
        const itemRow = await loadRequestItemForOwner(itemId, requestId, ctx.userId)
        if (!itemRow) {
          res.status(404).json({ message: '요청 항목을 찾을 수 없습니다.' })
          return
        }
        const fileId = String(req.body?.fileId ?? req.body?.file_id ?? '').trim()
        if (!fileId) {
          res.status(400).json({ message: 'fileId가 필요합니다.' })
          return
        }
        const fr = await pool.query(
          `
          SELECT *
          FROM gov_support_document_request_files
          WHERE id = $1::bigint AND item_id = $2::bigint AND request_id = $3::bigint
            AND owner_user_id = $4 AND archived_at IS NULL
          LIMIT 1
          `,
          [fileId, itemId, requestId, ctx.userId],
        )
        if ((fr.rowCount ?? 0) === 0) {
          res.status(404).json({ message: '파일을 찾을 수 없습니다.' })
          return
        }
        const fileRow = fr.rows[0]
        if (
          !assertGovernmentRequestDocumentObjectKey(String(fileRow.file_key ?? ''), {
            tenantId: String(itemRow.tenant_id ?? ''),
            ownerUserId: ctx.userId,
            profileId: String(itemRow.profile_id),
            requestId,
            itemId,
            fileId,
          })
        ) {
          res.status(400).json({ message: '파일 경로가 올바르지 않습니다.' })
          return
        }
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          await client.query(
            `UPDATE gov_support_document_request_items SET status = '제출 완료', updated_at = NOW() WHERE id = $1::bigint`,
            [itemId],
          )
          await syncRequestAggregateStatus(client, requestId)
          await client.query('COMMIT')
        } catch (e) {
          await client.query('ROLLBACK')
          throw e
        } finally {
          client.release()
        }
        const metaR = await pool.query(
          `
          SELECT r.tenant_id, r.title AS request_title, i.label AS item_label,
            r.profile_id, r.owner_user_id
          FROM gov_support_document_requests r
          INNER JOIN gov_support_document_request_items i ON i.request_id = r.id
          WHERE r.id = $1::bigint AND i.id = $2::bigint
          LIMIT 1
          `,
          [requestId, itemId],
        )
        const meta = metaR.rows[0]
        if (meta) {
          await safeEmitGovNotification(pool, (p) =>
            notifyDocumentRequestSubmitted(p, {
              tenantId: meta.tenant_id,
              actorUserId: ctx.userId,
              ownerUserId: String(meta.owner_user_id ?? ctx.userId),
              profileId: meta.profile_id,
              requestId,
              requestTitle: String(meta.request_title ?? ''),
              itemLabel: String(meta.item_label ?? ''),
            }),
          )
        }
        res.status(200).json({ success: true, data: mapGovDocumentRequestFileRow(fileRow) })
      } catch (e) {
        handleDbError(e, req, res)
      }
    },
  )

  apiRouter.delete(
    '/government-support/my/document-requests/:requestId/items/:itemId/files/:fileId',
    ...requireProgramUser,
    async (req, res) => {
      try {
        const ctx = req.platformContext
        const requestId = String(req.params.requestId ?? '').trim()
        const itemId = String(req.params.itemId ?? '').trim()
        const fileId = String(req.params.fileId ?? '').trim()
        const itemRow = await loadRequestItemForOwner(itemId, requestId, ctx.userId)
        if (!itemRow) {
          res.status(404).json({ message: '요청 항목을 찾을 수 없습니다.' })
          return
        }
        const r = await pool.query(
          `
          UPDATE gov_support_document_request_files
          SET archived_at = NOW(), updated_at = NOW()
          WHERE id = $1::bigint AND item_id = $2::bigint AND request_id = $3::bigint
            AND owner_user_id = $4 AND archived_at IS NULL
          RETURNING id
          `,
          [fileId, itemId, requestId, ctx.userId],
        )
        if ((r.rowCount ?? 0) === 0) {
          res.status(404).json({ message: '파일을 찾을 수 없습니다.' })
          return
        }
        const remain = await pool.query(
          `
          SELECT COUNT(*)::int AS c FROM gov_support_document_request_files
          WHERE item_id = $1::bigint AND archived_at IS NULL
          `,
          [itemId],
        )
        if ((remain.rows[0]?.c ?? 0) === 0) {
          await pool.query(
            `UPDATE gov_support_document_request_items SET status = '요청 전', updated_at = NOW() WHERE id = $1::bigint`,
            [itemId],
          )
        }
        await syncRequestAggregateStatus(pool, requestId)
        res.json({ success: true, data: { id: fileId, ok: true } })
      } catch (e) {
        handleDbError(e, req, res)
      }
    },
  )

  apiRouter.get('/government-support/my/progress', ...requireProgramUser, async (req, res) => {
    try {
      const ctx = req.platformContext
      const r = await pool.query(
        `
        SELECT e.*
        FROM gov_support_profile_progress_events e
        INNER JOIN gov_support_profiles p ON p.id = e.profile_id
        WHERE p.owner_user_id = $1 AND e.archived_at IS NULL
        ORDER BY e.event_date DESC NULLS LAST, e.created_at DESC, e.id DESC
        LIMIT 100
        `,
        [ctx.userId],
      )
      res.json({ success: true, data: r.rows.map(mapGovSupportProfileProgressEventRow) })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  function mapCustomerAppSignatureRow(row) {
    const sessionStatus = String(row.session_status ?? row.status ?? '')
    let displayStatus = '발송됨'
    if (sessionStatus === 'cancelled') displayStatus = '취소'
    else if (sessionStatus === 'expired') displayStatus = '만료'
    else if (sessionStatus === 'completed') displayStatus = '완료'
    else if (row.opened_at) displayStatus = '열람됨'
    else if (row.has_signed_not_completed) displayStatus = '서명 완료'
    return {
      id: String(row.id),
      signToken: String(row.sign_token ?? ''),
      profileId: String(row.profile_id),
      profileDisplayName: String(row.profile_display_name ?? ''),
      templateNames: String(row.template_names ?? ''),
      status: sessionStatus,
      displayStatus,
      sentAt: row.sent_at instanceof Date ? row.sent_at.toISOString() : row.sent_at != null ? String(row.sent_at) : null,
      openedAt: row.opened_at instanceof Date ? row.opened_at.toISOString() : row.opened_at != null ? String(row.opened_at) : null,
      completedAt:
        row.completed_at instanceof Date ? row.completed_at.toISOString() : row.completed_at != null ? String(row.completed_at) : null,
      expiredAt: row.expired_at instanceof Date ? row.expired_at.toISOString() : row.expired_at != null ? String(row.expired_at) : null,
      hasSignedPdf: Boolean(row.has_signed_pdf_file),
      firstCompletedDocumentId: row.first_completed_document_id != null ? String(row.first_completed_document_id) : null,
    }
  }

  apiRouter.get('/government-support/my/signatures', ...requireProgramUser, async (req, res) => {
    try {
      const ctx = req.platformContext
      const r = await pool.query(
        `
        SELECT
          s.id,
          s.sign_token,
          s.profile_id,
          s.status AS session_status,
          s.sent_at,
          s.opened_at,
          s.completed_at,
          s.expired_at,
          COALESCE(NULLIF(TRIM(p.business_name), ''), p.customer_name) AS profile_display_name,
          COALESCE(doc_agg.template_names, '') AS template_names,
          COALESCE(doc_agg.has_signed_pdf_file, false) AS has_signed_pdf_file,
          COALESCE(doc_agg.has_signed_not_completed, false) AS has_signed_not_completed,
          doc_agg.first_completed_document_id
        FROM gov_signature_send_sessions s
        INNER JOIN gov_support_profiles p ON p.id = s.profile_id
        LEFT JOIN LATERAL (
          SELECT
            string_agg(title_snapshot, ' · ' ORDER BY sort_order ASC, created_at ASC) AS template_names,
            BOOL_OR(status = 'completed' AND signed_pdf_file_id IS NOT NULL) AS has_signed_pdf_file,
            BOOL_OR(status = 'signed') AS has_signed_not_completed,
            (SELECT id FROM gov_signature_document_instances di
             WHERE di.send_session_id = s.id AND di.status = 'completed'
             ORDER BY sort_order ASC, created_at ASC LIMIT 1) AS first_completed_document_id
          FROM gov_signature_document_instances
          WHERE send_session_id = s.id
        ) doc_agg ON true
        WHERE s.owner_user_id = $1
        ORDER BY s.created_at DESC
        LIMIT 100
        `,
        [ctx.userId],
      )
      res.json({ success: true, data: r.rows.map(mapCustomerAppSignatureRow) })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get('/government-support/my/signatures/:id/download', ...requireProgramUser, async (req, res) => {
    try {
      const ctx = req.platformContext
      const sid = String(req.params.id ?? '').trim()
      const docId = String(req.query.documentId ?? req.query.documentInstanceId ?? '').trim()
      const sessionR = await pool.query(
        `
        SELECT s.id FROM gov_signature_send_sessions s
        WHERE s.id = $1 AND s.owner_user_id = $2
        LIMIT 1
        `,
        [sid, ctx.userId],
      )
      if ((sessionR.rowCount ?? 0) === 0) {
        res.status(404).json({ message: '전자서명 내역을 찾을 수 없습니다.' })
        return
      }
      let resolvedDocId = docId
      if (!resolvedDocId) {
        const pick = await pool.query(
          `
          SELECT id FROM gov_signature_document_instances
          WHERE send_session_id = $1 AND status = 'completed' AND signed_pdf_file_id IS NOT NULL
          ORDER BY sort_order ASC, created_at ASC LIMIT 1
          `,
          [sid],
        )
        resolvedDocId = pick.rows[0]?.id != null ? String(pick.rows[0].id) : ''
      }
      if (!resolvedDocId) {
        res.status(404).json({ message: '완료 PDF가 아직 준비되지 않았습니다.' })
        return
      }
      const d = await pool.query(
        `
        SELECT cdi.status, cdi.signed_pdf_file_id, cdi.title_snapshot
        FROM gov_signature_document_instances cdi
        WHERE cdi.id = $1 AND cdi.send_session_id = $2
        LIMIT 1
        `,
        [resolvedDocId, sid],
      )
      if ((d.rowCount ?? 0) === 0 || String(d.rows[0].status ?? '') !== 'completed') {
        res.status(403).json({ message: '완료된 문서만 다운로드할 수 있습니다.' })
        return
      }
      const fid = d.rows[0].signed_pdf_file_id
      const fk = await pool.query(`SELECT file_path FROM files WHERE id = $1 LIMIT 1`, [String(fid).trim()])
      const storageKey = fk.rows[0]?.file_path
      if (!storageKey) {
        res.status(404).json({ message: '파일을 찾을 수 없습니다.' })
        return
      }
      const downloadUrl = await consentGetSignedDownloadUrl(String(storageKey), 900)
      if (!downloadUrl) {
        res.status(503).json({ message: '다운로드 URL을 만들 수 없습니다.' })
        return
      }
      res.json({
        success: true,
        data: {
          downloadUrl,
          fileName: `${String(d.rows[0].title_snapshot ?? '완료계약서').trim() || '완료계약서'}.pdf`,
          documentInstanceId: resolvedDocId,
        },
      })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get('/government-support/admin/document-requests', ...requireStaffDocumentRequests, async (req, res) => {
    try {
      const ctx = req.platformContext
      const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
      if (!scope.ok) {
        res.status(scope.status).json({ message: scope.message })
        return
      }
      if (scope.tenantIds.length === 0) {
        res.json({ success: true, data: [] })
        return
      }
      const statusFilter = String(req.query?.status ?? '').trim()
      const assigneeFilter = parseGovernmentAssigneeQuery(req.query?.assignee, ctx.userId)
      const params = [scope.tenantIds]
      let statusSql = ''
      if (statusFilter) {
        params.push(statusFilter)
        statusSql = ` AND r.status = $${params.length}`
      }
      const assigneeSql = appendGovernmentAssigneeFilterSql({
        filter: assigneeFilter,
        tableAlias: 'r',
        params,
        currentUserId: ctx.userId,
      })
      const r = await pool.query(
        `
        SELECT r.*,
          (SELECT COUNT(*)::int FROM gov_support_document_request_items i WHERE i.request_id = r.id) AS item_count,
          (SELECT COUNT(*)::int FROM gov_support_document_request_items i WHERE i.request_id = r.id AND i.status IN ('제출 완료', '검토 완료', '최종 완료')) AS submitted_count,
          COALESCE(NULLIF(TRIM(p.business_name), ''), p.customer_name, '') AS profile_display_name,
          COALESCE(NULLIF(TRIM(au.display_name), ''), au.username, '') AS assigned_to_display_name,
          au.username AS assigned_to_username
        FROM gov_support_document_requests r
        LEFT JOIN gov_support_profiles p ON p.id = r.profile_id
        LEFT JOIN users au ON au.id = r.assigned_to_user_id
        WHERE r.tenant_id = ANY($1::bigint[]) AND r.archived_at IS NULL${statusSql}${assigneeSql}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 200
        `,
        params,
      )
      res.json({
        success: true,
        data: r.rows.map((row) => ({
          ...mapGovDocumentRequestRow(row),
          ...mapAssigneeDisplayFields(row),
          profileDisplayName: String(row.profile_display_name ?? ''),
          itemCount: Number(row.item_count ?? 0),
          submittedCount: Number(row.submitted_count ?? 0),
        })),
      })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get('/government-support/admin/document-requests/:requestId', ...requireStaffDocumentRequests, async (req, res) => {
    try {
      const ctx = req.platformContext
      const requestId = String(req.params.requestId ?? '').trim()
      const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
      if (!scope.ok) {
        res.status(scope.status).json({ message: scope.message })
        return
      }
      const row = await loadDocumentRequestForStaff(requestId, scope.tenantIds)
      if (!row) {
        res.status(404).json({ message: '요청서류를 찾을 수 없습니다.' })
        return
      }
      const itemsR = await pool.query(
        `
        SELECT i.*,
          (SELECT COUNT(*)::int FROM gov_support_document_request_files f
           WHERE f.item_id = i.id AND f.archived_at IS NULL) AS file_count
        FROM gov_support_document_request_items i
        WHERE i.request_id = $1::bigint
        ORDER BY i.sort_order ASC, i.id ASC
        `,
        [requestId],
      )
      const filesR = await pool.query(
        `
        SELECT *
        FROM gov_support_document_request_files
        WHERE request_id = $1::bigint AND archived_at IS NULL
        ORDER BY created_at DESC, id DESC
        `,
        [requestId],
      )
      const filesByItem = new Map()
      for (const f of filesR.rows) {
        const mapped = mapGovDocumentRequestFileRow(f)
        let downloadUrl = ''
        if (mapped.fileKey && isConsentR2Enabled()) {
          try {
            downloadUrl = (await consentGetSignedDownloadUrl(String(mapped.fileKey), 900)) ?? ''
          } catch {
            downloadUrl = ''
          }
        }
        const itemId = String(f.item_id)
        if (!filesByItem.has(itemId)) {
          filesByItem.set(itemId, [])
        }
        filesByItem.get(itemId).push({ ...mapped, downloadUrl })
      }
      const items = itemsR.rows.map((item) => ({
        ...mapGovDocumentRequestItemRow(item),
        files: filesByItem.get(String(item.id)) ?? [],
      }))
      res.json({
        success: true,
        data: {
          ...mapGovDocumentRequestRow(row),
          profileDisplayName: String(row.profile_display_name ?? ''),
          itemCount: Number(row.item_count ?? 0),
          submittedCount: Number(row.submitted_count ?? 0),
          items,
        },
      })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get(
    '/government-support/admin/document-requests/:requestId/items/:itemId/files/:fileId/download',
    ...requireStaffDocumentRequests,
    async (req, res) => {
      try {
        const requestId = String(req.params.requestId ?? '').trim()
        const itemId = String(req.params.itemId ?? '').trim()
        const fileId = String(req.params.fileId ?? '').trim()
        const scope = await resolveGovernmentTenantScopeForQuery(pool, req.platformContext)
        if (!scope.ok) {
          res.status(scope.status).json({ message: scope.message })
          return
        }
        const row = await loadDocumentRequestForStaff(requestId, scope.tenantIds)
        if (!row) {
          res.status(404).json({ message: '요청서류를 찾을 수 없습니다.' })
          return
        }
        const fr = await pool.query(
          `
          SELECT f.*
          FROM gov_support_document_request_files f
          WHERE f.id = $1::bigint AND f.item_id = $2::bigint AND f.request_id = $3::bigint AND f.archived_at IS NULL
          LIMIT 1
          `,
          [fileId, itemId, requestId],
        )
        if ((fr.rowCount ?? 0) === 0) {
          res.status(404).json({ message: '파일을 찾을 수 없습니다.' })
          return
        }
        const fileRow = fr.rows[0]
        const downloadUrl = await consentGetSignedDownloadUrl(String(fileRow.file_key ?? ''), 900)
        if (!downloadUrl) {
          res.status(503).json({ message: '다운로드 URL을 만들 수 없습니다.' })
          return
        }
        res.json({
          success: true,
          data: { downloadUrl, fileName: String(fileRow.file_name ?? 'file') },
        })
      } catch (e) {
        handleDbError(e, req, res)
      }
    },
  )

  apiRouter.get(
    '/government-support/my/document-requests/:requestId/items/:itemId/files/:fileId/download',
    ...requireProgramUser,
    async (req, res) => {
      try {
        const ctx = req.platformContext
        const requestId = String(req.params.requestId ?? '').trim()
        const itemId = String(req.params.itemId ?? '').trim()
        const fileId = String(req.params.fileId ?? '').trim()
        const fr = await pool.query(
          `
          SELECT f.*
          FROM gov_support_document_request_files f
          INNER JOIN gov_support_document_requests r ON r.id = f.request_id
          WHERE f.id = $1::bigint AND f.item_id = $2::bigint AND f.request_id = $3::bigint
            AND f.owner_user_id = $4 AND r.owner_user_id = $4 AND f.archived_at IS NULL
          LIMIT 1
          `,
          [fileId, itemId, requestId, ctx.userId],
        )
        if ((fr.rowCount ?? 0) === 0) {
          res.status(404).json({ message: '파일을 찾을 수 없습니다.' })
          return
        }
        const fileRow = fr.rows[0]
        const downloadUrl = await consentGetSignedDownloadUrl(String(fileRow.file_key ?? ''), 900)
        if (!downloadUrl) {
          res.status(503).json({ message: '다운로드 URL을 만들 수 없습니다.' })
          return
        }
        res.json({
          success: true,
          data: { downloadUrl, fileName: String(fileRow.file_name ?? 'file') },
        })
      } catch (e) {
        handleDbError(e, req, res)
      }
    },
  )

  apiRouter.patch(
    '/government-support/admin/document-requests/:requestId/assignee',
    ...requireStaffDocumentRequests,
    async (req, res) => {
      try {
        const ctx = req.platformContext
        const requestId = String(req.params.requestId ?? '').trim()
        const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
        if (!scope.ok) {
          res.status(scope.status).json({ message: scope.message })
          return
        }
        const row = await loadDocumentRequestForStaff(requestId, scope.tenantIds)
        if (!row) {
          res.status(404).json({ message: '요청서류를 찾을 수 없습니다.' })
          return
        }
        const hasAssigneeKey =
          req.body?.assignedToUserId !== undefined ||
          req.body?.assigned_to_user_id !== undefined ||
          req.body?.assigneeUserId !== undefined
        if (!hasAssigneeKey) {
          res.status(400).json({ message: 'assignedToUserId가 필요합니다.' })
          return
        }
        const rawAssignee =
          req.body?.assignedToUserId ?? req.body?.assigned_to_user_id ?? req.body?.assigneeUserId
        const validated = await validateGovernmentOperationalAssignee(pool, row.tenant_id, rawAssignee)
        if (!validated.ok) {
          res.status(validated.status).json({ message: validated.message })
          return
        }
        const prevAssignee = row.assigned_to_user_id != null ? String(row.assigned_to_user_id) : null
        const upd = await pool.query(
          `
          UPDATE gov_support_document_requests
          SET assigned_to_user_id = $2, updated_by_user_id = $3, updated_at = NOW()
          WHERE id = $1::bigint
          RETURNING *
          `,
          [requestId, validated.assigneeUserId, ctx.userId],
        )
        const updated = upd.rows[0]
        const nextAssignee = updated.assigned_to_user_id != null ? String(updated.assigned_to_user_id) : null
        if (nextAssignee && nextAssignee !== prevAssignee) {
          await safeEmitGovNotification(pool, (p) =>
            notifyDocumentRequestAssigned(p, {
              tenantId: row.tenant_id,
              assigneeUserId: nextAssignee,
              actorUserId: ctx.userId,
              ownerUserId: String(row.owner_user_id ?? ''),
              profileId: row.profile_id,
              requestId,
              requestTitle: String(row.title ?? ''),
            }),
          )
        }
        res.json({ success: true, data: mapGovDocumentRequestRow(updated) })
      } catch (e) {
        handleDbError(e, req, res)
      }
    },
  )
}
