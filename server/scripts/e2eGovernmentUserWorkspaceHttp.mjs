/**
 * Railway develop — 이용자 workspace HTTP E2E (secret 미출력).
 * npm run e2e:government:user-workspace
 */
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

async function api(path, opts = {}) {
  return e2eApi(API, path, opts)
}

async function login(username) {
  return e2eLogin(API, username, PASS)
}

function unwrapData(json) {
  if (json?.data != null) return json.data
  return json
}

async function fetchHtml(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'text/html' } })
  const html = await res.text()
  const bundle = html.match(/index-[^.]+\.js/)?.[0] ?? null
  let js = ''
  if (bundle) {
    js = await (await fetch(`${BASE}/assets/${bundle}`)).text()
  }
  return { status: res.status, html, js, bundle }
}

async function main() {
  // Deploy sanity
  const health = await fetch(`${BASE}/backend/health`)
  if (health.status === 200) pass('health 200')
  else fail('health', String(health.status))

  const homeHtml = await fetchHtml('/government/workspace')
  if (homeHtml.status === 200) pass('GET /government/workspace', homeHtml.bundle ?? '')
  else fail('GET /government/workspace', String(homeHtml.status))

  const navMarkers = ['government-user-layout', '/government/my-businesses', '내 고객/신청', '/government/me']
  for (const m of navMarkers) {
    if (homeHtml.js.includes(m)) pass(`bundle contains ${m}`)
    else fail(`bundle contains ${m}`)
  }

  const industry = await login(ADMIN)
  pass('industry admin login')

  const agencies = (await api('/government-support/admin/agencies', { token: industry })).json?.data ?? []
  let tenantA = agencies[0]?.id
  let tenantB = agencies[1]?.id
  if (!tenantA || !tenantB) fail('tenants A/B', 'need two agencies')
  else pass('tenants ready', `A=${tenantA} B=${tenantB}`)

  const uStaff = `e2e_st_ws_${tag}`
  const uAgency = `e2e_aa_ws_${tag}`
  for (const [u, role] of [
    [uStaff, 'government_staff'],
    [uAgency, 'government_agency_admin'],
  ]) {
    try {
      await api('/government-support/admin/users', {
        token: industry,
        method: 'POST',
        body: { username: u, password: PASS, role, tenantId: tenantA, displayName: u },
        expectStatus: 200,
      })
      pass(`create ${role}`, u)
    } catch (e) {
      if (String(e.message).includes('409')) pass(`reuse ${role}`, u)
      else throw e
    }
  }

  const ts = Date.now()
  const globalPub = await api('/government-support/admin/notices', {
    token: industry,
    method: 'POST',
    body: {
      title: `E2E WS Global ${ts}`,
      content: 'g',
      category: 'important',
      status: 'published',
      scopeType: 'global',
    },
    expectStatus: 200,
  })
  const globalDraft = await api('/government-support/admin/notices', {
    token: industry,
    method: 'POST',
    body: {
      title: `E2E WS Draft ${ts}`,
      content: 'd',
      category: 'general',
      status: 'draft',
      scopeType: 'global',
    },
    expectStatus: 200,
  })
  const noticeA = await api('/government-support/admin/notices', {
    token: industry,
    method: 'POST',
    body: {
      title: `E2E WS AgencyA ${ts}`,
      content: 'a',
      category: 'deadline',
      status: 'published',
      scopeType: 'agency',
      tenantId: tenantA,
    },
    expectStatus: 200,
  })
  await api('/government-support/admin/notices', {
    token: industry,
    method: 'POST',
    body: {
      title: `E2E WS AgencyB ${ts}`,
      content: 'b',
      category: 'general',
      status: 'published',
      scopeType: 'agency',
      tenantId: tenantB,
    },
    expectStatus: 200,
  })
  pass('notices seeded')

  const presign = await api('/government-support/admin/resources/presign', {
    token: industry,
    method: 'POST',
    body: {
      scopeType: 'agency',
      tenantId: tenantA,
      fileName: 'ws-e2e.pdf',
      contentType: 'application/pdf',
      sizeBytes: 16,
    },
    expectStatus: 200,
  })
  const { uploadUrl, objectKey, resourceId } = presign.json?.data ?? {}
  const fileBody = `ws-e2e-${ts}`
  await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: fileBody })
  await api('/government-support/admin/resources', {
    token: industry,
    method: 'POST',
    body: {
      resourceId,
      fileKey: objectKey,
      fileName: 'ws-e2e.pdf',
      fileSize: fileBody.length,
      mimeType: 'application/pdf',
      status: 'published',
      title: `E2E WS ResourceA ${ts}`,
      category: 'form',
    },
    expectStatus: 200,
  })
  pass('resource A published', String(resourceId))

  // Program user A
  const tokenA = await login(programUserA)
  pass('program user A login', programUserA)

  const accessA = unwrapData((await api('/government-support/me/access', { token: tokenA })).json)
  if (accessA?.isGovernmentProgramUser === true) pass('user A is program user')
  else fail('user A is program user')
  if (accessA?.programUserTenantName) pass('user A tenant name present')
  else fail('user A tenant name present')
  if (accessA?.accountCreatedAt) pass('user A accountCreatedAt present')
  else fail('user A accountCreatedAt present')

  const meA = unwrapData((await api('/me', { token: tokenA })).json)
  if (meA?.username === programUserA) pass('user A me username')
  else fail('user A me username')
  if (meA?.status) pass('user A me status', meA.status)

  const before = (await api('/government-support/profiles', { token: tokenA })).json?.data ?? []
  const created = await api('/government-support/profiles', {
    token: tokenA,
    method: 'POST',
    body: { businessName: `E2E Biz A ${ts}`, customerName: `E2E Cust ${ts}` },
    expectStatus: 200,
  })
  const profileAId = String(created.json?.data?.id ?? created.json?.id ?? '')
  if (profileAId) pass('user A create profile', profileAId)
  else fail('user A create profile')

  const after = (await api('/government-support/profiles', { token: tokenA })).json?.data ?? []
  if (after.some((p) => String(p.id) === profileAId)) pass('user A profile in list after create')
  else fail('user A profile in list after create')
  if (after.length >= before.length + 1) pass('user A list refetch count increased')
  else fail('user A list refetch count increased')

  const detailA = await api(`/government-support/profiles/${profileAId}`, { token: tokenA })
  if (detailA.status === 200) pass('user A profile detail 200')
  else fail('user A profile detail', String(detailA.status))

  const titlesA = ((await api('/government-support/notices', { token: tokenA })).json?.data ?? []).map((n) => n.title)
  if (titlesA.some((t) => t.includes(`E2E WS Global ${ts}`))) pass('user A global notice')
  else fail('user A global notice')
  if (titlesA.some((t) => t.includes(`E2E WS AgencyA ${ts}`))) pass('user A agency A notice')
  else fail('user A agency A notice')
  if (titlesA.some((t) => t.includes(`E2E WS AgencyB ${ts}`))) fail('user A agency B isolation')
  else pass('user A agency B isolation')
  if (titlesA.some((t) => t.includes(`E2E WS Draft ${ts}`))) fail('user A draft hidden')
  else pass('user A draft hidden')

  const resA = ((await api('/government-support/resources', { token: tokenA })).json?.data ?? []).map((r) => r.title)
  if (resA.some((t) => t.includes(`E2E WS ResourceA ${ts}`))) pass('user A resource A')
  else fail('user A resource A')
  const dl = await api(`/government-support/resources/${resourceId}/download`, { token: tokenA })
  if (dl.status === 200 || dl.json?.data?.downloadUrl || dl.json?.data?.url) pass('user A download')
  else fail('user A download', String(dl.status))

  try {
    await api('/government-support/admin/notices', {
      token: tokenA,
      method: 'POST',
      body: { title: 'x' },
      expectStatus: 403,
    })
    pass('user A admin notices 403')
  } catch (e) {
    fail('user A admin notices 403', e.message)
  }

  // Program user B isolation
  const tokenB = await login(programUserB)
  pass('program user B login', programUserB)
  const listB = (await api('/government-support/profiles', { token: tokenB })).json?.data ?? []
  if (!listB.some((p) => String(p.id) === profileAId)) pass('user B cannot list A profile')
  else fail('user B cannot list A profile')
  try {
    await api(`/government-support/profiles/${profileAId}`, { token: tokenB, expectStatus: 403 })
    pass('user B profile detail 403')
  } catch (e) {
    if (String(e.message).includes('404')) pass('user B profile detail 404')
    else fail('user B profile detail forbidden', e.message)
  }

  // Operational roles — API access shape (frontend redirect tested separately)
  const tokenStaff = await login(uStaff)
  const accessStaff = unwrapData((await api('/government-support/me/access', { token: tokenStaff })).json)
  if (accessStaff?.isGovernmentProgramUser !== true) pass('staff not program user')
  else fail('staff not program user')
  const staffProfiles = await api('/government-support/profiles', { token: tokenStaff })
  if (staffProfiles.status === 200 && (staffProfiles.json?.data ?? []).length === 0) pass('staff profiles empty')
  else fail('staff profiles empty')

  const tokenAgency = await login(uAgency)
  const accessAgency = unwrapData((await api('/government-support/me/access', { token: tokenAgency })).json)
  if (accessAgency?.isGovernmentProgramUser !== true) pass('agency admin not program user')
  else fail('agency admin not program user')

  const accessIndustry = unwrapData((await api('/government-support/me/access', { token: industry })).json)
  if (accessIndustry?.isGovernmentIndustryAdmin === true || accessIndustry?.isSuperAdmin === true) {
    pass('industry admin operational')
  } else fail('industry admin operational')

  // SPA routes exist in bundle for staff (redirect is client-side)
  const staffBundle = (await fetchHtml('/government/admin/notices')).js
  if (staffBundle.includes('government-admin-layout') && !staffBundle.includes('government-user-layout__nav-link--active')) {
    pass('admin layout in bundle')
  } else if (staffBundle.includes('government-admin-layout')) pass('admin layout in bundle')
  else fail('admin layout in bundle')

  const failed = summary()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('[FATAL]', e.message)
  process.exit(1)
})
