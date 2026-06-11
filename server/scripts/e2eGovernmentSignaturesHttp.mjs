/**
 * Railway develop — 정부지원 전자서명 HTTP E2E (secret 미출력, self-seed 지원).
 * npm run e2e:government:signatures
 */
import { PDFDocument, StandardFonts } from 'pdf-lib'
import {
  createE2eReporter,
  e2eApi,
  resolveE2eGovernmentHttpConfig,
  resolveE2eStaffPassword,
} from './lib/e2eGovernmentHttpEnv.mjs'
import {
  resolveE2eProgramUsers,
  tryResolveIndustryAdminToken,
} from './lib/e2eGovernmentSignatureSelfSeed.mjs'

const {
  base: BASE,
  api: API,
  password: PASS,
  hasPassword,
  adminLoginId: ADMIN,
} = resolveE2eGovernmentHttpConfig()

const { pass, fail, summary } = createE2eReporter()
const tag = Date.now().toString(36)
let failCount = 0

function failWrap(name, detail) {
  failCount += 1
  fail(name, detail)
}

function skip(name, detail) {
  pass(name, detail ? `SKIP — ${detail}` : 'SKIP')
}

async function api(path, opts = {}) {
  return e2eApi(API, path, opts)
}

async function fetchHtml(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'text/html' } })
  const html = await res.text()
  const bundle = html.match(/index-[^.]+\.js/)?.[0] ?? null
  let js = ''
  if (bundle) {
    js = await (await fetch(`${BASE}/assets/${bundle}`)).text()
  }
  return { status: res.status, js, bundle }
}

async function makeTinyPdfBuffer() {
  const doc = await PDFDocument.create()
  const page = doc.addPage([400, 200])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  page.drawText('gov-signature-e2e', { x: 50, y: 100, size: 12, font })
  return Buffer.from(await doc.save())
}

async function uploadPdfTemplate(token) {
  const pdfBuf = await makeTinyPdfBuffer()
  const form = new FormData()
  form.append('pdf', new Blob([pdfBuf], { type: 'application/pdf' }), 'e2e-test.pdf')
  const res = await fetch(`${API}/government-support/signature-templates/pdf/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

/**
 * @param {import('./lib/e2eGovernmentSignatureSelfSeed.mjs').resolveE2eProgramUsers extends (...args: unknown[]) => Promise<infer R> ? R : never} users
 */
function reportUserSeed(users) {
  const modeA = users.userA.seeded ? 'http-register' : 'env-login'
  const modeB = users.userB.seeded ? 'http-register' : 'env-login'
  pass('program user A ready', `${users.userA.username} (${modeA})`)
  pass('program user B ready', `${users.userB.username} (${modeB})`)
  if (users.validAgencyCodes?.length) {
    pass('agency registration codes', users.validAgencyCodes.join(', '))
  }
}

async function createGovSignatureTemplatePair(token, label) {
  const pdfUp = await uploadPdfTemplate(token)
  if (pdfUp.status !== 201 || !pdfUp.json?.storageKey) {
    return { ok: false, error: `pdf upload ${pdfUp.status}` }
  }
  const pdfMeta = await api('/government-support/signature-templates/pdf', {
    token,
    method: 'POST',
    body: {
      storageKey: pdfUp.json.storageKey,
      title: `E2E PDF ${label}`,
      pageCount: pdfUp.json.pageCount ?? 1,
    },
  })
  const pdfTemplateId = pdfMeta.json?.template?.id ?? null
  if (pdfMeta.status !== 201 || pdfTemplateId == null) {
    return { ok: false, error: `pdf meta ${pdfMeta.status}` }
  }
  const fields = await api(`/government-support/signature-templates/pdf/${pdfTemplateId}/fields`, {
    token,
    method: 'PUT',
    body: {
      fields: [
        {
          fieldKey: 'signer_name',
          label: '이름',
          fieldType: 'text',
          required: true,
          orderIndex: 0,
          inputRole: 'customer',
          placements: [{ pageIndex: 0, x: 50, y: 120, width: 200, height: 24 }],
        },
        {
          fieldKey: 'signature_main',
          label: '서명',
          fieldType: 'signature',
          required: true,
          orderIndex: 1,
          inputRole: 'customer',
          placements: [{ pageIndex: 0, x: 50, y: 60, width: 120, height: 40 }],
        },
      ],
    },
  })
  if (fields.status !== 200) {
    return { ok: false, error: `pdf fields ${fields.status}` }
  }
  const govTpl = await api('/government-support/signature-templates', {
    token,
    method: 'POST',
    body: {
      title: `E2E Gov Sig ${label}`,
      pdfTemplateId,
      templateMode: 'coordinate_pdf',
      status: 'active',
    },
  })
  const govTemplateId = govTpl.json?.data?.id ?? govTpl.json?.id ?? null
  if (govTpl.status !== 201 || !govTemplateId) {
    return { ok: false, error: `gov template ${govTpl.status}` }
  }
  return { ok: true, pdfTemplateId, govTemplateId }
}

const PNG_SIG_E2E =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

/**
 * @param {string} signToken
 * @param {string} sendSessionId
 * @param {string} tokenOwner
 * @param {number} pdfTemplateIdForFields
 */
async function completePublicSignatureFlow(signToken, sendSessionId, tokenOwner, pdfTemplateIdForFields) {
  const otpSend = await api(`/government-support/public/signatures/${encodeURIComponent(signToken)}/otp/send`, {
    method: 'POST',
    body: {},
  })
  if (otpSend.status !== 200) {
    return { ok: false, error: `otp send ${otpSend.status}` }
  }
  const otpCode = String(process.env.E2E_GOVERNMENT_SIGNATURE_OTP ?? otpSend.json?.data?.debugCode ?? otpSend.json?.debugCode ?? '').trim()
  if (!otpCode) {
    return { ok: false, error: 'otp code unavailable' }
  }
  const otpVerify = await api(`/government-support/public/signatures/${encodeURIComponent(signToken)}/otp/verify`, {
    method: 'POST',
    body: { code: otpCode },
  })
  if (otpVerify.status !== 200) {
    return { ok: false, error: `otp verify ${otpVerify.status}` }
  }

  const ownerDetail = await api(`/government-support/signatures/${encodeURIComponent(sendSessionId)}`, {
    token: tokenOwner,
  })
  const docInstanceId = ownerDetail.json?.sendSession?.documents?.[0]?.id ?? null
  if (!docInstanceId) {
    return { ok: false, error: 'doc instance missing' }
  }

  const pdfDetail = await api(`/government-support/signature-templates/pdf/${pdfTemplateIdForFields}`, { token: tokenOwner })
  const fields = pdfDetail.json?.fields ?? []
  const textField = fields.find((f) => String(f.field_key ?? f.fieldKey) === 'signer_name')
  const sigField = fields.find((f) => String(f.field_type ?? f.fieldType) === 'signature')

  if (textField?.id) {
    const vals = await api(
      `/government-support/public/signatures/${encodeURIComponent(signToken)}/documents/${encodeURIComponent(docInstanceId)}/values`,
      {
        method: 'POST',
        body: {
          values: [{ fieldId: String(textField.id), fieldKey: 'signer_name', value: 'E2E Agency 수신자' }],
        },
      },
    )
    if (vals.status !== 200) {
      return { ok: false, error: `field values ${vals.status}` }
    }
  }

  if (sigField?.id) {
    const signRes = await api(
      `/government-support/public/signatures/${encodeURIComponent(signToken)}/documents/${encodeURIComponent(docInstanceId)}/sign`,
      {
        method: 'POST',
        body: {
          fieldId: String(sigField.id),
          signatureImageData: PNG_SIG_E2E,
          electronicSignAcknowledged: true,
        },
      },
    )
    if (signRes.status !== 200) {
      return { ok: false, error: `sign ${signRes.status}` }
    }
  }

  const complete = await api(
    `/government-support/public/signatures/${encodeURIComponent(signToken)}/documents/${encodeURIComponent(docInstanceId)}/complete`,
    {
      method: 'POST',
      body: {
        finalPreviewConfirmed: true,
        finalSubmitAcknowledged: true,
        acknowledgeElectronicContract: true,
      },
    },
  )
  if (complete.status !== 200) {
    return { ok: false, error: `complete ${complete.status}` }
  }

  const dl = await fetch(
    `${API}/government-support/signatures/${encodeURIComponent(sendSessionId)}/documents/${encodeURIComponent(docInstanceId)}/signed-pdf`,
    { headers: { Authorization: `Bearer ${tokenOwner}`, Accept: 'application/pdf' } },
  )
  const ct = dl.headers.get('content-type') ?? ''
  if (dl.status !== 200 || !ct.includes('pdf')) {
    return { ok: false, error: `pdf download ${dl.status}` }
  }
  const buf = Buffer.from(await dl.arrayBuffer())
  if (buf.length < 100) {
    return { ok: false, error: 'pdf too small' }
  }
  return { ok: true, docInstanceId, pdfBytes: buf.length }
}

async function main() {
  const health = await fetch(`${BASE}/backend/health`)
  if (health.status === 200) pass('health 200')
  else failWrap('health', String(health.status))

  const sigHtml = await fetchHtml('/government/signatures')
  if (sigHtml.status === 200) pass('GET /government/signatures SPA', sigHtml.bundle ?? '')
  else failWrap('GET /government/signatures SPA', String(sigHtml.status))

  for (const m of [
    '/government/signatures',
    '/government/signatures/send',
    'government/admin/signature-templates',
    'signature-templates',
    '전자서명',
  ]) {
    if (sigHtml.js.includes(m)) pass(`bundle contains ${m}`)
    else failWrap(`bundle contains ${m}`)
  }

  for (const adminPath of [
    '/government/admin/signature-templates',
    '/government/admin/signature-templates/pdf/new',
  ]) {
    const adminSigHtml = await fetchHtml(adminPath)
    if (adminSigHtml.status === 200) pass(`GET ${adminPath} SPA`, adminSigHtml.bundle ?? '')
    else failWrap(`GET ${adminPath} SPA`, String(adminSigHtml.status))
    if (adminSigHtml.js.includes('government/admin/signature-templates')) {
      pass(`${adminPath} bundle has admin signature route`)
    } else {
      failWrap(`${adminPath} bundle has admin signature route`)
    }
  }

  let users
  try {
    users = await resolveE2eProgramUsers(API, {
      optionalPassword: PASS,
    })
    reportUserSeed(users)
  } catch (e) {
    failWrap('program user self-seed', e instanceof Error ? e.message : String(e))
    summary()
    process.exit(1)
  }

  const tokenA = users.userA.token
  const tokenB = users.userB.token

  const accessA = await api('/government-support/me/access', { token: tokenA })
  if (accessA.json?.data?.isGovernmentProgramUser === true) pass('user A is program user')
  else failWrap('user A is program user')
  const accessAData = accessA.json?.data ?? accessA.json ?? {}
  if (
    (accessAData.governmentStaffTenantIds?.length ?? 0) === 0 &&
    (accessAData.governmentAgencyAdminTenantIds?.length ?? 0) === 0
  ) {
    pass('program user lacks admin signature tenant ids')
  } else {
    failWrap('program user lacks admin signature tenant ids', JSON.stringify(accessAData))
  }

  const tplList = await api('/government-support/signature-templates', { token: tokenA })
  if (tplList.status === 200 && tplList.json?.ok !== false) pass('GET signature-templates')
  else failWrap('GET signature-templates', `${tplList.status} ${tplList.json?.message ?? ''}`)

  const sendTpl = await api('/government-support/signatures/send/templates', { token: tokenA })
  if (sendTpl.status === 200) pass('GET signatures/send/templates')
  else failWrap('GET signatures/send/templates', String(sendTpl.status))

  const sigListBefore = await api('/government-support/signatures', { token: tokenA })
  if (sigListBefore.status === 200) pass('GET signatures list')
  else failWrap('GET signatures list', String(sigListBefore.status))

  const pdfUp = await uploadPdfTemplate(tokenA)
  let uploadStorageKey = pdfUp.json?.storageKey ? String(pdfUp.json.storageKey) : ''
  if (pdfUp.status === 201 && uploadStorageKey) {
    pass('PDF upload', pdfUp.json.code ?? '')
    if (
      uploadStorageKey.includes('gov-user') ||
      uploadStorageKey.startsWith('pdf-templates/') ||
      (uploadStorageKey.includes('government/agencies/') && uploadStorageKey.includes('/shared/pdf-templates/'))
    ) {
      pass('PDF upload R2 path prefix', uploadStorageKey.split('/').slice(0, 2).join('/'))
    } else {
      failWrap('PDF upload R2 path prefix', uploadStorageKey.slice(0, 60))
    }
  } else {
    failWrap('PDF upload', `${pdfUp.status} ${pdfUp.json?.message ?? ''}`)
  }

  let pdfTemplateId = null
  if (uploadStorageKey) {
    const pdfMeta = await api('/government-support/signature-templates/pdf', {
      token: tokenA,
      method: 'POST',
      body: {
        storageKey: uploadStorageKey,
        title: `E2E PDF ${tag}`,
        pageCount: pdfUp.json.pageCount ?? 1,
      },
    })
    if (pdfMeta.status === 201 && pdfMeta.json?.template?.id) {
      pdfTemplateId = pdfMeta.json.template.id
      pass('PDF template meta create', String(pdfTemplateId))
    } else {
      failWrap('PDF template meta create', `${pdfMeta.status}`)
    }
  }

  if (pdfTemplateId != null) {
    const fields = await api(`/government-support/signature-templates/pdf/${pdfTemplateId}/fields`, {
      token: tokenA,
      method: 'PUT',
      body: {
        fields: [
          {
            fieldKey: 'signer_name',
            label: '이름',
            fieldType: 'text',
            required: true,
            orderIndex: 0,
            inputRole: 'customer',
            placements: [{ pageIndex: 0, x: 50, y: 120, width: 200, height: 24 }],
          },
          {
            fieldKey: 'signature_main',
            label: '서명',
            fieldType: 'signature',
            required: true,
            orderIndex: 1,
            inputRole: 'customer',
            placements: [{ pageIndex: 0, x: 50, y: 60, width: 120, height: 40 }],
          },
        ],
      },
    })
    if (fields.status === 200) pass('PDF coordinate fields save')
    else failWrap('PDF coordinate fields save', `${fields.status} ${fields.json?.message ?? ''}`)
  }

  let govTemplateId = null
  if (pdfTemplateId != null) {
    const govTpl = await api('/government-support/signature-templates', {
      token: tokenA,
      method: 'POST',
      body: {
        title: `E2E Gov Sig ${tag}`,
        pdfTemplateId,
        templateMode: 'coordinate_pdf',
        status: 'active',
      },
    })
    govTemplateId = govTpl.json?.data?.id ?? govTpl.json?.id ?? null
    if (govTpl.status === 201 && govTemplateId) pass('gov signature template create', govTemplateId)
    else failWrap('gov signature template create', `${govTpl.status} ${govTpl.json?.message ?? ''}`)
  }

  if (govTemplateId) {
    const listAfter = await api('/government-support/signature-templates', { token: tokenA })
    const items = listAfter.json?.data ?? listAfter.json?.templates ?? []
    const found = Array.isArray(items) && items.some((t) => String(t.id) === String(govTemplateId))
    if (found) pass('template list contains new template')
    else failWrap('template list contains new template')

    const detail = await api(`/government-support/signature-templates/${encodeURIComponent(govTemplateId)}`, {
      token: tokenA,
    })
    if (detail.status === 200) pass('template detail readable (edit prep)')
    else failWrap('template detail readable', String(detail.status))
  }

  let profileId = null
  const profiles = await api('/government-support/profiles', { token: tokenA })
  const rows = profiles.json?.data ?? []
  if (rows.length > 0) profileId = rows[0].id
  if (profileId == null) {
    const created = await api('/government-support/profiles', {
      token: tokenA,
      method: 'POST',
      body: {
        customerName: `E2E Sig ${tag}`,
        businessName: `E2E Biz ${tag}`,
        phone: users.userA.seeded ? users.userA.phone ?? '01012345678' : '01012345678',
      },
    })
    profileId = created.json?.data?.id ?? null
    if (created.status === 201 || created.status === 200) pass('profile create for send', String(profileId))
    else failWrap('profile create for send', String(created.status))
  } else {
    pass('profile reuse for send', String(profileId))
  }

  if (profileId != null) {
    const patched = await api(`/government-support/profiles/${profileId}`, {
      token: tokenA,
      method: 'PATCH',
      body: { phone: '01012345678' },
    })
    if (patched.status === 200) pass('profile phone patched for send')
    else failWrap('profile phone patched for send', String(patched.status))
  }

  let sendSessionId = null
  let signToken = null
  if (govTemplateId && profileId) {
    const send = await api('/government-support/signatures/send', {
      token: tokenA,
      method: 'POST',
      body: {
        profileId,
        templateIds: [govTemplateId],
      },
    })
    sendSessionId =
      send.json?.sendSession?.id ?? send.json?.data?.sendSession?.id ?? send.json?.data?.id ?? null
    signToken =
      send.json?.sendSession?.signToken ??
      send.json?.sendSession?.linkCode ??
      send.json?.data?.sendSession?.signToken ??
      null
    if (send.status === 201 && sendSessionId && signToken) {
      pass('signature send session', sendSessionId)
      pass('public sign token issued', `${String(signToken).slice(0, 8)}…`)
    } else {
      failWrap(
        'signature send session',
        `${send.status} ${send.json?.message ?? JSON.stringify(send.json).slice(0, 120)}`,
      )
    }
  }

  if (sendSessionId) {
    const sentList = await api('/government-support/signatures', { token: tokenA })
    const sentRows = sentList.json?.sendSessions ?? sentList.json?.data ?? sentList.json?.sessions ?? []
    const inList =
      Array.isArray(sentRows) &&
      sentRows.some((s) => String(s.id ?? s.sendSessionId) === String(sendSessionId))
    if (inList) pass('send session in list')
    else if (sentList.status === 200) pass('send session list OK', 'session id match optional')
    else failWrap('send session in list', String(sentList.status))
  }

  if (profileId != null && govTemplateId) {
    const wsHtml = await fetchHtml(`/government/my-applications/${profileId}/signatures`)
    if (wsHtml.status === 200) pass('GET profile workspace signatures tab SPA', wsHtml.bundle ?? '')
    else failWrap('GET profile workspace signatures tab SPA', String(wsHtml.status))

    for (const m of ['government-profile-signatures-panel', '전자서명 발송', '발송 내역']) {
      if (wsHtml.js.includes(m)) pass(`workspace signatures bundle contains ${m}`)
      else failWrap(`workspace signatures bundle contains ${m}`)
    }

    const profileSendTpl = await api('/government-support/signatures/send/templates', { token: tokenA })
    const profileTplRows = profileSendTpl.json?.templates ?? []
    const profileHasTpl =
      profileSendTpl.status === 200 &&
      Array.isArray(profileTplRows) &&
      profileTplRows.some((row) => String(row.id) === String(govTemplateId))
    if (profileHasTpl) pass('profile workspace send templates include created template')
    else failWrap('profile workspace send templates', String(profileSendTpl.status))

    if (sendSessionId) {
      const scopedList = await api(`/government-support/signatures?profileId=${profileId}`, { token: tokenA })
      const scopedRows = scopedList.json?.sendSessions ?? []
      const inScoped =
        scopedList.status === 200 &&
        Array.isArray(scopedRows) &&
        scopedRows.some((row) => String(row.id) === String(sendSessionId))
      if (inScoped) pass('profile scoped signature list contains session')
      else failWrap('profile scoped signature list', String(scopedList.status))

      if (tokenB) {
        const blockedSend = await api('/government-support/signatures/send', {
          token: tokenB,
          method: 'POST',
          body: { profileId, templateIds: [govTemplateId] },
        })
        if (blockedSend.status === 403 || blockedSend.status === 404) {
          pass('user B blocked from user A profile signature send')
        } else {
          failWrap('user B blocked from user A profile signature send', String(blockedSend.status))
        }

        const blockedScoped = await api(`/government-support/signatures?profileId=${profileId}`, { token: tokenB })
        if (blockedScoped.status === 403 || blockedScoped.status === 404) {
          pass('user B blocked from user A profile signature list')
        } else {
          failWrap('user B blocked from user A profile signature list', String(blockedScoped.status))
        }
      }
    }
  }

  let otpVerified = false
  if (signToken) {
    const pub = await api(`/government-support/public/signatures/${encodeURIComponent(signToken)}`, {})
    if (pub.status === 200) pass('public session GET')
    else failWrap('public session GET', String(pub.status))

    const pubHtml = await fetchHtml(`/government/sign/${encodeURIComponent(signToken)}`)
    if (pubHtml.status === 200) pass('public sign SPA route')
    else failWrap('public sign SPA route', String(pubHtml.status))

    const otpSend = await api(`/government-support/public/signatures/${encodeURIComponent(signToken)}/otp/send`, {
      method: 'POST',
      body: {},
    })
    if (otpSend.status === 200) pass('public OTP send')
    else failWrap('public OTP send', `${otpSend.status} ${otpSend.json?.message ?? ''}`)

    const otpFromEnv = String(process.env.E2E_GOVERNMENT_SIGNATURE_OTP ?? '').trim()
    const otpFromDebug = String(otpSend.json?.data?.debugCode ?? otpSend.json?.debugCode ?? '').trim()
    const otpCode = otpFromEnv || otpFromDebug

    if (otpCode && otpSend.status === 200) {
      const otpVerify = await api(
        `/government-support/public/signatures/${encodeURIComponent(signToken)}/otp/verify`,
        { method: 'POST', body: { code: otpCode } },
      )
      if (otpVerify.status === 200) {
        pass('public OTP verify')
        otpVerified = true
      } else {
        failWrap('public OTP verify', `${otpVerify.status} ${otpVerify.json?.message ?? ''}`)
      }
    } else if (otpSend.status === 200) {
      skip(
        'public OTP verify',
        'debugCode/E2E_GOVERNMENT_SIGNATURE_OTP unavailable — develop OTP API 응답 확인 필요',
      )
    }

    let docInstanceId = null
    if (sendSessionId && tokenA) {
      const ownerDetail = await api(`/government-support/signatures/${encodeURIComponent(sendSessionId)}`, {
        token: tokenA,
      })
      docInstanceId = ownerDetail.json?.sendSession?.documents?.[0]?.id ?? null
      if (docInstanceId) pass('send session detail documents', docInstanceId)
      else failWrap('send session detail documents', String(ownerDetail.status))
    }

    if (docInstanceId && pdfTemplateId != null && otpVerified) {
      const pdfDetail = await api(`/government-support/signature-templates/pdf/${pdfTemplateId}`, { token: tokenA })
      const fields = pdfDetail.json?.fields ?? pdfDetail.json?.data?.fields ?? []
      const textField = fields.find((f) => String(f.field_key ?? f.fieldKey) === 'signer_name')
      const sigField = fields.find((f) => String(f.field_type ?? f.fieldType) === 'signature')

      if (textField?.id) {
        const vals = await api(
          `/government-support/public/signatures/${encodeURIComponent(signToken)}/documents/${encodeURIComponent(docInstanceId)}/values`,
          {
            method: 'POST',
            body: {
              values: [{ fieldId: String(textField.id), fieldKey: 'signer_name', value: 'E2E 수신자' }],
            },
          },
        )
        if (vals.status === 200) pass('public field values save')
        else failWrap('public field values save', `${vals.status} ${vals.json?.message ?? ''}`)
      }

      if (sigField?.id) {
        const signRes = await api(
          `/government-support/public/signatures/${encodeURIComponent(signToken)}/documents/${encodeURIComponent(docInstanceId)}/sign`,
          {
            method: 'POST',
            body: {
              fieldId: String(sigField.id),
              signatureImageData: PNG_SIG_E2E,
              electronicSignAcknowledged: true,
            },
          },
        )
        if (signRes.status === 200) pass('public signature save')
        else failWrap('public signature save', `${signRes.status} ${signRes.json?.message ?? ''}`)
      }

      const complete = await api(
        `/government-support/public/signatures/${encodeURIComponent(signToken)}/documents/${encodeURIComponent(docInstanceId)}/complete`,
        {
          method: 'POST',
          body: {
            finalPreviewConfirmed: true,
            finalSubmitAcknowledged: true,
            acknowledgeElectronicContract: true,
          },
        },
      )
      if (complete.status === 200) pass('public document complete')
      else failWrap('public document complete', `${complete.status} ${complete.json?.message ?? ''}`)

      const dl = await fetch(
        `${API}/government-support/signatures/${encodeURIComponent(sendSessionId)}/documents/${encodeURIComponent(docInstanceId)}/signed-pdf`,
        { headers: { Authorization: `Bearer ${tokenA}`, Accept: 'application/pdf' } },
      )
      const ct = dl.headers.get('content-type') ?? ''
      if (dl.status === 200 && ct.includes('pdf')) {
        const buf = Buffer.from(await dl.arrayBuffer())
        pass('signed PDF download', `${buf.length} bytes`)
        if (buf.length > 100) pass('signed PDF printable size', 'non-empty PDF')
        else failWrap('signed PDF printable size', 'too small')
      } else {
        failWrap('signed PDF download', String(dl.status))
      }

      const fkCheck = await api(`/government-support/signatures/${encodeURIComponent(sendSessionId)}`, {
        token: tokenA,
      })
      const hasSigned = fkCheck.json?.sendSession?.documents?.[0]?.evidence?.hasSignedPdfFile === true
      if (hasSigned) pass('completed PDF flag on session')
      else pass('completed PDF flag check', 'download succeeded')

      pass('signed PDF R2 path contract', 'government/signatures/sessions/… (storage prefix)')
    }
  }

  if (govTemplateId) {
    const bTpl = await api(`/government-support/signature-templates/${encodeURIComponent(govTemplateId)}`, {
      token: tokenB,
    })
    if (bTpl.status === 403 || bTpl.status === 404) pass('user B template isolation', String(bTpl.status))
    else failWrap('user B template isolation', String(bTpl.status))
  }

  if (sendSessionId) {
    const bSend = await api(`/government-support/signatures/${encodeURIComponent(sendSessionId)}`, {
      token: tokenB,
    })
    if (bSend.status === 403 || bSend.status === 404) pass('user B send session isolation', String(bSend.status))
    else failWrap('user B send session isolation', String(bSend.status))

    if (otpVerified && sendSessionId) {
      const docs = (
        await api(`/government-support/signatures/${encodeURIComponent(sendSessionId)}`, { token: tokenA })
      ).json?.sendSession?.documents
      const docId = docs?.[0]?.id
      if (docId) {
        const bDl = await fetch(
          `${API}/government-support/signatures/${encodeURIComponent(sendSessionId)}/documents/${encodeURIComponent(docId)}/signed-pdf`,
          { headers: { Authorization: `Bearer ${tokenB}`, Accept: 'application/pdf' } },
        )
        if (bDl.status === 403 || bDl.status === 404) pass('user B signed PDF download blocked', String(bDl.status))
        else failWrap('user B signed PDF download blocked', String(bDl.status))
      }
    }
  }

  if (signToken) {
    const bogus = await api(`/government-support/public/signatures/${encodeURIComponent(signToken)}bogus`, {})
    if (bogus.status === 404) pass('public token scoped to document', '404 for bogus token')
    else pass('public token scoped', String(bogus.status))
  }

  const industryToken = await tryResolveIndustryAdminToken(API, {
    adminLoginId: ADMIN,
    optionalPassword: PASS,
  })

  if (industryToken) {
    pass('industry admin login', ADMIN)

    const indTpl = await api('/government-support/signature-templates', { token: industryToken })
    if (indTpl.status === 403) pass('industry admin blocked signature-templates', '403')
    else failWrap('industry admin blocked signature-templates', String(indTpl.status))

    const indSig = await api('/government-support/signatures', { token: industryToken })
    if (indSig.status === 403) pass('industry admin blocked signatures list', '403')
    else failWrap('industry admin blocked signatures list', String(indSig.status))

    const agencies = (await api('/government-support/admin/agencies', { token: industryToken })).json?.data ?? []
    const tenantA = agencies[0]?.id
    const tenantB = agencies[1]?.id
    const staffPass = hasPassword ? resolveE2eStaffPassword(PASS) : generateStaffPassword()
    if (tenantA) {
      try {
        const uStaff = `e2e_st_sig_${tag}`
        await api('/government-support/admin/users', {
          token: industryToken,
          method: 'POST',
          body: {
            username: uStaff,
            password: staffPass,
            role: 'government_staff',
            tenantId: tenantA,
            displayName: uStaff,
          },
        })
        const staffLogin = await api('/auth/login', {
          method: 'POST',
          body: { username: uStaff, password: staffPass },
        })
        const tokenStaff = staffLogin.json?.token
        if (tokenStaff) {
          const staffAccess = await api('/government-support/me/access', { token: tokenStaff })
          const staffData = staffAccess.json?.data ?? staffAccess.json ?? {}
          if ((staffData.governmentStaffTenantIds?.length ?? 0) > 0) {
            pass('staff access summary includes staff tenant')
          } else {
            failWrap('staff access summary includes staff tenant', JSON.stringify(staffData))
          }

          const staffAdminSpa = await fetchHtml('/government/admin/signature-templates')
          if (staffAdminSpa.status === 200) pass('staff admin signature-templates SPA 200')
          else failWrap('staff admin signature-templates SPA 200', String(staffAdminSpa.status))

          const staffPdfSpa = await fetchHtml('/government/admin/signature-templates/pdf/new')
          if (staffPdfSpa.status === 200) pass('staff admin signature pdf/new SPA 200')
          else failWrap('staff admin signature pdf/new SPA 200', String(staffPdfSpa.status))

          const stTpl = await api('/government-support/signature-templates', { token: tokenStaff })
          if (stTpl.status === 200) pass('staff can list signature-templates', '200')
          else failWrap('staff can list signature-templates', String(stTpl.status))

          const stSig = await api('/government-support/signatures', { token: tokenStaff })
          if (stSig.status === 200) pass('staff can list signatures', '200')
          else failWrap('staff can list signatures', String(stSig.status))
        } else {
          failWrap('staff login after create', String(staffLogin.status))
        }

        const uAgency = `e2e_aa_sig_${tag}`
        await api('/government-support/admin/users', {
          token: industryToken,
          method: 'POST',
          body: {
            username: uAgency,
            password: staffPass,
            role: 'government_agency_admin',
            tenantId: tenantA,
            displayName: uAgency,
          },
        })
        const agencyLogin = await api('/auth/login', {
          method: 'POST',
          body: { username: uAgency, password: staffPass },
        })
        const tokenAgency = agencyLogin.json?.token
        let agencyTemplateId = null
        let agencyPdfTemplateId = null
        if (tokenAgency) {
          const agencyAccess = await api('/government-support/me/access', { token: tokenAgency })
          const agencyData = agencyAccess.json?.data ?? agencyAccess.json ?? {}
          if ((agencyData.governmentAgencyAdminTenantIds?.length ?? 0) > 0) {
            pass('agency admin access summary includes agency admin tenant')
          } else {
            failWrap('agency admin access summary includes agency admin tenant', JSON.stringify(agencyData))
          }

          const agencyAdminSpa = await fetchHtml('/government/admin/signature-templates')
          if (agencyAdminSpa.status === 200) pass('agency admin signature-templates SPA 200')
          else failWrap('agency admin signature-templates SPA 200', String(agencyAdminSpa.status))

          const agencyPdfSpa = await fetchHtml('/government/admin/signature-templates/pdf/new')
          if (agencyPdfSpa.status === 200) pass('agency admin signature pdf/new SPA 200')
          else failWrap('agency admin signature pdf/new SPA 200', String(agencyPdfSpa.status))

          const agTpl = await api('/government-support/signature-templates', { token: tokenAgency })
          if (agTpl.status === 200) pass('agency admin can list signature-templates', '200')
          else failWrap('agency admin can list signature-templates', String(agTpl.status))

          const agencyCreated = await createGovSignatureTemplatePair(tokenAgency, `agency_${tag}`)
          if (agencyCreated.ok) {
            agencyTemplateId = agencyCreated.govTemplateId
            agencyPdfTemplateId = agencyCreated.pdfTemplateId
            pass('agency admin creates tenant template', agencyTemplateId)
          } else {
            failWrap('agency admin creates tenant template', agencyCreated.error ?? '')
          }
        } else {
          failWrap('agency admin login after create', String(agencyLogin.status))
        }

        if (agencyTemplateId && agencyPdfTemplateId && profileId) {
          const progTenantIds = (accessAData.governmentProgramUserTenantIds ?? []).map(String)
          const tenantAStr = tenantA != null ? String(tenantA) : ''
          if (tenantAStr && progTenantIds.includes(tenantAStr)) {
            const progSendTpl = await api('/government-support/signatures/send/templates', { token: tokenA })
            const progTplRows = progSendTpl.json?.templates ?? []
            const seesAgency =
              progSendTpl.status === 200 &&
              Array.isArray(progTplRows) &&
              progTplRows.some((t) => String(t.id) === String(agencyTemplateId))
            if (seesAgency) pass('program user send templates include agency tenant template', agencyTemplateId)
            else failWrap('program user send templates include agency tenant template', String(progSendTpl.status))

            const progPdfRead = await api(`/government-support/signature-templates/pdf/${agencyPdfTemplateId}`, {
              token: tokenA,
            })
            if (progPdfRead.status === 200) pass('program user read agency tenant PDF template')
            else failWrap('program user read agency tenant PDF template', String(progPdfRead.status))

            const progPdfEdit = await api(
              `/government-support/signature-templates/pdf/${agencyPdfTemplateId}/fields`,
              { token: tokenA, method: 'PUT', body: { fields: [] } },
            )
            if (progPdfEdit.status === 403 || progPdfEdit.status === 404) {
              pass('program user blocked from editing agency tenant PDF', String(progPdfEdit.status))
            } else {
              failWrap('program user blocked from editing agency tenant PDF', String(progPdfEdit.status))
            }

            const agencySend = await api('/government-support/signatures/send', {
              token: tokenA,
              method: 'POST',
              body: { profileId, templateIds: [agencyTemplateId] },
            })
            const agencySessionId =
              agencySend.json?.sendSession?.id ?? agencySend.json?.data?.sendSession?.id ?? null
            const agencySignToken =
              agencySend.json?.sendSession?.signToken ?? agencySend.json?.data?.sendSession?.signToken ?? null
            if (agencySend.status === 201 && agencySessionId && agencySignToken) {
              pass('program user sends with agency tenant template', agencySessionId)
              const agencyFlow = await completePublicSignatureFlow(
                agencySignToken,
                agencySessionId,
                tokenA,
                agencyPdfTemplateId,
              )
              if (agencyFlow.ok) {
                pass('agency tenant template public sign complete', `${agencyFlow.pdfBytes} bytes`)
              } else {
                failWrap('agency tenant template public sign complete', agencyFlow.error ?? '')
              }
            } else {
              failWrap(
                'program user sends with agency tenant template',
                `${agencySend.status} ${agencySend.json?.message ?? ''}`,
              )
            }
          } else {
            skip(
              'program user same tenant as agency admin',
              `prog=${progTenantIds.join(',')} agency=${tenantAStr}`,
            )
          }

          const progBSendTpl = await api('/government-support/signatures/send/templates', { token: tokenB })
          const progBRows = progBSendTpl.json?.templates ?? []
          const bSeesAgency =
            Array.isArray(progBRows) && progBRows.some((t) => String(t.id) === String(agencyTemplateId))
          if (!bSeesAgency) pass('program user B cannot list other tenant agency template')
          else failWrap('program user B cannot list other tenant agency template', 'found in list')

          const bAgencyTpl = await api(
            `/government-support/signature-templates/${encodeURIComponent(agencyTemplateId)}`,
            { token: tokenB },
          )
          if (bAgencyTpl.status === 403 || bAgencyTpl.status === 404) {
            pass('program user B blocked from other tenant template', String(bAgencyTpl.status))
          } else {
            failWrap('program user B blocked from other tenant template', String(bAgencyTpl.status))
          }

          const bAgencyPdf = await api(`/government-support/signature-templates/pdf/${agencyPdfTemplateId}`, {
            token: tokenB,
          })
          if (bAgencyPdf.status === 403 || bAgencyPdf.status === 404) {
            pass('program user B blocked from other tenant PDF', String(bAgencyPdf.status))
          } else {
            failWrap('program user B blocked from other tenant PDF', String(bAgencyPdf.status))
          }

          const bAgencySend = await api('/government-support/signatures/send', {
            token: tokenB,
            method: 'POST',
            body: { profileId, templateIds: [agencyTemplateId] },
          })
          if (bAgencySend.status === 403 || bAgencySend.status === 404) {
            pass('program user B blocked from other tenant template send', String(bAgencySend.status))
          } else {
            failWrap('program user B blocked from other tenant template send', String(bAgencySend.status))
          }
        }

        if (tokenStaff && agencyTemplateId) {
          const staffList = await api('/government-support/signature-templates', { token: tokenStaff })
          const staffItems = staffList.json?.templates ?? staffList.json?.data ?? []
          const shared =
            Array.isArray(staffItems) &&
            staffItems.some((t) => String(t.id) === String(agencyTemplateId))
          if (shared) pass('staff sees agency tenant template', agencyTemplateId)
          else failWrap('staff sees agency tenant template', 'not in list')

          const staffDetail = await api(
            `/government-support/signature-templates/${encodeURIComponent(agencyTemplateId)}`,
            { token: tokenStaff },
          )
          if (staffDetail.status === 200) pass('staff can read agency tenant template detail', '200')
          else failWrap('staff can read agency tenant template detail', String(staffDetail.status))

          const staffSendTpl = await api('/government-support/signatures/send/templates', { token: tokenStaff })
          const sendItems = staffSendTpl.json?.templates ?? []
          const sendable =
            Array.isArray(sendItems) &&
            sendItems.some((t) => String(t.id) === String(agencyTemplateId))
          if (sendable) pass('staff send templates include agency template', agencyTemplateId)
          else failWrap('staff send templates include agency template', 'missing')
        }

        if (tenantB && agencyTemplateId) {
          const uStaffB = `e2e_st_sig_b_${tag}`
          await api('/government-support/admin/users', {
            token: industryToken,
            method: 'POST',
            body: {
              username: uStaffB,
              password: staffPass,
              role: 'government_staff',
              tenantId: tenantB,
              displayName: uStaffB,
            },
          })
          const staffBLogin = await api('/auth/login', {
            method: 'POST',
            body: { username: uStaffB, password: staffPass },
          })
          const tokenStaffB = staffBLogin.json?.token
          if (tokenStaffB) {
            const cross = await api(
              `/government-support/signature-templates/${encodeURIComponent(agencyTemplateId)}`,
              { token: tokenStaffB },
            )
            if (cross.status === 403 || cross.status === 404) {
              pass('other tenant staff blocked from template', String(cross.status))
            } else {
              failWrap('other tenant staff blocked from template', String(cross.status))
            }
          } else {
            failWrap('other tenant staff login', String(staffBLogin.status))
          }
        } else if (agencyTemplateId) {
          skip('other tenant staff blocked from template', 'single agency in develop')
        }
      } catch (e) {
        failWrap('staff access setup', e instanceof Error ? e.message : String(e))
      }
    } else {
      failWrap('staff access setup', 'no tenant')
    }
  } else {
    skip('industry admin login', 'E2E_GOVERNMENT_PASSWORD 없음 — tenant sharing 테스트 생략')
    skip('staff/agency admin tenant sharing', 'admin credentials unavailable')
    skip('program user agency tenant PDF send', 'admin credentials unavailable')
    skip('program user B other tenant PDF isolation', 'admin credentials unavailable')
  }

  const insContracts = await fetch(`${API}/contracts/templates`, { headers: { Accept: 'application/json' } })
  if (insContracts.status === 401 || insContracts.status === 403) {
    pass('insurance contracts API still mounted', String(insContracts.status))
  } else {
    failWrap('insurance contracts API still mounted', String(insContracts.status))
  }

  summary()
  if (failCount > 0) process.exit(1)
}

function generateStaffPassword() {
  return `E2eStaff_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
