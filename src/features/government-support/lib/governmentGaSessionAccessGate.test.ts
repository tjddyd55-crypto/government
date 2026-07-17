import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../lib/apiClient'
import type { GovernmentAccessSummary } from '../api/governmentSupportApi'
import {
  governmentGaAccessGateErrorMessage,
  resolveGovernmentGaAccessGatePhase,
} from './governmentGaSessionAccessGate'

const MEMBER_SUMMARY: GovernmentAccessSummary = {
  userId: 'u1',
  isSuperAdmin: false,
  isGovernmentIndustryAdmin: false,
  isGovernmentTenantMember: true,
  governmentIndustryAdminIndustryIds: [],
  governmentAgencyAdminTenantIds: [],
  governmentStaffTenantIds: ['t1'],
  governmentProgramUserTenantIds: [],
  isGovernmentProgramUser: false,
  workspaceTenantIds: ['t1'],
  defaultWorkspaceTenantId: 't1',
  programUserTenantName: null,
  accountCreatedAt: null,
  signatureAlimtalkDryRun: false,
}

describe('resolveGovernmentGaAccessGatePhase', () => {
  it('returns loading only while access fetch is in progress', () => {
    expect(
      resolveGovernmentGaAccessGatePhase({
        loading: true,
        error: null,
        summary: null,
        hasToken: true,
      }),
    ).toBe('loading')
  })

  it('does not treat summary=null after load as loading', () => {
    expect(
      resolveGovernmentGaAccessGatePhase({
        loading: false,
        error: new ApiError('세션 만료', 401),
        summary: null,
        hasToken: true,
      }),
    ).toBe('auth_redirect')
  })

  it('maps 403 to denied phase (permission fallback)', () => {
    expect(
      resolveGovernmentGaAccessGatePhase({
        loading: false,
        error: new ApiError('Forbidden', 403),
        summary: null,
        hasToken: true,
      }),
    ).toBe('denied')
  })

  it('maps server/network failure to error phase', () => {
    expect(
      resolveGovernmentGaAccessGatePhase({
        loading: false,
        error: new ApiError('서버 오류', 500),
        summary: null,
        hasToken: true,
      }),
    ).toBe('error')
  })

  it('redirects when summary grants government access', () => {
    expect(
      resolveGovernmentGaAccessGatePhase({
        loading: false,
        error: null,
        summary: MEMBER_SUMMARY,
        hasToken: true,
      }),
    ).toBe('redirect')
  })

  it('returns denied when loaded summary has no government membership', () => {
    expect(
      resolveGovernmentGaAccessGatePhase({
        loading: false,
        error: null,
        summary: {
          ...MEMBER_SUMMARY,
          isGovernmentTenantMember: false,
        },
        hasToken: true,
      }),
    ).toBe('denied')
  })
})

describe('governmentGaAccessGateErrorMessage', () => {
  it('uses permission message for 403', () => {
    expect(governmentGaAccessGateErrorMessage(new ApiError('x', 403))).toBe('접근 권한이 없습니다.')
  })
})
