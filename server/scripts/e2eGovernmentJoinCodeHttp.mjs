/**
 * Railway develop — 기관 코드 가입(join + manual) HTTP E2E.
 * npm run e2e:government:join-code
 *
 * E2E_GOVERNMENT_PASSWORD 없으면 기존 유효 코드(GOVA001 등)로 가입 API 검증.
 * debugCode·비밀번호는 로그에 출력하지 않는다.
 */
import { randomInt } from 'node:crypto'
import {
  createE2eReporter,
  e2eApi,
  e2eLogin,
  resolveE2eGovernmentHttpConfig,
} from './lib/e2eGovernmentHttpEnv.mjs'
import {
  findValidAgencyRegistrationCode,
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

async function fetchSpaHtml(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'text/html' } })
  const html = await res.text()
  const bundle = html.match(/index-[^.]+\.js/)?.[0] ?? null
  let js = ''
  if (bundle) {
    js = await (await fetch(`${BASE}/assets/${bundle}`)).text()
  }
  return { status: res.status, path, html, js, bundle }
}

/**
 * @param {string} token
 * @param {string} label
 * @param {{ expectedTenantId?: string | null }} [opts]
 */
async function assertProgramUserAccess(token, label, opts = {}) {
  const access = await api('/government-support/me/access', { token })
  const d = access.json?.data ?? access.json
  if (access.status !== 200 || d?.isGovernmentProgramUser !== true) {
    fail(`${label} isGovernmentProgramUser`, String(access.status))
    return null
  }
  pass(`${label} isGovernmentProgramUser`)

  const isStaff = Array.isArray(d.governmentStaffTenantIds) && d.governmentStaffTenantIds.length > 0
  const isAgencyAdmin =
    Array.isArray(d.governmentAgencyAdminTenantIds) && d.governmentAgencyAdminTenantIds.length > 0
  const isIndustryAdmin = d.isGovernmentIndustryAdmin === true
  if (isStaff || isAgencyAdmin || isIndustryAdmin) {
    fail(`${label} not staff/agency_admin/industry_admin`, 'unexpected elevated role flags')
  } else {
    pass(`${label} not staff/agency_admin/industry_admin`)
  }

  const tenantIds = d.governmentProgramUserTenantIds ?? []
  if (!Array.isArray(tenantIds) || tenantIds.length < 1) {
    fail(`${label} governmentProgramUserTenantIds`)
  } else {
    pass(`${label} scope tenant`, String(tenantIds[0]))
  }

  if (opts.expectedTenantId) {
    const expected = String(opts.expectedTenantId)
    if (tenantIds.map(String).includes(expected)) {
      pass(`${label} tenant_id matches agency`, expected)
    } else {
      fail(`${label} tenant_id matches agency`, `got ${tenantIds.join(',')} expected ${expected}`)
    }
  }

  const profiles = await api('/government-support/profiles', { token })
  if (profiles.status === 200) pass(`${label} GET profiles (my-applications data)`)
  else fail(`${label} GET profiles`, String(profiles.status))

  const adminUsers = await api('/government-support/admin/users', { token })
  if (adminUsers.status === 403) pass(`${label} admin users API 403`)
  else fail(`${label} admin users API 403`, String(adminUsers.status))

  const adminAgencies = await api('/government-support/admin/agencies', { token })
  if (adminAgencies.status === 403) pass(`${label} admin agencies API 403`)
  else fail(`${label} admin agencies API 403`, String(adminAgencies.status))

  return d
}

async function testInvalidCodes() {
  const cases = [
    { name: 'invalid code INVALIDZZZ', body: { industry_code: 'government', registration_code: 'INVALIDZZZ' } },
    { name: 'empty code', body: { industry_code: 'government', registration_code: '' } },
    { name: 'lowercase invalid xxxxxxx', body: { industry_code: 'government', registration_code: 'xxxxxxx' } },
  ]
  for (const c of cases) {
    const res = await api('/auth/validate-tenant-registration-code', { method: 'POST', body: c.body })
    if (res.status >= 400 && res.json?.ok !== true && res.json?.message) {
      pass(`invalid: ${c.name}`, 'rejected with message')
    } else {
      fail(`invalid: ${c.name}`, `status=${res.status}`)
    }
  }

  const sms = await api('/auth/send-signup-phone-code', {
    method: 'POST',
    body: {
      industry_code: 'government',
      registration_code: 'NOTREAL99',
      phoneNumber: '01099998888',
    },
  })
  if (sms.status >= 400) pass('invalid code blocks SMS send')
  else fail('invalid code blocks SMS send', String(sms.status))
}

async function main() {
  const health = await fetch(`${BASE}/backend/health`)
  if (health.status === 200) pass('health 200')
  else fail('health', String(health.status))

  await testInvalidCodes()

  /** @type {string | null} */
  let industry = null
  if (hasPassword) {
    industry = await login(ADMIN)
    pass('industry admin login')
  } else {
    industry = await tryResolveIndustryAdminToken(API, { adminLoginId: ADMIN, optionalPassword: PASS })
    if (industry) pass('industry admin login')
    else skip('industry admin login', 'E2E_GOVERNMENT_PASSWORD 없음 — 신규 agency 생성 SKIP, 기존 코드로 가입 검증')
  }

  const freshCode = `E2EJ${tag}${randomInt(10, 99)}`
  const freshName = `E2E Join ${tag}`
  /** @type {string | null} */
  let expectedTenantId = null
  /** @type {string} */
  let signupCode = ''

  if (industry) {
    const create = await api('/government-support/admin/agencies', {
      token: industry,
      method: 'POST',
      body: { name: freshName, agencyCode: freshCode },
      expectStatus: 201,
    })
    if (create.status === 201 && create.json?.data?.agencyCode === freshCode) {
      signupCode = freshCode
      expectedTenantId = String(create.json?.data?.id ?? '')
      pass('admin create agency', signupCode)
    } else {
      fail('admin create agency', `${create.status} ${create.json?.message ?? ''}`.trim())
    }
  }

  if (!signupCode) {
    try {
      const found = await findValidAgencyRegistrationCode(API)
      signupCode = found.code
      pass('resolve existing valid agency code', signupCode)
    } catch (e) {
      fail('resolve existing valid agency code', e instanceof Error ? e.message : String(e))
      signupCode = ''
    }
  }

  if (!signupCode) {
    skip('join link signup flow')
    skip('manual code signup flow')
    summary()
    process.exit(1)
  }

  const validateCanon = await api('/auth/validate-tenant-registration-code', {
    method: 'POST',
    body: { industry_code: 'government', registration_code: signupCode },
  })
  if (validateCanon.status === 200 && validateCanon.json?.ok === true) {
    pass('validate canonical code', validateCanon.json?.tenantName ?? signupCode)
  } else {
    fail('validate canonical code', `${validateCanon.status} ${validateCanon.json?.message ?? ''}`.trim())
  }

  const messyCode = `  ${signupCode.toLowerCase()}  `
  const validateMessy = await api('/auth/validate-tenant-registration-code', {
    method: 'POST',
    body: { industry_code: 'government', registration_code: messyCode },
  })
  if (validateMessy.status === 200 && validateMessy.json?.ok === true) {
    pass('validate messy code (trim + case)', messyCode.trim())
  } else {
    fail('validate messy code', `${validateMessy.status} ${validateMessy.json?.message ?? ''}`.trim())
  }

  const joinHtml = await fetchSpaHtml(`/government/join/${encodeURIComponent(signupCode)}`)
  if (joinHtml.status === 200) pass('GET /government/join/:code SPA', joinHtml.bundle ?? '')
  else fail('GET /government/join/:code SPA', String(joinHtml.status))

  for (const m of ['회원가입 · 정부지원', '예) AGENCY001', '기관 코드', 'government-auth-white-theme']) {
    if (joinHtml.js.includes(m) || joinHtml.html.includes(m)) pass(`join SPA contains ${m}`)
    else fail(`join SPA contains ${m}`)
  }

  const signupHtml = await fetchSpaHtml('/government/signup')
  if (signupHtml.status === 200) pass('GET /government/signup SPA', signupHtml.bundle ?? '')
  else fail('GET /government/signup SPA', String(signupHtml.status))

  if (signupHtml.js.includes('회원가입 · 정부지원')) pass('signup SPA contains register form')
  else fail('signup SPA contains register form')

  const loginHtml = await fetchSpaHtml('/login?required=1')
  if (loginHtml.status === 200) pass('GET /login SPA', loginHtml.bundle ?? '')
  else fail('GET /login SPA', String(loginHtml.status))

  if (loginHtml.js.includes('CRM-정부지원')) pass('login SPA contains government brand title')
  else fail('login SPA contains government brand title')

  if (!loginHtml.js.includes('Insurance CRM')) pass('login SPA without Insurance CRM sidebar brand')
  else fail('login SPA without Insurance CRM sidebar brand', 'Insurance CRM still in bundle')

  const govLoginHtml = await fetchSpaHtml('/government/login')
  if (govLoginHtml.status === 200) pass('GET /government/login SPA', govLoginHtml.bundle ?? '')
  else fail('GET /government/login SPA', String(govLoginHtml.status))

  if (govLoginHtml.js.includes('CRM-정부지원')) pass('government/login SPA contains government brand')
  else fail('government/login SPA contains government brand')

  for (const m of ['government-auth-white-theme', 'gov-form-control', 'gov-btn--primary']) {
    if (govLoginHtml.js.includes(m)) pass(`government/login SPA contains ${m}`)
    else fail(`government/login SPA contains ${m}`)
  }

  if (signupHtml.js.includes('government-auth-white-theme')) pass('signup SPA contains government-auth-white-theme')
  else fail('signup SPA contains government-auth-white-theme')

  const userJoin = `e2e_join_link_${tag}`
  try {
    const reg = await registerGovernmentProgramUserViaHttp(API, {
      registrationCode: signupCode,
      username: userJoin,
      displayName: userJoin,
    })
    pass('join-link flow: SMS + register + login', reg.username)
    await assertProgramUserAccess(reg.token, 'join-link user', {
      expectedTenantId: expectedTenantId || undefined,
    })
  } catch (e) {
    fail('join-link flow: SMS + register + login', e instanceof Error ? e.message : String(e))
    skip('join-link user isGovernmentProgramUser')
    skip('join-link user not staff/agency_admin/industry_admin')
    skip('join-link user scope tenant')
    if (expectedTenantId) skip('join-link user tenant_id matches agency')
    skip('join-link user GET profiles (my-applications data)')
    skip('join-link user admin users API 403')
    skip('join-link user admin agencies API 403')
  }

  const userManual = `e2e_join_manual_${tag}`
  try {
    const reg = await registerGovernmentProgramUserViaHttp(API, {
      registrationCodeRaw: messyCode,
      username: userManual,
      displayName: userManual,
    })
    pass('manual signup flow: messy code + SMS + register + login', reg.username)
    await assertProgramUserAccess(reg.token, 'manual-code user', {
      expectedTenantId: expectedTenantId || undefined,
    })
  } catch (e) {
    fail('manual signup flow: messy code + SMS + register + login', e instanceof Error ? e.message : String(e))
    skip('manual-code user isGovernmentProgramUser')
    skip('manual-code user not staff/agency_admin/industry_admin')
    skip('manual-code user scope tenant')
    if (expectedTenantId) skip('manual-code user tenant_id matches agency')
    skip('manual-code user GET profiles (my-applications data)')
    skip('manual-code user admin users API 403')
    skip('manual-code user admin agencies API 403')
  }

  const failed = summary()
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
})
