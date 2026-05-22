import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  GOV_PROFILE_APPLICATION_CONTENT_MAX,
  GOV_PROFILE_APPLICATION_TITLE_MAX,
  mapGovSupportProfileApplicationRow,
  normalizeGovProfileApplicationContent,
  normalizeGovProfileApplicationStatus,
  normalizeGovProfileApplicationTitle,
  parseGovProfileApplicationPatchBody,
} from './governmentProfileApplications.js'

describe('normalizeGovProfileApplicationStatus', () => {
  it('유효한 상태 허용', () => {
    const r = normalizeGovProfileApplicationStatus('processing')
    assert.equal(r.ok, true)
    assert.equal(r.status, 'processing')
  })

  it('잘못된 상태 거부', () => {
    const r = normalizeGovProfileApplicationStatus('invalid')
    assert.equal(r.ok, false)
  })
})

describe('normalizeGovProfileApplicationTitle', () => {
  it('필수 제목 거부', () => {
    const r = normalizeGovProfileApplicationTitle('  ', { required: true })
    assert.equal(r.ok, false)
  })

  it('최대 길이 초과 거부', () => {
    const r = normalizeGovProfileApplicationTitle('x'.repeat(GOV_PROFILE_APPLICATION_TITLE_MAX + 1))
    assert.equal(r.ok, false)
  })
})

describe('normalizeGovProfileApplicationContent', () => {
  it('최대 길이 초과 거부', () => {
    const r = normalizeGovProfileApplicationContent('x'.repeat(GOV_PROFILE_APPLICATION_CONTENT_MAX + 1))
    assert.equal(r.ok, false)
  })
})

describe('parseGovProfileApplicationPatchBody', () => {
  it('POST: title + content + type', () => {
    const r = parseGovProfileApplicationPatchBody(
      { title: '융자 신청', content: '내용', applicationType: '융자' },
      { requireTitle: true, requireContent: true },
    )
    assert.equal(r.ok, true)
    assert.equal(r.patch.title, '융자 신청')
    assert.equal(r.patch.content, '내용')
    assert.equal(r.patch.applicationType, '융자')
  })

  it('PATCH: 수정 필드 없으면 거부', () => {
    const r = parseGovProfileApplicationPatchBody({}, { requireTitle: false, requireContent: false })
    assert.equal(r.ok, false)
  })
})

describe('mapGovSupportProfileApplicationRow', () => {
  it('ISO 날짜 매핑', () => {
    const submitted = new Date('2026-05-19T09:00:00.000Z')
    const row = mapGovSupportProfileApplicationRow({
      id: 7,
      profile_id: 2,
      owner_user_id: 'u1',
      title: '신청',
      application_type: '융자',
      status: 'requested',
      content: '본문',
      submitted_at: submitted,
      completed_at: null,
      created_by_user_id: 'u1',
      updated_by_user_id: 'u1',
      created_at: submitted,
      updated_at: submitted,
      archived_at: null,
    })
    assert.equal(row.profileId, '2')
    assert.equal(row.applicationType, '융자')
    assert.equal(row.submittedAt, submitted.toISOString())
  })
})
