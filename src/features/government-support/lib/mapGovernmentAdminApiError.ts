import { ApiError } from '../../../lib/apiClient'

export function mapGovernmentAdminApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return '세션이 만료되었습니다. 다시 로그인해 주세요.'
    }
    if (error.status === 403) {
      return '접근 권한이 없습니다.'
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}
