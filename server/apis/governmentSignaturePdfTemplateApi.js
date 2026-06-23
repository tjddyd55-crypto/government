/**
 * 정부지원 이용자 전용 PDF 템플릿 API (좌표 에디터 — pdf-engine 재사용).
 */
import multer from 'multer'
import { PDFDocument } from 'pdf-lib'
import { normalizeFieldSpecList } from '../pdf-engine/schema/fieldSpec.js'
import { inputRoleFromPdfFieldRow } from '../pdf-engine/schema/inputRole.js'
import { createTemplateWithAutoCode } from '../pdf-engine/code/templateCode.js'
import {
  createTemplate,
  deleteTemplate,
  getTemplateById,
  listFields,
  replaceTemplateFields,
} from '../pdf-engine/repository/pdfTemplateRepo.js'
import { reconcileGovSignatureFieldSettingsAfterPdfSave } from '../services/governmentSignatureTemplateFieldSettings.js'
import { getTemplateObject, putTemplateObject } from '../pdf-engine/storage/pdfTemplateStorage.js'
import { buildGovPdfTemplateListWhere,
  canAccessGovPdfTemplateRow,
  canManageGovPdfTemplateRow,
  getAuthUserId,
  resolveGovSignatureTemplateTenantId,
  resolveGovernmentSignatureAccessScope,
} from '../lib/governmentSignatures/access.js'
import { validateGovSignaturePdfTemplateScope } from '../lib/governmentSignatures/governmentSignaturePdfTemplateScope.js'
import { buildGovernmentSignaturePdfTemplateUploadKey } from '../lib/governmentSupport/governmentR2Keys.js'

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
})

function parseTemplateId(raw) {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) return null
  return n
}

function templateToDto(row) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description ?? '',
    pageCount: row.page_count,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    govTenantId: row.gov_tenant_id != null ? Number(row.gov_tenant_id) : null,
    tenantName: row.tenant_name != null ? String(row.tenant_name) : null,
    fieldCount: Number(row.field_count) || 0,
    linkedTemplateCount: Number(row.linked_template_count) || 0,
  }
}

function fieldRowToDto(row) {
  return {
    id: row.id,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type,
    required: row.required,
    orderIndex: row.order_index,
    inputRole: inputRoleFromPdfFieldRow(row),
    options: Array.isArray(row.options) ? row.options : null,
    placements: Array.isArray(row.placements) ? row.placements : [],
  }
}

async function loadGovPdfRow(pool, id) {
  const r = await pool.query(
    `SELECT id, title, storage_key, page_count, is_active, code, description, created_at, updated_at, gov_owner_user_id, gov_tenant_id
     FROM pdf_templates WHERE id = $1 LIMIT 1`,
    [id],
  )
  return r.rows[0] ?? null
}

/**
 * @param {import('express').Router} apiRouter
 * @param {{ pool: import('pg').Pool, chain: import('express').RequestHandler[], handleDbError: Function }} ctx
 */
export function registerGovernmentSignaturePdfTemplateApi(apiRouter, ctx) {
  const { pool, chain, handleDbError } = ctx
  const base = '/government-support/signature-templates/pdf'

  apiRouter.post(
    `${base}/upload`,
    ...chain,
    (req, res, next) => {
      uploadPdf.single('pdf')(req, res, (err) => {
        if (err) {
          res.status(400).json({ message: err.message || 'PDF 업로드 실패' })
          return
        }
        next()
      })
    },
    async (req, res) => {
      try {
        const ownerUserId = getAuthUserId(req)
        if (!ownerUserId) {
          res.status(401).json({ message: '로그인이 필요합니다.' })
          return
        }
        const scopeCheck = await validateGovSignaturePdfTemplateScope(req, pool)
        if (!scopeCheck.ok) {
          res.status(scopeCheck.status).json({ message: scopeCheck.message })
          return
        }
        req.body = {
          ...(req.body ?? {}),
          scopeType: scopeCheck.scopeType,
          tenantId: scopeCheck.tenantId ?? undefined,
        }
        const file = req.file
        if (!file?.buffer?.length) {
          res.status(400).json({ message: 'PDF 파일이 필요합니다.' })
          return
        }
        const pdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true })
        const pageCount = pdfDoc.getPageCount()
        const code = `gov-${ownerUserId.slice(0, 8)}-${Date.now()}`
        const tenantId = resolveGovSignatureTemplateTenantId(req)
        const storageKey = buildGovernmentSignaturePdfTemplateUploadKey({
          ownerUserId,
          code,
          pdfTemplateId: code,
          tenantId,
        })
        await putTemplateObject(storageKey, file.buffer)
        res.status(201).json({ ok: true, storageKey, pageCount, code })
      } catch (e) {
        handleDbError(e, req, res)
      }
    },
  )

  apiRouter.post(`${base}`, ...chain, async (req, res) => {
    try {
      const scope = resolveGovernmentSignatureAccessScope(req)
      const ownerUserId = getAuthUserId(req)
      if (!scope || !ownerUserId) {
        res.status(403).json({ message: '전자서명 권한이 필요합니다.' })
        return
      }
      const scopeCheck = await validateGovSignaturePdfTemplateScope(req, pool)
      if (!scopeCheck.ok) {
        res.status(scopeCheck.status).json({ message: scopeCheck.message })
        return
      }
      req.body = {
        ...(req.body ?? {}),
        scopeType: scopeCheck.scopeType,
        tenantId: scopeCheck.tenantId ?? undefined,
      }
      const tenantId = resolveGovSignatureTemplateTenantId(req)
      const body = req.body ?? {}
      const storageKey = String(body.storageKey ?? '').trim()
      const title = String(body.title ?? '').trim() || '전자서명 PDF'
      const pageCount = Math.max(1, Number(body.pageCount) || 1)
      if (!storageKey) {
        res.status(400).json({ message: 'storageKey 가 필요합니다.' })
        return
      }
      const created = await createTemplateWithAutoCode(pool, createTemplate, {
        gaId: null,
        title,
        description: String(body.description ?? ''),
        storageKey,
        pageCount,
        createdByUserId: ownerUserId,
      })
      await pool.query(`UPDATE pdf_templates SET gov_owner_user_id = $1, gov_tenant_id = $2 WHERE id = $3`, [
        ownerUserId,
        tenantId != null ? Number(tenantId) : null,
        created.id,
      ])
      const full = await pool.query(`SELECT * FROM pdf_templates WHERE id = $1`, [created.id])
      res.status(201).json({ ok: true, template: templateToDto(full.rows[0]) })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get(`${base}`, ...chain, async (req, res) => {
    try {
      const scope = resolveGovernmentSignatureAccessScope(req)
      if (!scope) {
        res.status(403).json({ message: '전자서명 권한이 필요합니다.' })
        return
      }
      const listWhere = buildGovPdfTemplateListWhere(scope)
      if (listWhere.sql === 'FALSE') {
        res.json({ ok: true, templates: [] })
        return
      }
      const r = await pool.query(
        `
        SELECT
          pt.id,
          pt.code,
          pt.title,
          pt.description,
          pt.page_count,
          pt.is_active,
          pt.created_at,
          pt.updated_at,
          pt.gov_tenant_id,
          tn.name AS tenant_name,
          (
            SELECT COUNT(*)::int
            FROM pdf_template_fields f
            WHERE f.template_id = pt.id
          ) AS field_count,
          (
            SELECT COUNT(*)::int
            FROM gov_signature_templates gst
            WHERE gst.pdf_template_id = pt.id
          ) AS linked_template_count
        FROM pdf_templates pt
        LEFT JOIN tenants tn ON tn.id = pt.gov_tenant_id
        WHERE ${listWhere.sql}
        ORDER BY pt.updated_at DESC
        LIMIT 500
        `,
        listWhere.params,
      )
      res.json({ ok: true, templates: r.rows.map(templateToDto) })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get(`${base}/:id`, ...chain, async (req, res) => {
    try {
      const id = parseTemplateId(req.params.id)
      if (id == null) {
        res.status(400).json({ message: '잘못된 요청입니다.' })
        return
      }
      const merged = await loadGovPdfRow(pool, id)
      if (!merged || !canAccessGovPdfTemplateRow(req, merged)) {
        res.status(404).json({ message: 'PDF 템플릿을 찾을 수 없습니다.' })
        return
      }
      const fields = await listFields(pool, id)
      res.json({ ok: true, template: templateToDto(merged), fields: fields.map(fieldRowToDto) })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.put(`${base}/:id/fields`, ...chain, async (req, res) => {
    try {
      const id = parseTemplateId(req.params.id)
      if (id == null) {
        res.status(400).json({ message: '잘못된 요청입니다.' })
        return
      }
      const merged = await loadGovPdfRow(pool, id)
      if (!merged || !canManageGovPdfTemplateRow(req, merged)) {
        res.status(404).json({ message: 'PDF 템플릿을 찾을 수 없습니다.' })
        return
      }
      const specs = normalizeFieldSpecList(req.body?.fields ?? req.body ?? [])
      await replaceTemplateFields(pool, id, specs)
      const client = await pool.connect()
      try {
        await reconcileGovSignatureFieldSettingsAfterPdfSave(client, id)
      } finally {
        client.release()
      }
      const fields = await listFields(pool, id)
      res.json({ ok: true, fields: fields.map(fieldRowToDto) })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.get(`${base}/:id/file`, ...chain, async (req, res) => {
    try {
      const id = parseTemplateId(req.params.id)
      if (id == null) {
        res.status(400).json({ message: '잘못된 요청입니다.' })
        return
      }
      const merged = await loadGovPdfRow(pool, id)
      if (!merged || !canAccessGovPdfTemplateRow(req, merged)) {
        res.status(404).json({ message: 'PDF 템플릿을 찾을 수 없습니다.' })
        return
      }
      const buf = await getTemplateObject(merged.storage_key)
      res.setHeader('Content-Type', 'application/pdf')
      res.send(buf)
    } catch (e) {
      handleDbError(e, req, res)
    }
  })

  apiRouter.delete(`${base}/:id`, ...chain, async (req, res) => {
    try {
      const id = parseTemplateId(req.params.id)
      if (id == null) {
        res.status(400).json({ message: '잘못된 요청입니다.' })
        return
      }
      const merged = await loadGovPdfRow(pool, id)
      if (!merged || !canManageGovPdfTemplateRow(req, merged)) {
        res.status(404).json({ message: 'PDF 템플릿을 찾을 수 없습니다.' })
        return
      }
      await deleteTemplate(pool, id)
      res.json({ ok: true })
    } catch (e) {
      handleDbError(e, req, res)
    }
  })
}
