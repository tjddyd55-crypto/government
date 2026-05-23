/**
 * Railway develop — 기관 코드 가입(join) HTTP E2E.
 * npm run e2e:government:join-code
 */
import { randomInt } from 'node:crypto'
import {
  createE2eReporter,
  e2eApi,
  e2eLogin,
  resolveE2eGovernmentHttpConfig,
} from './lib/e2eGovernmentHttpEnv.mjs'
import {
  registerGovernmentProgramUserViaHttp,
  tryResolveIndustryAdminToken,
} from './lib/e2eGovernmentSignatureSelfSeed.mjs'

const {
  base: BASE,
  api: API,
  password: PASS,
  hasPassword,
  adminLoginId: ADMIN,
} = resolveE2eGovernmentHttpConfig({ requirePassword: false })

const { pass, fail, summary } = createE2eReporter()
const tag = Date.now().toString(36).slice(-6)

async function api(path, opts = {}) {
  return e2eApi(API, path, opts)
}

async function login(username, password = PASS) {
  return e2eLogin(API, username, password)
}

function skip(name, detail = '') {
  pass(name, detail ? `SKIP — ${detail}` : 'SKIP')
}

async function fetchJoinRouteHtml(code) {
  const path = `/government/join/${encodeURIComponent(code)}`
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'text/html' } })
  const html = await res.text()
  const bundle = html.match(/index-[^.]+\.js/)?.[0] ?? null
  let js = ''
  if (bundle) {
    js = await (await fetch(`${BASE}/assets/${bundle}`)).text()
  }
  return { status: res.status, path, html, js, bundle }
}

async function main() {
  const health = await fetch(`${BASE}/backend/health`)
  if (health.status === 200) pass('health 200')
  else fail('health', String(health.status))

  /** @type {string | null} */
  let industry = null
  if (hasPassword) {
    industry = await login(ADMIN)
    pass('industry admin login')
  } else {
    industry = await tryResolveIndustryAdminToken(API, { adminLoginId: ADMIN, optionalPassword: PASS })
    if (industry) pass('industry admin login')
    else skip('industry admin login', 'E2E_GOVERNMENT_PASSWORD 없음 — agency 생성·가입 API 스킵')
  }

  const agencyCode = `E2EJ${tag}${randomInt(10, 99)}`
  const agencyName = `E2E Join ${tag}`

  if (industry) {
    const create = await api('/government-support/admin/agencies', {
      token: industry,
      method: 'POST',
      body: { name: agencyName, agencyCode },
      expectStatus: 201,
    })
    if (create.status === 201 && create.json?.data?.agencyCode === agencyCode) {
      pass('POST admin/agencies', agencyCode)
    } else {
      fail('POST admin/agencies', `${create.status} ${create.json?.message ?? ''}`.trim())
    }

    const validate = await api('/auth/validate-tenant-registration-code', {
      method: 'POST',
      body: { industry_code: 'government', registration_code: agencyCode },
    })
    if (validate.status === 200 && validate.json?.ok === true) {
      pass('validate registration code', validate.json?.tenantName ?? agencyName)
    } else {
      fail('validate registration code', `${validate.status} ${validate.json?.message ?? ''}`.trim())
    }
  } else {
    skip('POST admin/agencies')
    skip('validate registration code')
  }

  const joinHtml = await fetchJoinRouteHtml(industry ? agencyCode : 'GOVA001')
  if (joinHtml.status === 200) pass('GET /government/join/:code SPA', joinHtml.bundle ?? '')
  else fail('GET /government/join/:code SPA', String(joinHtml.status))

  const joinMarkers = ['회원가입 · 정부지원', '예) AGENCY001', '기관 코드']
  for (const m of joinMarkers) {
    if (joinHtml.js.includes(m) || joinHtml.html.includes(m)) pass(`join bundle/html contains ${m}`)
    else fail(`join bundle/html contains ${m}`)
  }

  const codeForSignup = industry ? agencyCode : null
  if (codeForSignup) {
    const username = `e2e_join_${tag}`
    try {
      const creds = await registerGovernmentProgramUserViaHttp(API, {
        registrationCode: codeForSignup,
        username,
        displayName: username,
      })
      pass('register government_user via join code', creds.username)

      const userToken = await login(creds.username, creds.password)
      pass('new user login')

      const access = await api('/government-support/me/access', { token: userToken })
      const summaryData = access.json?.data ?? access.json
      if (access.status === 200 && summaryData?.isGovernmentProgramUser === true) {
        pass('access isGovernmentProgramUser')
      } else {
        fail('access isGovernmentProgramUser', String(access.status))
      }

      const memberships = summaryData?.memberships ?? []
      const govUser = memberships.some((m) => m?.role === 'government_user')
      if (govUser) pass('membership government_user')
      else fail('membership government_user', JSON.stringify(memberships.map((m) => m?.role)))

      const adminDash = await api('/government-support/admin/users', { token: userToken, expectStatus: 403 })
      if (adminDash.status === 403) pass('admin users API blocked for program user')
      else fail('admin users API blocked for program user', String(adminDash.status))

      const profiles = await api('/government-support/profiles', { token: userToken })
      if (profiles.status === 200) pass('GET profiles after join')
      else fail('GET profiles after join', String(profiles.status))
    } catch (e) {
      fail('register government_user via join code', e instanceof Error ? e.message : String(e))
    }
  } else {
    skip('register government_user via join code', 'agency 생성 스킵')
    skip('new user login')
    skip('access isGovernmentProgramUser')
    skip('membership government_user')
    skip('admin users API blocked for program user')
    skip('GET profiles after join')
  }

  const failed = summary()
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
