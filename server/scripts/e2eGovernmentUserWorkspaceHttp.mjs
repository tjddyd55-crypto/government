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
  programUserA,
  programUserB,
} = resolveE2eGovernmentHttpConfig({ requirePassword: false })

const { pass, fail, summary } = createE2eReporter()
const tag = Date.now().toString(36)

async function api(path, opts = {}) {
  return e2eApi(API, path, opts)
}

async function login(username, password = PASS) {
  return e2eLogin(API, username, password)
}

function skip(name, detail = '') {
  pass(name, detail ? `SKIP — ${detail}` : 'SKIP')
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

  const navMarkers = [
    'government-user-layout',
    '/government/my-applications',
    '내 고객/신청',
    '/government/me',
    '서류/파일',
    '신청 관리',
    '/files/presign',
    '/government/app',
  ]
  for (const m of navMarkers) {
    if (homeHtml.js.includes(m)) pass(`bundle contains ${m}`)
    else fail(`bundle contains ${m}`)
  }

  /** @type {string | null} */
  let industry = null
  if (hasPassword) {
    industry = await login(ADMIN)
    pass('industry admin login')
  } else {
    industry = await tryResolveIndustryAdminToken(API, { adminLoginId: ADMIN, optionalPassword: PASS })
    if (industry) pass('industry admin login')
    else skip('industry admin login', 'E2E_GOVERNMENT_PASSWORD 없음')
  }

  let tenantA = null
  let tenantB = null
  const uStaff = `e2e_st_ws_${tag}`
  const uAgency = `e2e_aa_ws_${tag}`

  if (industry) {
    const agencies = (await api('/government-support/admin/agencies', { token: industry })).json?.data ?? []
    tenantA = agencies[0]?.id
    tenantB = agencies[1]?.id
    if (!tenantA || !tenantB) fail('tenants A/B', 'need two agencies')
    else pass('tenants ready', `A=${tenantA} B=${tenantB}`)

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
  } else {
    skip('tenants A/B', 'admin token unavailable')
    skip('create government_staff', 'admin token unavailable')
    skip('create government_agency_admin', 'admin token unavailable')
  }

  const ts = Date.now()
  /** @type {string | undefined} */
  let resourceId
  if (!industry) {
    skip('notices seeded', 'admin token unavailable')
    skip('resource A published', 'admin token unavailable')
  } else {
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
  const { uploadUrl, objectKey, resourceId: seededResourceId } = presign.json?.data ?? {}
  resourceId = seededResourceId
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
  }

  const programUsers = await resolveE2eProgramUsers(API, {
    optionalPassword: PASS,
    userA: programUserA,
    userB: programUserB,
  })
  pass('program user A ready', `${programUsers.userA.username} (${programUsers.userA.seeded ? 'http-register' : 'env-login'})`)
  pass('program user B ready', `${programUsers.userB.username} (${programUsers.userB.seeded ? 'http-register' : 'env-login'})`)

  // Program user A
  const tokenA = programUsers.userA.token
  pass('program user A login', programUsers.userA.username)

  const accessA = unwrapData((await api('/government-support/me/access', { token: tokenA })).json)
  if (accessA?.isGovernmentProgramUser === true) pass('user A is program user')
  else fail('user A is program user')
  if (accessA?.programUserTenantName) pass('user A tenant name present')
  else fail('user A tenant name present')
  if (accessA?.accountCreatedAt) pass('user A accountCreatedAt present')
  else fail('user A accountCreatedAt present')

  const meA = unwrapData((await api('/me', { token: tokenA })).json)
  if (meA?.username === programUsers.userA.username) pass('user A me username')
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

  const memoCreate = await api(`/government-support/profiles/${profileAId}/memos`, {
    token: tokenA,
    method: 'POST',
    body: { content: `E2E memo A ${ts}` },
    expectStatus: 200,
  })
  const memoAId = String(memoCreate.json?.data?.id ?? '')
  if (memoAId) pass('user A create memo', memoAId)
  else fail('user A create memo')

  const memoListA = (await api(`/government-support/profiles/${profileAId}/memos`, { token: tokenA })).json?.data ?? []
  if (memoListA.some((m) => String(m.id) === memoAId)) pass('user A memo in list')
  else fail('user A memo in list')

  const memoPatch = await api(`/government-support/profiles/${profileAId}/memos/${memoAId}`, {
    token: tokenA,
    method: 'PATCH',
    body: { content: `E2E memo A patched ${ts}` },
    expectStatus: 200,
  })
  if (String(memoPatch.json?.data?.content ?? '').includes('patched')) pass('user A patch memo')
  else fail('user A patch memo')

  await api(`/government-support/profiles/${profileAId}/memos/${memoAId}`, {
    token: tokenA,
    method: 'DELETE',
    expectStatus: 200,
  })
  const memoListAfterDelete =
    (await api(`/government-support/profiles/${profileAId}/memos`, { token: tokenA })).json?.data ?? []
  if (!memoListAfterDelete.some((m) => String(m.id) === memoAId)) pass('user A delete memo')
  else fail('user A delete memo')

  const consultCreate = await api(`/government-support/profiles/${profileAId}/consultations`, {
    token: tokenA,
    method: 'POST',
    body: { body: `E2E consult A ${ts}`, consultationDate: '2026-05-19' },
    expectStatus: 200,
  })
  const consultAId = String(consultCreate.json?.data?.id ?? '')
  if (consultAId) pass('user A create consultation', consultAId)
  else fail('user A create consultation')

  const consultListA =
    (await api(`/government-support/profiles/${profileAId}/consultations`, { token: tokenA })).json?.data ?? []
  if (consultListA.some((c) => String(c.id) === consultAId)) pass('user A consultation in list')
  else fail('user A consultation in list')

  const consultPatch = await api(`/government-support/profiles/${profileAId}/consultations/${consultAId}`, {
    token: tokenA,
    method: 'PATCH',
    body: { body: `E2E consult A patched ${ts}` },
    expectStatus: 200,
  })
  if (String(consultPatch.json?.data?.body ?? '').includes('patched')) pass('user A patch consultation')
  else fail('user A patch consultation')

  await api(`/government-support/profiles/${profileAId}/consultations/${consultAId}`, {
    token: tokenA,
    method: 'DELETE',
    expectStatus: 200,
  })
  const consultListAfterDelete =
    (await api(`/government-support/profiles/${profileAId}/consultations`, { token: tokenA })).json?.data ?? []
  if (!consultListAfterDelete.some((c) => String(c.id) === consultAId)) pass('user A delete consultation')
  else fail('user A delete consultation')

  const appCreate = await api(`/government-support/profiles/${profileAId}/applications`, {
    token: tokenA,
    method: 'POST',
    body: {
      title: `E2E application A ${ts}`,
      content: `E2E application body ${ts}`,
      applicationType: '융자',
    },
    expectStatus: 201,
  })
  const appAId = String(appCreate.json?.data?.id ?? '')
  if (appAId) pass('user A create application', appAId)
  else fail('user A create application')

  const appListA =
    (await api(`/government-support/profiles/${profileAId}/applications`, { token: tokenA })).json?.data ?? []
  if (appListA.some((a) => String(a.id) === appAId)) pass('user A application in list')
  else fail('user A application in list')

  const appDetailA = await api(`/government-support/profiles/${profileAId}/applications/${appAId}`, {
    token: tokenA,
    expectStatus: 200,
  })
  if (String(appDetailA.json?.data?.title ?? '').includes('E2E application A')) pass('user A application detail')
  else fail('user A application detail')

  const appPatch = await api(`/government-support/profiles/${profileAId}/applications/${appAId}`, {
    token: tokenA,
    method: 'PATCH',
    body: { title: `E2E application A patched ${ts}`, status: 'processing' },
    expectStatus: 200,
  })
  if (String(appPatch.json?.data?.title ?? '').includes('patched')) pass('user A patch application')
  else fail('user A patch application')
  if (appPatch.json?.data?.status === 'processing') pass('user A patch application status')
  else fail('user A patch application status')

  await api(`/government-support/profiles/${profileAId}/applications/${appAId}`, {
    token: tokenA,
    method: 'DELETE',
    expectStatus: 200,
  })
  const appListAfterDelete =
    (await api(`/government-support/profiles/${profileAId}/applications`, { token: tokenA })).json?.data ?? []
  if (!appListAfterDelete.some((a) => String(a.id) === appAId)) pass('user A delete application')
  else fail('user A delete application')

  const myProgressRes = await api('/government-support/my/progress', { token: tokenA })
  if (myProgressRes.status === 200 && Array.isArray(myProgressRes.json?.data)) pass('user A my/progress list')
  else fail('user A my/progress list', String(myProgressRes.status))

  const mySigRes = await api('/government-support/my/signatures', { token: tokenA })
  if (mySigRes.status === 200 && Array.isArray(mySigRes.json?.data)) pass('user A my/signatures list')
  else fail('user A my/signatures list', String(mySigRes.status))

  /** @type {string | undefined} */
  let docRequestId
  /** @type {string | undefined} */
  let docItemId
  if (industry) {
    const tokenStaff = await login(uStaff)
    const docReqCreate = await api(`/government-support/profiles/${profileAId}/document-requests`, {
      token: tokenStaff,
      method: 'POST',
      body: {
        title: `E2E doc req ${ts}`,
        message: '제출해 주세요',
        items: [{ docType: '사업자등록증', label: '사업자등록증' }],
      },
      expectStatus: 201,
    })
    docRequestId = String(docReqCreate.json?.data?.id ?? '')
    if (docRequestId) pass('staff create document request', docRequestId)
    else fail('staff create document request')

    const myDocList =
      (await api('/government-support/my/document-requests', { token: tokenA })).json?.data ?? []
    if (myDocList.some((r) => String(r.id) === docRequestId)) pass('user A my document-requests list')
    else fail('user A my document-requests list')

    const myDocDetail = await api(`/government-support/my/document-requests/${docRequestId}`, { token: tokenA })
    docItemId = String(myDocDetail.json?.data?.items?.[0]?.id ?? '')
    if (docItemId) pass('user A document request detail', docItemId)
    else fail('user A document request detail')

    const docFileName = `e2e-doc-${ts}.pdf`
    const docFileBody = `E2E request doc ${ts}`
    const docPresign = await api(
      `/government-support/my/document-requests/${docRequestId}/items/${docItemId}/files/presign`,
      {
        token: tokenA,
        method: 'POST',
        body: { fileName: docFileName, contentType: 'application/pdf', sizeBytes: docFileBody.length },
        expectStatus: 201,
      },
    )
    const { uploadUrl: docUploadUrl, objectKey: docObjectKey, fileId: docFileId } = docPresign.json?.data ?? {}
    if (docUploadUrl && docObjectKey && docFileId) pass('user A doc presign', String(docFileId))
    else fail('user A doc presign')
    const docKeyNorm = String(docObjectKey ?? '').replace(/^\/+/, '')
    if (docKeyNorm.includes('government/request-documents/')) pass('request-doc R2 key path')
    else fail('request-doc R2 key path', docKeyNorm.slice(0, 80))

    const docPut = await fetch(docUploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf', ...(docPresign.json?.data?.putHeaders ?? {}) },
      body: docFileBody,
    })
    if (docPut.status >= 200 && docPut.status < 300) pass('user A R2 PUT request doc')
    else fail('user A R2 PUT request doc', String(docPut.status))

    await api(`/government-support/my/document-requests/${docRequestId}/items/${docItemId}/files`, {
      token: tokenA,
      method: 'POST',
      body: { fileId: docFileId },
      expectStatus: 200,
    })
    pass('user A confirm request doc file')

    const myDocAfter = await api(`/government-support/my/document-requests/${docRequestId}`, { token: tokenA })
    if (String(myDocAfter.json?.data?.items?.[0]?.status ?? '') === '제출 완료') pass('user A item submitted status')
    else fail('user A item submitted status', String(myDocAfter.json?.data?.items?.[0]?.status))

    const progUserDocCreate = await api(`/government-support/profiles/${profileAId}/document-requests`, {
      token: tokenA,
      method: 'POST',
      body: { title: 'blocked', items: [{ label: 'x' }] },
    })
    if (progUserDocCreate.status === 403) pass('user A cannot create agency document request')
    else fail('user A cannot create agency document request', String(progUserDocCreate.status))
  } else {
    skip('staff create document request', 'admin token unavailable')
    skip('user A my document-requests list', 'admin token unavailable')
    skip('user A document request detail', 'admin token unavailable')
    skip('user A doc presign', 'admin token unavailable')
    skip('request-doc R2 key path', 'admin token unavailable')
    skip('user A R2 PUT request doc', 'admin token unavailable')
    skip('user A confirm request doc file', 'admin token unavailable')
    skip('user A item submitted status', 'admin token unavailable')
    skip('user A cannot create agency document request', 'admin token unavailable')
  }


  // ── 문의 (inquiries) ──
  let inquiryAId = ''
  const inquiryCreate = await api('/government-support/my/inquiries', {
    token: tokenA,
    method: 'POST',
    body: { title: `E2E inquiry ${ts}`, content: `E2E inquiry body ${ts}` },
    expectStatus: 201,
  })
  inquiryAId = String(inquiryCreate.json?.data?.id ?? '')
  if (inquiryAId) pass('user A create inquiry', inquiryAId)
  else fail('user A create inquiry')

  const inquiryListA = (await api('/government-support/my/inquiries', { token: tokenA })).json?.data ?? []
  if (inquiryListA.some((r) => String(r.id) === inquiryAId)) pass('user A inquiry list')
  else fail('user A inquiry list')

  const inquiryDetailA = await api(`/government-support/my/inquiries/${inquiryAId}`, { token: tokenA })
  if (inquiryDetailA.status === 200 && (inquiryDetailA.json?.data?.messages?.length ?? 0) >= 1) pass('user A inquiry detail')
  else fail('user A inquiry detail', String(inquiryDetailA.status))

  const inquiryMsgA = await api(`/government-support/my/inquiries/${inquiryAId}/messages`, {
    token: tokenA,
    method: 'POST',
    body: { message: `E2E follow-up ${ts}` },
    expectStatus: 201,
  })
  if (inquiryMsgA.status === 201) pass('user A inquiry message')
  else fail('user A inquiry message', String(inquiryMsgA.status))

  if (industry) {
    const tokenStaff = await login(uStaff)
    const adminList = await api('/government-support/admin/inquiries', { token: tokenStaff })
    if (adminList.status === 200 && (adminList.json?.data ?? []).some((r) => String(r.id) === inquiryAId)) {
      pass('staff admin inquiry list')
    } else fail('staff admin inquiry list', String(adminList.status))

    const staffReply = await api(`/government-support/admin/inquiries/${inquiryAId}/messages`, {
      token: tokenStaff,
      method: 'POST',
      body: { message: `E2E staff reply ${ts}` },
      expectStatus: 201,
    })
    if (staffReply.status === 201) pass('staff inquiry reply')
    else fail('staff inquiry reply', String(staffReply.status))

    const inquiryAfterReply = await api(`/government-support/my/inquiries/${inquiryAId}`, { token: tokenA })
    const roles = (inquiryAfterReply.json?.data?.messages ?? []).map((m) => m.senderRole)
    if (roles.includes('government_staff') || roles.includes('government_agency_admin')) pass('user A sees staff reply')
    else fail('user A sees staff reply', roles.join(','))

    const adminPatch = await api(`/government-support/admin/inquiries/${inquiryAId}`, {
      token: tokenStaff,
      method: 'PATCH',
      body: { status: 'closed' },
      expectStatus: 200,
    })
    if (adminPatch.status === 200) pass('staff patch inquiry status')
    else fail('staff patch inquiry status', String(adminPatch.status))
  } else {
    for (const name of [
      'staff admin inquiry list',
      'staff inquiry reply',
      'user A sees staff reply',
      'staff patch inquiry status',
    ]) {
      skip(name, 'admin credentials unavailable')
    }
  }

  const progressCreate = await api(`/government-support/profiles/${profileAId}/progress`, {
    token: tokenA,
    method: 'POST',
    body: {
      status: '심사 중',
      content: `E2E progress A ${ts}`,
      title: 'E2E 진행',
      eventDate: '2026-05-19',
    },
    expectStatus: 201,
  })
  const progressAId = String(progressCreate.json?.data?.id ?? '')
  if (progressAId) pass('user A create progress', progressAId)
  else fail('user A create progress')

  const progressListA =
    (await api(`/government-support/profiles/${profileAId}/progress`, { token: tokenA })).json?.data ?? []
  if (progressListA.some((p) => String(p.id) === progressAId)) pass('user A progress in list')
  else fail('user A progress in list')

  const detailAfterProgress = unwrapData((await api(`/government-support/profiles/${profileAId}`, { token: tokenA })).json)
  if (detailAfterProgress?.progressStatus === '심사 중') pass('user A profile progressStatus synced')
  else fail('user A profile progressStatus synced', String(detailAfterProgress?.progressStatus))

  const progressPatch = await api(`/government-support/profiles/${profileAId}/progress/${progressAId}`, {
    token: tokenA,
    method: 'PATCH',
    body: { content: `E2E progress A patched ${ts}`, status: '보완 요청' },
    expectStatus: 200,
  })
  if (String(progressPatch.json?.data?.content ?? '').includes('patched')) pass('user A patch progress')
  else fail('user A patch progress')

  await api(`/government-support/profiles/${profileAId}/progress/${progressAId}`, {
    token: tokenA,
    method: 'DELETE',
    expectStatus: 200,
  })
  const progressListAfterDelete =
    (await api(`/government-support/profiles/${profileAId}/progress`, { token: tokenA })).json?.data ?? []
  if (!progressListAfterDelete.some((p) => String(p.id) === progressAId)) pass('user A delete progress')
  else fail('user A delete progress')

  const profileFileName = `e2e-ws-${ts}.pdf`
  const profileFileBody = `E2E profile file ${ts}`
  const profileFileSize = profileFileBody.length
  let profileFileId = ''
  const filePresign = await api(`/government-support/profiles/${profileAId}/files/presign`, {
    token: tokenA,
    method: 'POST',
    body: {
      fileName: profileFileName,
      contentType: 'application/pdf',
      sizeBytes: profileFileSize,
      description: `E2E file ${ts}`,
    },
    expectStatus: 201,
  })
  const { uploadUrl: profileUploadUrl, objectKey: profileObjectKey, fileId: presignedFileId } =
    filePresign.json?.data ?? {}
  profileFileId = String(presignedFileId ?? '')
  if (profileUploadUrl && profileObjectKey && profileFileId) pass('user A file presign', profileFileId)
  else fail('user A file presign')
  const objectKeyNorm = String(profileObjectKey ?? '').replace(/^\/+/, '')
  if (objectKeyNorm.includes('government/profile-files/')) pass('profile file R2 key path')
  else fail('profile file R2 key path', objectKeyNorm.slice(0, 80))

  const profilePut = await fetch(profileUploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/pdf',
      ...(filePresign.json?.data?.putHeaders ?? {}),
    },
    body: profileFileBody,
  })
  if (profilePut.status >= 200 && profilePut.status < 300) pass('user A R2 PUT profile file', String(profilePut.status))
  else fail('user A R2 PUT profile file', String(profilePut.status))

  const fileSave = await api(`/government-support/profiles/${profileAId}/files`, {
    token: tokenA,
    method: 'POST',
    body: {
      fileId: profileFileId,
      objectKey: profileObjectKey,
      fileName: profileFileName,
      fileSize: profileFileSize,
      mimeType: 'application/pdf',
    },
    expectStatus: 201,
  })
  if (String(fileSave.json?.data?.id ?? '') === profileFileId) pass('user A save profile file')
  else fail('user A save profile file')

  const fileListA =
    (await api(`/government-support/profiles/${profileAId}/files`, { token: tokenA })).json?.data ?? []
  if (fileListA.some((f) => String(f.id) === profileFileId)) pass('user A file in list')
  else fail('user A file in list')

  const fileDlA = await api(`/government-support/profiles/${profileAId}/files/${profileFileId}/download`, {
    token: tokenA,
  })
  if (fileDlA.status === 200 && (fileDlA.json?.data?.downloadUrl || fileDlA.json?.data?.url)) {
    pass('user A file download')
  } else fail('user A file download', String(fileDlA.status))

  const filePatchA = await api(`/government-support/profiles/${profileAId}/files/${profileFileId}`, {
    token: tokenA,
    method: 'PATCH',
    body: { fileName: `e2e-ws-patched-${ts}.pdf`, description: 'patched' },
    expectStatus: 200,
  })
  if (String(filePatchA.json?.data?.fileName ?? '').includes('patched')) pass('user A patch profile file')
  else fail('user A patch profile file')

  const memoRegression = await api(`/government-support/profiles/${profileAId}/memos`, {
    token: tokenA,
    method: 'POST',
    body: { content: `E2E memo regression ${ts}` },
    expectStatus: 200,
  })
  if (memoRegression.json?.data?.id) pass('memo regression create after consultations')
  else fail('memo regression create after consultations')

  if (industry) {
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
  } else {
    skip('user A global notice', 'admin seed skipped')
    skip('user A agency A notice', 'admin seed skipped')
    skip('user A agency B isolation', 'admin seed skipped')
    skip('user A draft hidden', 'admin seed skipped')
    skip('user A resource A', 'admin seed skipped')
    skip('user A download', 'admin seed skipped')
  }

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
  const tokenB = programUsers.userB.token
  pass('program user B login', programUsers.userB.username)
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

  const memoBCreate = await api(`/government-support/profiles/${profileAId}/memos`, {
    token: tokenB,
    method: 'POST',
    body: { content: 'blocked' },
  })
  if (memoBCreate.status === 403 || memoBCreate.status === 404) pass('user B memo create blocked')
  else fail('user B memo create blocked', String(memoBCreate.status))

  const memoBList = await api(`/government-support/profiles/${profileAId}/memos`, { token: tokenB })
  if (memoBList.status === 403 || memoBList.status === 404) pass('user B memo list blocked')
  else fail('user B memo list blocked', String(memoBList.status))

  const consultBCreate = await api(`/government-support/profiles/${profileAId}/consultations`, {
    token: tokenB,
    method: 'POST',
    body: { body: 'blocked' },
  })
  if (consultBCreate.status === 403 || consultBCreate.status === 404) pass('user B consultation create blocked')
  else fail('user B consultation create blocked', String(consultBCreate.status))

  const consultBList = await api(`/government-support/profiles/${profileAId}/consultations`, { token: tokenB })
  if (consultBList.status === 403 || consultBList.status === 404) pass('user B consultation list blocked')
  else fail('user B consultation list blocked', String(consultBList.status))

  const progressBCreate = await api(`/government-support/profiles/${profileAId}/progress`, {
    token: tokenB,
    method: 'POST',
    body: { status: '심사 중', content: 'blocked' },
  })
  if (progressBCreate.status === 403 || progressBCreate.status === 404) pass('user B progress create blocked')
  else fail('user B progress create blocked', String(progressBCreate.status))

  const progressBList = await api(`/government-support/profiles/${profileAId}/progress`, { token: tokenB })
  if (progressBList.status === 403 || progressBList.status === 404) pass('user B progress list blocked')
  else fail('user B progress list blocked', String(progressBList.status))

  const appBCreate = await api(`/government-support/profiles/${profileAId}/applications`, {
    token: tokenB,
    method: 'POST',
    body: { title: 'blocked', content: 'blocked' },
  })
  if (appBCreate.status === 403 || appBCreate.status === 404) pass('user B application create blocked')
  else fail('user B application create blocked', String(appBCreate.status))

  const appBWorkspaceList = await api(`/government-support/profiles/${profileAId}/applications`, { token: tokenB })
  if (appBWorkspaceList.status === 403 || appBWorkspaceList.status === 404) pass('user B application list blocked')
  else fail('user B application list blocked', String(appBWorkspaceList.status))

  const inquiryBAccess = await api(`/government-support/my/inquiries/${inquiryAId}`, { token: tokenB })
  if (inquiryBAccess.status === 403 || inquiryBAccess.status === 404) pass('user B inquiry access blocked')
  else fail('user B inquiry access blocked', String(inquiryBAccess.status))

  const appBList = await api(`/government-support/my/document-requests`, { token: tokenB })
  if (appBList.status === 403) {
    pass('user B my document-requests isolated')
  } else if (appBList.status === 200) {
    const rows = appBList.json?.data ?? []
    if (!docRequestId || !rows.some((r) => String(r.id) === docRequestId)) {
      pass('user B my document-requests isolated')
    } else fail('user B my document-requests isolated', 'user B saw user A request')
  } else fail('user B my document-requests isolated', String(appBList.status))

  const mySigB = await api('/government-support/my/signatures', { token: tokenB })
  if (mySigB.status === 403 || (mySigB.status === 200 && Array.isArray(mySigB.json?.data))) {
    pass('user B my signatures endpoint')
  } else fail('user B my signatures endpoint', String(mySigB.status))

  const fileBList = await api(`/government-support/profiles/${profileAId}/files`, { token: tokenB })
  if (fileBList.status === 403 || fileBList.status === 404) pass('user B file list blocked')
  else fail('user B file list blocked', String(fileBList.status))

  const fileBDownload = await api(`/government-support/profiles/${profileAId}/files/${profileFileId}/download`, {
    token: tokenB,
  })
  if (fileBDownload.status === 403 || fileBDownload.status === 404) pass('user B file download blocked')
  else fail('user B file download blocked', String(fileBDownload.status))

  const fileBCreate = await api(`/government-support/profiles/${profileAId}/files/presign`, {
    token: tokenB,
    method: 'POST',
    body: {
      fileName: 'blocked.pdf',
      contentType: 'application/pdf',
      sizeBytes: 8,
    },
  })
  if (fileBCreate.status === 403 || fileBCreate.status === 404) pass('user B file presign blocked')
  else fail('user B file presign blocked', String(fileBCreate.status))

  // Operational roles — API access shape (frontend redirect tested separately)
  if (industry) {
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

    const memoStaffList = await api(`/government-support/profiles/${profileAId}/memos`, { token: tokenStaff })
    if (memoStaffList.status === 403) pass('staff memo list 403')
    else fail('staff memo list 403', String(memoStaffList.status))

    const memoAgencyList = await api(`/government-support/profiles/${profileAId}/memos`, { token: tokenAgency })
    if (memoAgencyList.status === 403) pass('agency admin memo list 403')
    else fail('agency admin memo list 403', String(memoAgencyList.status))

    const consultStaffList = await api(`/government-support/profiles/${profileAId}/consultations`, { token: tokenStaff })
    if (consultStaffList.status === 403) pass('staff consultation list 403')
    else fail('staff consultation list 403', String(consultStaffList.status))

    const consultAgencyList = await api(`/government-support/profiles/${profileAId}/consultations`, { token: tokenAgency })
    if (consultAgencyList.status === 403) pass('agency admin consultation list 403')
    else fail('agency admin consultation list 403', String(consultAgencyList.status))

    const progressStaffList = await api(`/government-support/profiles/${profileAId}/progress`, { token: tokenStaff })
    if (progressStaffList.status === 403) pass('staff progress list 403')
    else fail('staff progress list 403', String(progressStaffList.status))

    const progressAgencyList = await api(`/government-support/profiles/${profileAId}/progress`, { token: tokenAgency })
    if (progressAgencyList.status === 403) pass('agency admin progress list 403')
    else fail('agency admin progress list 403', String(progressAgencyList.status))

    const fileStaffList = await api(`/government-support/profiles/${profileAId}/files`, { token: tokenStaff })
    if (fileStaffList.status === 403) pass('staff file list 403')
    else fail('staff file list 403', String(fileStaffList.status))

    const fileAgencyList = await api(`/government-support/profiles/${profileAId}/files`, { token: tokenAgency })
    if (fileAgencyList.status === 403) pass('agency admin file list 403')
    else fail('agency admin file list 403', String(fileAgencyList.status))

    const appStaffList = await api(`/government-support/profiles/${profileAId}/applications`, { token: tokenStaff })
    if (appStaffList.status === 403) pass('staff application list 403')
    else fail('staff application list 403', String(appStaffList.status))

    const appAgencyList = await api(`/government-support/profiles/${profileAId}/applications`, { token: tokenAgency })
    if (appAgencyList.status === 403) pass('agency admin application list 403')
    else fail('agency admin application list 403', String(appAgencyList.status))

    const adminInqStaff = await api('/government-support/admin/inquiries', { token: tokenStaff })
    if (adminInqStaff.status === 200) pass('staff admin inquiries endpoint')
    else fail('staff admin inquiries endpoint', String(adminInqStaff.status))

    const myInqStaff = await api('/government-support/my/inquiries', { token: tokenStaff })
    if (myInqStaff.status === 403) pass('staff my inquiries 403')
    else fail('staff my inquiries 403', String(myInqStaff.status))

    const myDocStaff = await api('/government-support/my/document-requests', { token: tokenStaff })
    if (myDocStaff.status === 403) pass('staff my document-requests 403')
    else fail('staff my document-requests 403', String(myDocStaff.status))

    const myDocAgency = await api('/government-support/my/document-requests', { token: tokenAgency })
    if (myDocAgency.status === 403) pass('agency admin my document-requests 403')
    else fail('agency admin my document-requests 403', String(myDocAgency.status))
  } else {
    for (const name of [
      'staff not program user',
      'staff profiles empty',
      'agency admin not program user',
      'staff memo list 403',
      'agency admin memo list 403',
      'staff consultation list 403',
      'agency admin consultation list 403',
      'staff progress list 403',
      'agency admin progress list 403',
      'staff file list 403',
      'agency admin file list 403',
      'staff application list 403',
      'agency admin application list 403',
      'staff my document-requests 403',
      'agency admin my document-requests 403',
    ]) {
      skip(name, 'admin credentials unavailable')
    }
  }

  await api(`/government-support/profiles/${profileAId}/files/${profileFileId}`, {
    token: tokenA,
    method: 'DELETE',
    expectStatus: 200,
  })
  const fileListAfterDelete =
    (await api(`/government-support/profiles/${profileAId}/files`, { token: tokenA })).json?.data ?? []
  if (!fileListAfterDelete.some((f) => String(f.id) === profileFileId)) pass('user A delete profile file')
  else fail('user A delete profile file')

  if (industry) {
    const accessIndustry = unwrapData((await api('/government-support/me/access', { token: industry })).json)
    if (accessIndustry?.isGovernmentIndustryAdmin === true || accessIndustry?.isSuperAdmin === true) {
      pass('industry admin operational')
    } else fail('industry admin operational')
  } else {
    skip('industry admin operational', 'admin credentials unavailable')
  }

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
