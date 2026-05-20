import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthProvider'
import { fetchGovAgencies } from '../../api/governmentProfilesApi'
import { fetchGovernmentAdminUsers } from '../../api/governmentAdminUsersApi'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'
import { canManageGovernmentUsers } from '../../lib/governmentAccess'

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="government-admin-dashboard__stat-card">
      <span className="government-admin-dashboard__stat-label">{label}</span>
      <strong>{value ?? '—'}</strong>
    </div>
  )
}

export default function GovernmentAdminDashboardPage() {
  const { token } = useAuth()
  const { summary } = useGovernmentAccess(token)
  const showUserMgmt = canManageGovernmentUsers(summary)
  const [agencyCount, setAgencyCount] = useState<number | null>(null)
  const [programUserCount, setProgramUserCount] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    void fetchGovAgencies(token)
      .then((agencies) => setAgencyCount(agencies.length))
      .catch(() => setAgencyCount(0))
  }, [token])

  useEffect(() => {
    if (!token || !showUserMgmt) return
    void fetchGovernmentAdminUsers(token, { role: 'government_user' })
      .then((users) => setProgramUserCount(users.length))
      .catch(() => setProgramUserCount(0))
  }, [token, showUserMgmt])

  return (
    <div className="government-admin-page">
      <h1 className="government-page__title">대시보드</h1>
      <p className="government-page__muted">정부지원 CRM 운영 관리 화면입니다.</p>
      <div className="government-admin-dashboard__stats">
        <StatCard label="대행사" value={agencyCount} />
        {showUserMgmt ? <StatCard label="프로그램 이용자" value={programUserCount} /> : null}
      </div>
      <ul className="government-admin-dashboard__links">
        <li>
          <Link to="/government/admin/agencies" className="dark-link">
            대행사 관리
          </Link>
        </li>
        {showUserMgmt ? (
          <>
            <li>
              <Link to="/government/admin/program-users" className="dark-link">
                이용자 관리
              </Link>
            </li>
            <li>
              <Link to="/government/admin/users" className="dark-link">
                직원 관리
              </Link>
            </li>
          </>
        ) : null}
      </ul>
      <p className="government-page__muted" style={{ marginTop: '1.5rem' }}>
        사업장/고객 데이터는 이용자 본인 워크스페이스 또는 이용자 상세 요약에서만 확인합니다. 전체
        목록 메뉴는 제공하지 않습니다.
      </p>
    </div>
  )
}
