import { useEffect, useState } from 'react'
import { LoadingState, StatusMessage } from '../../../../components/feedback'
import { GOVERNMENT_APP_TITLE, governmentPageTitle } from '../../../../config/governmentAppMeta'
import { useDocumentTitle } from '../../../../hooks/useDocumentTitle'
import { useAuth } from '../../../auth/AuthProvider'
import { fetchMe, type MeResponse } from '../../../auth/authApi'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'
import { formatOpsDate } from '../../constants/governmentOperations'
import '../../government-support.css'

function labelForAccountStatus(status: string): string {
  const s = status.trim().toLowerCase()
  if (s === 'active') return '정상'
  if (s === 'blocked') return '차단'
  if (s === 'inactive') return '비활성'
  return status || '-'
}

/** 회원가입 시 저장된 users.phone_number 표시용 */
function formatUserPhoneDisplay(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return '-'
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return digits
}

export default function GovernmentUserMePage() {
  useDocumentTitle(governmentPageTitle('내 정보'))
  const { token, user } = useAuth()
  const { summary } = useGovernmentAccess(token)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<MeResponse | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    void fetchMe(token)
      .then((row) => {
        if (!cancelled) setMe(row)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '내 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (loading) return <LoadingState message="불러오는 중…" />
  if (error) return <StatusMessage message={error} tone="error" className="m-3" />

  const rows: { label: string; value: string }[] = [
    { label: '아이디', value: user?.username ?? me?.username ?? '-' },
    {
      label: '이름',
      value: user?.displayName?.trim() || me?.display_name?.trim() || user?.username || me?.username || '-',
    },
    { label: '휴대폰 번호', value: formatUserPhoneDisplay(me?.phone_number) },
    {
      label: '소속 대행사',
      value: summary?.programUserTenantName?.trim() || '소속 대행사 정보 없음',
    },
    {
      label: '가입일',
      value: summary?.accountCreatedAt ? formatOpsDate(summary.accountCreatedAt) : '-',
    },
    { label: '계정 상태', value: labelForAccountStatus(me?.status ?? '') },
  ]

  return (
    <section className="government-user-section gov-user-page gov-user-me-page">
      <h1 className="government-page__title">내 정보</h1>
      <p className="government-page__muted">{GOVERNMENT_APP_TITLE} 이용자 계정 정보입니다.</p>
      <dl className="government-user-me__list gov-user-card">
        {rows.map((row) => (
          <div key={row.label} className="government-user-me__row">
            <dt className="government-user-me__label">{row.label}</dt>
            <dd className="government-user-me__value">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="government-page__muted government-user-me__note">
        휴대폰 번호는 회원가입 시 인증한 번호입니다. 변경은 인증 절차가 필요하며, 이 화면에서는 수정할 수
        없습니다.
      </p>
      <p className="government-page__muted government-user-me__note">
        비밀번호 변경은 추후 제공 예정입니다.
      </p>
    </section>
  )
}
