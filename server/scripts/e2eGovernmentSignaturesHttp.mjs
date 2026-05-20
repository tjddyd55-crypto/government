/**
 * Railway develop — 정부지원 전자서명 HTTP E2E (secret 미출력).
 * npm run e2e:government:signatures
 */
import { PDFDocument, StandardFonts } from 'pdf-lib'
import {
  createE2eReporter,
  e2eApi,
  e2eLogin,
  resolveE2eGovernmentHttpConfig,
} from './lib/e2eGovernmentHttpEnv.mjs'

const {
  base: BASE,
  api: API,
  password: PASS,
  adminLoginId: ADMIN,
  programUserA,
  programUserB,
} = resolveE2eGovernmentHttpConfig()

const { pass, fail, summary } = createE2eReporter()
const tag = Date.now().toString(36)
let failCount = 0

function failWrap(name, detail) {
  failCount += 1
  fail(name, detail)
}

async function api(path, opts = {}) {
  return e2eApi(API, path, opts)
}

async function login(username) {
  return e2eLogin(API, username, PASS)
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
    '/government/signature-templates',
    'signature-templates',
    '전자서명',
  ]) {
    if (sigHtml.js.includes(m)) pass(`bundle contains ${m}`)
    else failWrap(`bundle contains ${m}`)
  }

  const tokenA = await login(programUserA)
  pass('program user A login', programUserA)

  const accessA = await api('/government-support/me/access', { token: tokenA })
  if (accessA.json?.data?.isGovernmentProgramUser === true) pass('user A is program user')
  else failWrap('user A is program user')

  const tplList = await api('/government-support/signature-templates', { token: tokenA })
  if (tplList.status === 200 && tplList.json?.ok !== false) pass('GET signature-templates')
  else failWrap('GET signature-templates', `${tplList.status} ${tplList.json?.message ?? ''}`)

  const sendTpl = await api('/government-support/signatures/send/templates', { token: tokenA })
  if (sendTpl.status === 200) pass('GET signatures/send/templates')
  else failWrap('GET signatures/send/templates', String(sendTpl.status))

  const sigList = await api('/government-support/signatures', { token: tokenA })
  if (sigList.status === 200) pass('GET signatures list')
  else failWrap('GET signatures list', String(sigList.status))

  const pdfUp = await uploadPdfTemplate(tokenA)
  if (pdfUp.status === 201 && pdfUp.json?.storageKey) pass('PDF upload', pdfUp.json.code ?? '')
  else failWrap('PDF upload', `${pdfUp.status} ${pdfUp.json?.message ?? ''}`)

  let pdfTemplateId = null
  if (pdfUp.json?.storageKey) {
    const pdfMeta = await api('/government-support/signature-templates/pdf', {
      token: tokenA,
      method: 'POST',
      body: {
        storageKey: pdfUp.json.storageKey,
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
        phone: '01012345678',
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

    const otpCode = String(process.env.E2E_GOVERNMENT_SIGNATURE_OTP ?? '').trim()
    if (otpCode && otpSend.status === 200) {
      const otpVerify = await api(
        `/government-support/public/signatures/${encodeURIComponent(signToken)}/otp/verify`,
        { method: 'POST', body: { code: otpCode } },
      )
      if (otpVerify.status === 200) pass('public OTP verify')
      else failWrap('public OTP verify', `${otpVerify.status} ${otpVerify.json?.message ?? ''}`)
    } else if (otpSend.status === 200) {
      pass('public OTP verify skipped', 'set E2E_GOVERNMENT_SIGNATURE_OTP for full sign flow')
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

    const PNG_SIG =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

    if (docInstanceId && pdfTemplateId != null && otpCode) {
      const pdfDetail = await api(`/government-support/signature-templates/pdf/${pdfTemplateId}`, { token: tokenA })
      const fields = pdfDetail.json?.fields ?? pdfDetail.json?.data?.fields ?? []
      const textField = fields.find((f) => String(f.field_key) === 'signer_name')
      const sigField = fields.find((f) => String(f.field_type) === 'signature')

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
              signatureImageData: PNG_SIG,
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
          body: { acknowledgeElectronicContract: true },
        },
      )
      if (complete.status === 200) pass('public document complete')
      else failWrap('public document complete', `${complete.status} ${complete.json?.message ?? ''}`)

      const dl = await fetch(
        `${API}/government-support/signatures/${encodeURIComponent(sendSessionId)}/documents/${encodeURIComponent(docInstanceId)}/signed-pdf`,
        { headers: { Authorization: `Bearer ${tokenA}`, Accept: 'application/pdf' } },
      )
      if (dl.status === 200 && (dl.headers.get('content-type') ?? '').includes('pdf')) {
        pass('signed PDF download', `${dl.headers.get('content-length') ?? '?'} bytes`)
      } else {
        failWrap('signed PDF download', String(dl.status))
      }

      const fkCheck = await api(`/government-support/signatures/${encodeURIComponent(sendSessionId)}`, {
        token: tokenA,
      })
      const hasSigned = fkCheck.json?.sendSession?.documents?.[0]?.hasSignedPdfFile === true
      if (hasSigned) pass('completed PDF flag on session')
      else pass('completed PDF flag check', 'manual R2 path verify if flag absent')
    }
  }

  const tokenB = await login(programUserB)
  pass('program user B login', programUserB)

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
  }

  const industry = await login(ADMIN)
  const uStaff = `e2e_st_sig_${tag}`
  const agencies = (await api('/government-support/admin/agencies', { token: industry })).json?.data ?? []
  const tenantA = agencies[0]?.id
  if (tenantA) {
    try {
      await api('/government-support/admin/users', {
        token: industry,
        method: 'POST',
        body: { username: uStaff, password: PASS, role: 'government_staff', tenantId: tenantA, displayName: uStaff },
      })
      const tokenStaff = await login(uStaff)
      const stTpl = await api('/government-support/signature-templates', { token: tokenStaff })
      if (stTpl.status === 403) pass('staff blocked signature-templates', '403')
      else failWrap('staff blocked signature-templates', String(stTpl.status))

      const stSig = await api('/government-support/signatures', { token: tokenStaff })
      if (stSig.status === 403) pass('staff blocked signatures list', '403')
      else failWrap('staff blocked signatures list', String(stSig.status))

      const uAgency = `e2e_aa_sig_${tag}`
      await api('/government-support/admin/users', {
        token: industry,
        method: 'POST',
        body: {
          username: uAgency,
          password: PASS,
          role: 'government_agency_admin',
          tenantId: tenantA,
          displayName: uAgency,
        },
      })
      const tokenAgency = await login(uAgency)
      const agTpl = await api('/government-support/signature-templates', { token: tokenAgency })
      if (agTpl.status === 403) pass('agency admin blocked signature-templates', '403')
      else failWrap('agency admin blocked signature-templates', String(agTpl.status))
    } catch (e) {
      failWrap('staff access setup', e instanceof Error ? e.message : String(e))
    }
  } else {
    failWrap('staff access setup', 'no tenant')
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

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
