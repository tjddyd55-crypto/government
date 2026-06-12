/**
 * Railway develop — 정부 고객앱(/government/app/*) 인증 플로우 HTTP E2E.
 * npm run e2e:government:customer-app
 */
import {
  createE2eReporter,
  e2eApi,
  resolveE2eGovernmentHttpConfig,
} from './lib/e2eGovernmentHttpEnv.mjs'
import { resolveE2eProgramUsers } from './lib/e2eGovernmentSignatureSelfSeed.mjs'

const { base: BASE, api: API } = resolveE2eGovernmentHttpConfig({ requirePassword: false })
const { pass, fail, summary } = createE2eReporter()
const tag = Date.now().toString(36)

async function api(path, opts = {}) {
  return e2eApi(API, path, opts)
}

async function fetchHtml(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'text/html' } })
  const html = await res.text()
  const bundleJs = html.match(/index-[^.]+\.js/)?.[0] ?? null
  const bundleCss = html.match(/index-[^.]+\.css/)?.[0] ?? null
  let js = ''
  let css = ''
  if (bundleJs) {
    js = await (await fetch(`${BASE}/assets/${bundleJs}`)).text()
  }
  if (bundleCss) {
    css = await (await fetch(`${BASE}/assets/${bundleCss}`)).text()
  }
  return { status: res.status, html, js, css, bundleJs, bundleCss }
}

function assertBundleMarkers(js, label, markers) {
  for (const m of markers) {
    if (js.includes(m)) pass(`${label} bundle contains ${m}`)
    else fail(`${label} bundle contains ${m}`)
  }
}

function assertNoSensitiveKeys(json, label) {
  const s = JSON.stringify(json ?? {})
  const bad =
    /objectKey|storageKey|uploadUrl|putHeaders|crm-platform\/development/i.test(s) &&
    !label.includes('presign')
  if (bad) fail(`${label} leaks internal storage keys`)
  else pass(`${label} no internal key leak`)
}

async function main() {
  const health = await fetch(`${BASE}/backend/health`)
  if (health.status === 200) pass('health 200')
  else fail('health', String(health.status))

  const shellHtml = await fetchHtml('/government/app/requests')
  if (shellHtml.status === 200) pass('GET /government/app/requests SPA', shellHtml.bundleJs ?? '')
  else fail('GET /government/app/requests SPA', String(shellHtml.status))

  const themeMarkers = [
    'government-customer-app-shell',
    'government-customer-app-page',
    'government-customer-app-tabbar',
    'government-customer-app-tabbar__item--active',
    'gov-btn--primary',
    'gov-form-control',
    'government-customer-app-uploader-wrap',
    'government-customer-app-request-list',
    'government-customer-app-inquiry-list',
    'government-customer-app-inquiry-compose',
    'government-customer-app-submit-inquiry',
    'government-customer-app-signature-list',
  ]
  assertBundleMarkers(shellHtml.js, 'customer app', themeMarkers)

  if (shellHtml.css.includes('government-customer-app') && shellHtml.css.includes('#f5f7fb')) {
    pass('customer app theme CSS background #f5f7fb')
  } else {
    fail('customer app theme CSS background #f5f7fb')
  }

  if (shellHtml.css.includes('#f2b800')) {
    pass('customer app theme CSS primary #f2b800')
  } else {
    fail('customer app theme CSS primary #f2b800')
  }

  if (/government-customer-app[^}]*#0b111a|government-customer-app-page[^}]*#020617/i.test(shellHtml.css)) {
    fail('customer app theme CSS still contains dark shell/input hex')
  } else {
    pass('customer app theme CSS no dark shell/input hex in scope')
  }

  const users = await resolveE2eProgramUsers(API, {})
  const token = users.userA.token
  pass('program user ready', users.userA.username)

  const me = await api('/me', { token })
  const access = me.json?.data ?? me.json
  if (me.status === 200 && access?.isGovernmentProgramUser === true) pass('user is program user')
  else fail('user is program user', String(me.status))

  const docList = await api('/government-support/my/document-requests', { token })
  if (docList.status === 200) pass('GET my/document-requests')
  else fail('GET my/document-requests', String(docList.status))
  assertNoSensitiveKeys(docList.json, 'document-requests list')

  const sigList = await api('/government-support/my/signatures', { token })
  if (sigList.status === 200) pass('GET my/signatures')
  else fail('GET my/signatures', String(sigList.status))
  assertNoSensitiveKeys(sigList.json, 'signatures list')

  const progressList = await api('/government-support/my/progress', { token })
  if (progressList.status === 200) pass('GET my/progress')
  else fail('GET my/progress', String(progressList.status))

  const inquiryCreate = await api('/government-support/my/inquiries', {
    token,
    method: 'POST',
    body: { title: `E2E 고객앱 ${tag}`, content: '고객앱 인증 플로우 검증 문의입니다.' },
    expectStatus: 201,
  })
  const inquiryId = String(inquiryCreate.json?.data?.id ?? '')
  if (inquiryId) pass('create inquiry', inquiryId)
  else fail('create inquiry', 'missing id')

  const inquiryList = await api('/government-support/my/inquiries', { token })
  if (inquiryList.status === 200) pass('GET my/inquiries')
  else fail('GET my/inquiries', String(inquiryList.status))
  assertNoSensitiveKeys(inquiryList.json, 'inquiries list')

  if (inquiryId) {
    const rows = inquiryList.json?.data ?? []
    if (rows.some((r) => String(r.id) === inquiryId)) pass('inquiry in list')
    else fail('inquiry in list')

    const inquiryDetail = await api(`/government-support/my/inquiries/${inquiryId}`, { token })
    if (inquiryDetail.status === 200) pass('GET inquiry detail')
    else fail('GET inquiry detail', String(inquiryDetail.status))
    assertNoSensitiveKeys(inquiryDetail.json, 'inquiry detail')

    const msg = await api(`/government-support/my/inquiries/${inquiryId}/messages`, {
      token,
      method: 'POST',
      body: { message: '추가 메시지 E2E' },
    })
    if (msg.status === 200 || msg.status === 201) pass('POST inquiry message')
    else fail('POST inquiry message', String(msg.status))
  }

  const spaChecks = [
    {
      path: '/government/app',
      label: 'app index',
      markers: ['government-customer-app-shell', 'government-customer-app-tabbar'],
    },
    {
      path: '/government/app/requests',
      label: 'requests list',
      markers: ['government-customer-app-request-list', 'customer-app-claim-request-list'],
    },
    {
      path: '/government/app/inquiries',
      label: 'inquiries list',
      markers: ['government-customer-app-inquiry-list'],
    },
    {
      path: '/government/app/inquiries/new',
      label: 'inquiry compose',
      markers: [
        'government-customer-app-inquiry-compose',
        'gov-form-control',
        'government-customer-app-submit-inquiry',
      ],
    },
    {
      path: '/government/app/signatures',
      label: 'signatures list',
      markers: ['government-customer-app-signature-list'],
    },
    {
      path: '/government/app/progress',
      label: 'progress',
      markers: ['government-customer-app-page', 'customer-app-claim-timeline'],
    },
  ]

  if (inquiryId) {
    spaChecks.push({
      path: `/government/app/inquiries/${inquiryId}`,
      label: 'inquiry detail',
      markers: ['government-customer-app-detail', 'gov-form-control', 'customer-app-claim-textarea'],
    })
  }

  const docRows = docList.json?.data ?? []
  if (docRows.length > 0) {
    const requestId = String(docRows[0].id)
    spaChecks.push({
      path: `/government/app/requests/${requestId}`,
      label: 'request detail',
      markers: ['government-customer-app-uploader-wrap', 'government-customer-app-detail'],
    })
    const docDetail = await api(`/government-support/my/document-requests/${requestId}`, { token })
    if (docDetail.status === 200) pass('GET document-request detail')
    else fail('GET document-request detail', String(docDetail.status))
    assertNoSensitiveKeys(docDetail.json, 'document-request detail')
  } else {
    pass('request detail SPA', 'SKIP — no document requests for user')
    pass('GET document-request detail', 'SKIP — no document requests')
  }

  for (const check of spaChecks) {
    const page = await fetchHtml(check.path)
    if (page.status === 200) pass(`GET ${check.path} SPA`, page.bundleJs ?? '')
    else fail(`GET ${check.path} SPA`, String(page.status))
    assertBundleMarkers(page.js, check.label, check.markers)
  }

  const exitCode = summary()
  process.exit(exitCode > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
