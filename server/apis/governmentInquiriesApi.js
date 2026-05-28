/**
 * 정부지원 문의 API (고객앱 my + 대행사 admin).
 * @module governmentInquiriesApi
 */
import {
  canAccessGovernmentTenant,
  createGovernmentSupportGuards,
  isGovernmentIndustryAdmin,
  isGovernmentProgramUser,
  isGovernmentSuperAdmin,
  resolveGovernmentTenantScopeForQuery,
} from '../lib/governmentSupport/governmentAccess.js'
import {
  GOV_INQUIRY_FILE_MAX_BYTES,
  isValidGovInquiryStatus,
  mapGovInquiryFileRow,
  mapGovInquiryMessageRow,
  mapGovInquiryRow,
  resolveGovInquirySenderRole,
  resolveProgramUserTenantId,
  validateGovInquiryUpload,
} from '../lib/governmentSupport/governmentInquiries.js'
import {
  assertGovernmentInquiryObjectKey,
  buildGovernmentInquiryObjectKey,
} from '../lib/governmentSupport/governmentInquiryStorage.js'
import {
  notifyInquiryCreated,
  notifyInquiryReplied,
  notifyInquiryAssigned,
  safeEmitGovNotification,
} from '../lib/governmentSupport/governmentNotifications.js'
import {
  appendGovernmentAssigneeFilterSql,
  mapAssigneeDisplayFields,
  parseGovernmentAssigneeQuery,
  validateGovernmentOperationalAssignee,
} from '../lib/governmentSupport/governmentAssignees.js'
import {
  consentGetSignedDownloadUrl,
  getR2InsurerAttachmentsCacheControl,
  isConsentR2Enabled,
  logR2EnvDiagnosticCheck,
  r2GetPresignedPutUrl,
} from '../lib/consentStorage.js'

/**
 * @param {import('../lib/platformRbac.js').EffectivePlatformContext} ctx
 */
function canStaffAccessInquiries(ctx) {
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

/**
 * @param {import('express').Router} apiRouter
 * @param {{ pool: import('pg').Pool, requireAuth: Function, handleDbError: Function }} deps
 */
export function registerGovernmentInquiriesApi(apiRouter, deps) {
  const { pool, handleDbError } = deps
  const { requireGovernmentMember } = createGovernmentSupportGuards(pool, deps)

  const requireProgramUser = [
    ...requireGovernmentMember,
    (req, res, next) => {
      if (!isGovernmentProgramUser(req.platformContext)) {
        res.status(403).json({ message: '고객앱은 프로그램 이용자만 이용할 수 있습니다.' })
        return
      }
      next()
    },
  ]

  const requireStaffInquiries = [
    ...requireGovernmentMember,
    (req, res, next) => {
      if (!canStaffAccessInquiries(req.platformContext)) {
        res.status(403).json({ message: '문의 관리 권한이 없습니다.' })
        return
      }
      next()
    },
  ]

  async function loadInquiryForOwner(inquiryId, ownerUserId) {
    const r = await pool.query(
      `
      SELECT i.*,
        (SELECT COUNT(*)::int FROM gov_support_inquiry_messages m WHERE m.inquiry_id = i.id AND m.archived_at IS NULL) AS message_count,
        (SELECT COUNT(*)::int FROM gov_support_inquiry_files f WHERE f.inquiry_id = i.id AND f.archived_at IS NULL) AS file_count
      FROM gov_support_inquiries i
      WHERE i.id = $1::bigint AND i.owner_user_id = $2 AND i.archived_at IS NULL
      LIMIT 1
      `,
      [inquiryId, ownerUserId],
    )
    return r.rows[0] ?? null
  }

  async function loadInquiryForStaff(inquiryId, tenantIds) {
    const r = await pool.query(
      `
      SELECT i.*,
        (SELECT COUNT(*)::int FROM gov_support_inquiry_messages m WHERE m.inquiry_id = i.id AND m.archived_at IS NULL) AS message_count,
        (SELECT COUNT(*)::int FROM gov_support_inquiry_files f WHERE f.inquiry_id = i.id AND f.archived_at IS NULL) AS file_count
      FROM gov_support_inquiries i
      WHERE i.id = $1::bigint AND i.tenant_id = ANY($2::bigint[]) AND i.archived_at IS NULL
      LIMIT 1
      `,
      [inquiryId, tenantIds],
    )
    return r.rows[0] ?? null
  }

  async function resolveOwnerProfileId(ownerUserId, tenantId) {
    const r = await pool.query(
      `
      SELECT id FROM gov_support_profiles
      WHERE owner_user_id = $1 AND tenant_id = $2::bigint
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      `,
      [ownerUserId, tenantId],
    )
    return r.rows[0]?.id != null ? String(r.rows[0].id) : null
  }

  async function listMessagesForInquiry(inquiryId) {
    const r = await pool.query(
      `
      SELECT m.*, u.username AS sender_username
      FROM gov_support_inquiry_messages m
      LEFT JOIN users u ON u.id = m.sender_user_id
      WHERE m.inquiry_id = $1::bigint AND m.archived_at IS NULL
      ORDER BY m.created_at ASC, m.id ASC
      LIMIT 500
      `,
      [inquiryId],
    )
    return r.rows.map(mapGovInquiryMessageRow)
  }

  async function listFilesForInquiry(inquiryId) {
    const r = await pool.query(
      `
      SELECT * FROM gov_support_inquiry_files
      WHERE inquiry_id = $1::bigint AND archived_at IS NULL
      ORDER BY created_at ASC, id ASC
      `,
      [inquiryId],
    )
    return r.rows.map(mapGovInquiryFileRow)
  }

  apiRouter.get('/government-support/my/inquiries', ...requireProgramUser, async (req, res) => {
    try {
      const ctx = req.platformContext
      const r = await pool.query(
        `
        SELECT i.*,
          (SELECT COUNT(*)::int FROM gov_support_inquiry_messages m WHERE m.inquiry_id = i.id AND m.archived_at IS NULL) AS message_count,
          (SELECT COUNT(*)::int FROM gov_support_inquiry_files f WHERE f.inquiry_id = i.id AND f.archived_at IS NULL) AS file_count
        FROM gov_support_inquiries i
        WHERE i.owner_user_id = $1 AND i.archived_at IS NULL
        ORDER BY i.updated_at DESC, i.id DESC
        LIMIT 100
        `,
        [ctx.userId],
      )
      res.json({ success: true, data: r.rows.map(mapGovInquiryRow) })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.post('/government-support/my/inquiries', ...requireProgramUser, async (req, res) => {
    try {
      const ctx = req.platformContext
      const tenantId = resolveProgramUserTenantId(ctx)
      if (!tenantId) {
        res.status(403).json({ message: '프로그램 이용자 테넌트 정보가 없습니다.' })
        return
      }
      const title = String(req.body?.title ?? '').trim()
      const content = String(req.body?.content ?? req.body?.message ?? '').trim()
      if (!content) {
        res.status(400).json({ message: '문의 내용을 입력해 주세요.' })
        return
      }
      const finalTitle =
        title || (content.length > 120 ? `${content.slice(0, 117)}...` : content)
      const profileId = await resolveOwnerProfileId(ctx.userId, tenantId)
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const ins = await client.query(
          `
          INSERT INTO gov_support_inquiries (
            profile_id, owner_user_id, tenant_id, title, content,
            status, created_by_user_id
          ) VALUES ($1::bigint, $2, $3::bigint, $4, $5, 'open', $2)
          RETURNING *
          `,
          [profileId, ctx.userId, tenantId, finalTitle, content],
        )
        const inquiry = ins.rows[0]
        await client.query(
          `
          INSERT INTO gov_support_inquiry_messages (
            inquiry_id, owner_user_id, sender_user_id, sender_role, message
          ) VALUES ($1::bigint, $2, $2, 'government_user', $3)
          `,
          [inquiry.id, ctx.userId, content],
        )
        await client.query('COMMIT')
        await safeEmitGovNotification(pool, (p) =>
          notifyInquiryCreated(p, {
            tenantId,
            actorUserId: ctx.userId,
            ownerUserId: ctx.userId,
            profileId: inquiry.profile_id,
            inquiryId: inquiry.id,
            inquiryTitle: finalTitle,
          }),
        )
        res.status(201).json({ success: true, data: mapGovInquiryRow(inquiry) })
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

  apiRouter.get('/government-support/my/inquiries/:inquiryId', ...requireProgramUser, async (req, res) => {
    try {
      const ctx = req.platformContext
      const inquiryId = String(req.params.inquiryId ?? '').trim()
      const row = await loadInquiryForOwner(inquiryId, ctx.userId)
      if (!row) {
        res.status(404).json({ message: '문의를 찾을 수 없습니다.' })
        return
      }
      const messages = await listMessagesForInquiry(inquiryId)
      const files = await listFilesForInquiry(inquiryId)
      res.json({
        success: true,
        data: {
          ...mapGovInquiryRow(row),
          messages,
          files,
        },
      })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.post('/government-support/my/inquiries/:inquiryId/messages', ...requireProgramUser, async (req, res) => {
    try {
      const ctx = req.platformContext
      const inquiryId = String(req.params.inquiryId ?? '').trim()
      const message = String(req.body?.message ?? req.body?.content ?? '').trim()
      if (!message) {
        res.status(400).json({ message: '메시지를 입력해 주세요.' })
        return
      }
      const row = await loadInquiryForOwner(inquiryId, ctx.userId)
      if (!row) {
        res.status(404).json({ message: '문의를 찾을 수 없습니다.' })
        return
      }
      const ins = await pool.query(
        `
        INSERT INTO gov_support_inquiry_messages (
          inquiry_id, owner_user_id, sender_user_id, sender_role, message
        ) VALUES ($1::bigint, $2, $2, 'government_user', $3)
        RETURNING *
        `,
        [inquiryId, ctx.userId, message],
      )
      await pool.query(
        `
        UPDATE gov_support_inquiries
        SET updated_at = NOW(), last_replied_at = NOW()
        WHERE id = $1::bigint
        `,
        [inquiryId],
      )
      res.status(201).json({ success: true, data: mapGovInquiryMessageRow(ins.rows[0]) })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.post('/government-support/my/inquiries/:inquiryId/files/presign', ...requireProgramUser, async (req, res) => {
    try {
      logR2EnvDiagnosticCheck()
      if (!isConsentR2Enabled()) {
        res.status(503).json({ message: '파일 저장소가 설정되지 않았습니다.' })
        return
      }
      const ctx = req.platformContext
      const inquiryId = String(req.params.inquiryId ?? '').trim()
      const row = await loadInquiryForOwner(inquiryId, ctx.userId)
      if (!row) {
        res.status(404).json({ message: '문의를 찾을 수 없습니다.' })
        return
      }
      const fileName = String(req.body?.fileName ?? '').trim() || 'file'
      const contentType = String(req.body?.contentType ?? req.body?.mimeType ?? '').trim()
      const sizeBytes = Number(req.body?.fileSize ?? req.body?.sizeBytes ?? 0)
      const messageId = req.body?.messageId != null ? String(req.body.messageId) : null
      const validated = validateGovInquiryUpload(contentType, sizeBytes)
      if (!validated.ok) {
        res.status(400).json({ message: validated.message })
        return
      }
      const fileIns = await pool.query(
        `
        INSERT INTO gov_support_inquiry_files (
          inquiry_id, message_id, owner_user_id, file_name, file_key, file_size, mime_type
        ) VALUES ($1::bigint, $2::bigint, $3, $4, '', $5, $6)
        RETURNING id
        `,
        [inquiryId, messageId, ctx.userId, fileName, sizeBytes, validated.mime],
      )
      const fileId = fileIns.rows[0].id
      const objectKey = buildGovernmentInquiryObjectKey({
        ownerUserId: ctx.userId,
        inquiryId,
        messageId,
        fileId,
        fileName,
      })
      await pool.query(`UPDATE gov_support_inquiry_files SET file_key = $2 WHERE id = $1::bigint`, [
        fileId,
        objectKey,
      ])
      const uploadUrl = await r2GetPresignedPutUrl(objectKey, validated.mime, GOV_INQUIRY_FILE_MAX_BYTES)
      res.json({
        success: true,
        data: {
          fileId: String(fileId),
          objectKey,
          uploadUrl,
          putHeaders: { 'Content-Type': validated.mime },
        },
      })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.post('/government-support/my/inquiries/:inquiryId/files', ...requireProgramUser, async (req, res) => {
    try {
      const ctx = req.platformContext
      const inquiryId = String(req.params.inquiryId ?? '').trim()
      const fileId = String(req.body?.fileId ?? '').trim()
      const row = await loadInquiryForOwner(inquiryId, ctx.userId)
      if (!row) {
        res.status(404).json({ message: '문의를 찾을 수 없습니다.' })
        return
      }
      const fr = await pool.query(
        `
        SELECT * FROM gov_support_inquiry_files
        WHERE id = $1::bigint AND inquiry_id = $2::bigint AND owner_user_id = $3 AND archived_at IS NULL
        `,
        [fileId, inquiryId, ctx.userId],
      )
      const fileRow = fr.rows[0]
      if (!fileRow) {
        res.status(404).json({ message: '파일을 찾을 수 없습니다.' })
        return
      }
      if (!assertGovernmentInquiryObjectKey(fileRow.file_key, {
        ownerUserId: ctx.userId,
        inquiryId,
        messageId: fileRow.message_id,
        fileId,
      })) {
        res.status(400).json({ message: '파일 경로가 올바르지 않습니다.' })
        return
      }
      res.json({ success: true, data: mapGovInquiryFileRow(fileRow) })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get('/government-support/admin/inquiries', ...requireStaffInquiries, async (req, res) => {
    try {
      const ctx = req.platformContext
      const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
      if (!scope.ok) {
        res.status(scope.status).json({ message: scope.message })
        return
      }
      const tenantIds = scope.tenantIds
      if (tenantIds.length === 0) {
        res.json({ success: true, data: [] })
        return
      }
      const statusFilter = String(req.query?.status ?? '').trim()
      const assigneeFilter = parseGovernmentAssigneeQuery(req.query?.assignee, ctx.userId)
      const params = [tenantIds]
      let statusSql = ''
      if (statusFilter && isValidGovInquiryStatus(statusFilter)) {
        params.push(statusFilter)
        statusSql = ` AND i.status = $${params.length}`
      }
      const assigneeSql = appendGovernmentAssigneeFilterSql({
        filter: assigneeFilter,
        tableAlias: 'i',
        params,
        currentUserId: ctx.userId,
      })
      const r = await pool.query(
        `
        SELECT i.*,
          (SELECT COUNT(*)::int FROM gov_support_inquiry_messages m WHERE m.inquiry_id = i.id AND m.archived_at IS NULL) AS message_count,
          (SELECT COUNT(*)::int FROM gov_support_inquiry_files f WHERE f.inquiry_id = i.id AND f.archived_at IS NULL) AS file_count,
          COALESCE(NULLIF(TRIM(p.business_name), ''), p.customer_name, '') AS owner_display_name,
          COALESCE(NULLIF(TRIM(au.display_name), ''), au.username, '') AS assigned_to_display_name,
          au.username AS assigned_to_username
        FROM gov_support_inquiries i
        LEFT JOIN gov_support_profiles p ON p.id = i.profile_id
        LEFT JOIN users au ON au.id = i.assigned_to_user_id
        WHERE i.tenant_id = ANY($1::bigint[]) AND i.archived_at IS NULL${statusSql}${assigneeSql}
        ORDER BY i.updated_at DESC, i.id DESC
        LIMIT 200
        `,
        params,
      )
      res.json({
        success: true,
        data: r.rows.map((row) => ({
          ...mapGovInquiryRow(row),
          ...mapAssigneeDisplayFields(row),
          ownerDisplayName: String(row.owner_display_name ?? ''),
        })),
      })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get('/government-support/admin/inquiries/:inquiryId', ...requireStaffInquiries, async (req, res) => {
    try {
      const ctx = req.platformContext
      const inquiryId = String(req.params.inquiryId ?? '').trim()
      const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
      if (!scope.ok) {
        res.status(scope.status).json({ message: scope.message })
        return
      }
      const row = await loadInquiryForStaff(inquiryId, scope.tenantIds)
      if (!row) {
        res.status(404).json({ message: '문의를 찾을 수 없습니다.' })
        return
      }
      const messages = await listMessagesForInquiry(inquiryId)
      const files = await listFilesForInquiry(inquiryId)
      const fileRows = await Promise.all(
        files.map(async (f) => {
          let downloadUrl = ''
          if (f.fileKey && isConsentR2Enabled()) {
            try {
              downloadUrl = await consentGetSignedDownloadUrl(f.fileKey, {
                responseContentDisposition: `attachment; filename="${encodeURIComponent(f.fileName)}"`,
                cacheControl: getR2InsurerAttachmentsCacheControl(),
              })
            } catch {
              downloadUrl = ''
            }
          }
          return { ...f, downloadUrl }
        }),
      )
      res.json({
        success: true,
        data: {
          ...mapGovInquiryRow(row),
          messages,
          files: fileRows,
        },
      })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.post('/government-support/admin/inquiries/:inquiryId/messages', ...requireStaffInquiries, async (req, res) => {
    try {
      const ctx = req.platformContext
      const inquiryId = String(req.params.inquiryId ?? '').trim()
      const message = String(req.body?.message ?? req.body?.content ?? '').trim()
      if (!message) {
        res.status(400).json({ message: '답변 내용을 입력해 주세요.' })
        return
      }
      const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
      if (!scope.ok) {
        res.status(scope.status).json({ message: scope.message })
        return
      }
      const row = await loadInquiryForStaff(inquiryId, scope.tenantIds)
      if (!row) {
        res.status(404).json({ message: '문의를 찾을 수 없습니다.' })
        return
      }
      const senderRole = resolveGovInquirySenderRole(ctx)
      const ins = await pool.query(
        `
        INSERT INTO gov_support_inquiry_messages (
          inquiry_id, owner_user_id, sender_user_id, sender_role, message
        ) VALUES ($1::bigint, $2, $3, $4, $5)
        RETURNING *
        `,
        [inquiryId, row.owner_user_id, ctx.userId, senderRole, message],
      )
      await pool.query(
        `
        UPDATE gov_support_inquiries
        SET status = 'replied', updated_at = NOW(), last_replied_at = NOW(),
            assigned_to_user_id = COALESCE(assigned_to_user_id, $2)
        WHERE id = $1::bigint
        `,
        [inquiryId, ctx.userId],
      )
      await safeEmitGovNotification(pool, (p) =>
        notifyInquiryReplied(p, {
          tenantId: row.tenant_id,
          ownerUserId: String(row.owner_user_id ?? ''),
          profileId: row.profile_id,
          inquiryId,
          inquiryTitle: String(row.title ?? ''),
        }),
      )
      const withUser = await pool.query(
        `SELECT m.*, u.username AS sender_username FROM gov_support_inquiry_messages m
         LEFT JOIN users u ON u.id = m.sender_user_id WHERE m.id = $1::bigint`,
        [ins.rows[0].id],
      )
      res.status(201).json({ success: true, data: mapGovInquiryMessageRow(withUser.rows[0]) })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.patch('/government-support/admin/inquiries/:inquiryId', ...requireStaffInquiries, async (req, res) => {
    try {
      const ctx = req.platformContext
      const inquiryId = String(req.params.inquiryId ?? '').trim()
      const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
      if (!scope.ok) {
        res.status(scope.status).json({ message: scope.message })
        return
      }
      const row = await loadInquiryForStaff(inquiryId, scope.tenantIds)
      if (!row) {
        res.status(404).json({ message: '문의를 찾을 수 없습니다.' })
        return
      }
      const status = req.body?.status != null ? String(req.body.status).trim() : null
      const assignedTo = req.body?.assignedToUserId != null ? String(req.body.assignedToUserId).trim() : null
      if (status && !isValidGovInquiryStatus(status)) {
        res.status(400).json({ message: 'status는 open, replied, closed 중 하나여야 합니다.' })
        return
      }
      const sets = []
      const params = [inquiryId]
      if (status) {
        params.push(status)
        sets.push(`status = $${params.length}`)
      }
      if (assignedTo !== null) {
        const validated = await validateGovernmentOperationalAssignee(pool, row.tenant_id, assignedTo || null)
        if (!validated.ok) {
          res.status(validated.status).json({ message: validated.message })
          return
        }
        params.push(validated.assigneeUserId)
        sets.push(`assigned_to_user_id = $${params.length}`)
      }
      if (sets.length === 0) {
        res.status(400).json({ message: '변경할 항목이 없습니다.' })
        return
      }
      sets.push('updated_at = NOW()')
      const upd = await pool.query(
        `UPDATE gov_support_inquiries SET ${sets.join(', ')} WHERE id = $1::bigint RETURNING *`,
        params,
      )
      const updated = upd.rows[0]
      if (assignedTo !== null) {
        const prevAssignee = row.assigned_to_user_id != null ? String(row.assigned_to_user_id) : null
        const nextAssignee = updated.assigned_to_user_id != null ? String(updated.assigned_to_user_id) : null
        if (nextAssignee && nextAssignee !== prevAssignee) {
          await safeEmitGovNotification(pool, (p) =>
            notifyInquiryAssigned(p, {
              tenantId: row.tenant_id,
              assigneeUserId: nextAssignee,
              actorUserId: ctx.userId,
              ownerUserId: String(row.owner_user_id ?? ''),
              profileId: row.profile_id,
              inquiryId,
              inquiryTitle: String(row.title ?? ''),
            }),
          )
        }
      }
      res.json({ success: true, data: mapGovInquiryRow(updated) })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.patch(
    '/government-support/admin/inquiries/:inquiryId/assignee',
    ...requireStaffInquiries,
    async (req, res) => {
      try {
        const ctx = req.platformContext
        const inquiryId = String(req.params.inquiryId ?? '').trim()
        const scope = await resolveGovernmentTenantScopeForQuery(pool, ctx)
        if (!scope.ok) {
          res.status(scope.status).json({ message: scope.message })
          return
        }
        const row = await loadInquiryForStaff(inquiryId, scope.tenantIds)
        if (!row) {
          res.status(404).json({ message: '문의를 찾을 수 없습니다.' })
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
          UPDATE gov_support_inquiries
          SET assigned_to_user_id = $2, updated_at = NOW()
          WHERE id = $1::bigint
          RETURNING *
          `,
          [inquiryId, validated.assigneeUserId],
        )
        const updated = upd.rows[0]
        const nextAssignee = updated.assigned_to_user_id != null ? String(updated.assigned_to_user_id) : null
        if (nextAssignee && nextAssignee !== prevAssignee) {
          await safeEmitGovNotification(pool, (p) =>
            notifyInquiryAssigned(p, {
              tenantId: row.tenant_id,
              assigneeUserId: nextAssignee,
              actorUserId: ctx.userId,
              ownerUserId: String(row.owner_user_id ?? ''),
              profileId: row.profile_id,
              inquiryId,
              inquiryTitle: String(row.title ?? ''),
            }),
          )
        }
        res.json({ success: true, data: mapGovInquiryRow(updated) })
      } catch (e) {
        handleDbError(e, req, res)
      }
    },
  )
}
