import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GovernmentAccessSummary } from '../api/governmentSupportApi'
import {
  fetchGovernmentAdminDashboardSummary,
  type GovernmentAdminDashboardSummary,
} from '../api/governmentAdminDashboardApi'
import { fetchGovAgencies } from '../api/governmentProfilesApi'
import { fetchGovernmentAdminUsers } from '../api/governmentAdminUsersApi'
import { canManageGovernmentUsers } from '../lib/governmentAccess'
import { canManageGovernmentSignatures, isGovernmentOperationalAccount } from '../lib/governmentHome'
import {
  GOVERNMENT_ADMIN_SIGNATURE_PDF_LIST_PATH,
  GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH,
} from '../config/governmentAdminNav'
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'

export type GovernmentAdminDashboardHubCard = {
  to: string
  title: string
  description: string
}

export type GovernmentAdminDashboardViewProps = {
  variant: 'platform' | 'operational'
  loading: boolean
  error: string
  summary: GovernmentAdminDashboardSummary | null
  platformCards: GovernmentAdminDashboardHubCard[]
  showUserMgmt: boolean
  canManageSignatures: boolean
  signatureSetupCards: GovernmentAdminDashboardHubCard[]
}

export function useGovernmentAdminDashboardState(
  token: string | null,
  accessSummary: GovernmentAccessSummary | null,
): GovernmentAdminDashboardViewProps {
  const showUserMgmt = canManageGovernmentUsers(accessSummary)
  const canManageSignatures = canManageGovernmentSignatures(accessSummary)
  const variant: 'platform' | 'operational' = useMemo(() => {
    if (!accessSummary) return 'platform'
    if (accessSummary.isSuperAdmin || accessSummary.isGovernmentIndustryAdmin) {
      return 'platform'
    }
    if (isGovernmentOperationalAccount(accessSummary)) {
      return 'operational'
    }
    return 'platform'
  }, [accessSummary])

  const [agencyCount, setAgencyCount] = useState<number | null>(null)
  const [programUserCount, setProgramUserCount] = useState<number | null>(null)
  const [summary, setSummary] = useState<GovernmentAdminDashboardSummary | null>(null)
  const [loading, setLoading] = useState(variant === 'operational')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || variant !== 'platform') return
    void fetchGovAgencies(token)
      .then((agencies) => setAgencyCount(agencies.length))
      .catch(() => setAgencyCount(0))
  }, [token, variant])

  useEffect(() => {
    if (!token || !showUserMgmt || variant !== 'platform') return
    void fetchGovernmentAdminUsers(token, { role: 'government_user' })
      .then((users) => setProgramUserCount(users.length))
      .catch(() => setProgramUserCount(0))
  }, [token, showUserMgmt, variant])

  const loadOperationalSummary = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await fetchGovernmentAdminDashboardSummary(token)
      setSummary(data)
      setError('')
    } catch (e) {
      setSummary(null)
      setError(e instanceof Error ? e.message : '운영 대시보드를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (variant !== 'operational' || !token) {
      setLoading(false)
      return
    }
    void loadOperationalSummary()
  }, [variant, token, loadOperationalSummary])

  const platformCards = useMemo((): GovernmentAdminDashboardHubCard[] => {
    const list: GovernmentAdminDashboardHubCard[] = [
      {
        to: GOVERNMENT_ROUTE_PATHS.adminAgencies,
        title: '대행사 관리',
        description: `등록 대행사 ${agencyCount ?? '—'}곳 · 기관 코드·가입 링크 발급`,
      },
    ]
    if (showUserMgmt) {
      list.push(
        {
          to: GOVERNMENT_ROUTE_PATHS.adminProgramUsers,
          title: '이용자 관리',
          description: `프로그램 이용자 ${programUserCount ?? '—'}명 · 사업장 요약은 이용자 상세에서만`,
        },
        {
          to: GOVERNMENT_ROUTE_PATHS.adminUsers,
          title: '대행사 직원',
          description: '대행사 직원·관리자 계정 등록·상태 관리',
        },
      )
    }
    list.push(
      {
        to: GOVERNMENT_ROUTE_PATHS.adminNotices,
        title: '공지/전달사항',
        description: '운영 공지·전달사항 게시',
      },
      {
        to: GOVERNMENT_ROUTE_PATHS.adminResources,
        title: '자료실/서식함',
        description: '운영 자료·서식 파일 관리',
      },
    )
    if (canManageSignatures) {
      list.push(
        {
          to: GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH,
          title: '전자서명 템플릿',
          description: '전자서명 발송용 문서 템플릿 관리',
        },
        {
          to: GOVERNMENT_ADMIN_SIGNATURE_PDF_LIST_PATH,
          title: 'PDF 좌표 설정',
          description: 'PDF 업로드 및 서명 좌표 편집',
        },
      )
    }
    return list
  }, [agencyCount, programUserCount, showUserMgmt, canManageSignatures])

  const signatureSetupCards = useMemo((): GovernmentAdminDashboardHubCard[] => {
    if (!canManageSignatures) return []
    return [
      {
        to: GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH,
        title: '전자서명 템플릿',
        description: '전자서명 문서 템플릿을 생성·수정합니다.',
      },
      {
        to: GOVERNMENT_ADMIN_SIGNATURE_PDF_LIST_PATH,
        title: 'PDF 좌표 설정',
        description: 'PDF를 업로드하고 서명·입력 좌표를 설정합니다.',
      },
    ]
  }, [canManageSignatures])

  return {
    variant,
    loading,
    error,
    summary,
    platformCards,
    showUserMgmt,
    canManageSignatures,
    signatureSetupCards,
  }
}
