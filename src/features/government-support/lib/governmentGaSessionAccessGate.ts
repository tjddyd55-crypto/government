import { ApiError } from '../../../lib/apiClient'
import type { GovernmentAccessSummary } from '../api/governmentSupportApi'
import { resolveGovernmentAccessState } from './governmentAccess'

export type GovernmentGaAccessGatePhase = 'loading' | 'redirect' | 'auth_redirect' | 'denied' | 'error'

export function resolveGovernmentGaAccessGatePhase(args: {
  loading: boolean
  error: unknown
  summary: GovernmentAccessSummary | null
  hasToken: boolean
}): GovernmentGaAccessGatePhase {
  const accessState = resolveGovernmentAccessState(args.summary, args.loading, args.hasToken)
  if (accessState === 'loading') {
    return 'loading'
  }
  if (args.error instanceof ApiError && args.error.status === 401) {
    return 'auth_redirect'
  }
  if (args.error instanceof ApiError && args.error.status === 403) {
    return 'denied'
  }
  if (args.error) {
    return 'error'
  }
  if (accessState === 'denied') {
    return 'denied'
  }
  if (args.summary) {
    return 'redirect'
  }
  return 'error'
}

export function governmentGaAccessGateErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return '접근 권한이 없습니다.'
    }
    if (error.status === 401) {
      return '세션이 만료되었습니다. 다시 로그인해 주세요.'
    }
    if (error.message.trim()) {
      return error.message.trim()
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  return '권한 확인에 실패했습니다. 다시 시도해 주세요.'
}
