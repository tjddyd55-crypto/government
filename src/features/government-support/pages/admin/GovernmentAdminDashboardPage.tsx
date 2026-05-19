import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthProvider'
import { fetchGovAgencies, fetchGovProfiles } from '../../api/governmentProfilesApi'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'

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
  const [agencyCount, setAgencyCount] = useState<number | null>(null)
  const [profileCount, setProfileCount] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    void Promise.all([fetchGovAgencies(token), fetchGovProfiles(token)])
      .then(([agencies, profiles]) => {
        setAgencyCount(agencies.length)
        setProfileCount(profiles.length)
      })
      .catch(() => {
        setAgencyCount(0)
        setProfileCount(0)
      })
  }, [token])

  return (
    <div className="government-admin-page">
      <h1 className="government-page__title">대시보드</h1>
      <p className="government-page__muted">정부지원 CRM 업종 관리자 화면입니다.</p>
      <div className="government-admin-dashboard__stats">
        <StatCard label="수행기관/대행사" value={agencyCount} />
        <StatCard label="고객/사업장" value={profileCount} />
        <StatCard label="워크스페이스 tenant" value={summary?.workspaceTenantIds.length ?? 0} />
      </div>
      <ul className="government-admin-dashboard__links">
        <li>
          <Link to="/government/admin/agencies" className="dark-link">
            수행기관/대행사 등록
          </Link>
        </li>
        <li>
          <Link to="/government/workspace" className="dark-link">
            고객/사업장 워크스페이스
          </Link>
        </li>
        <li>
          <Link to="/government/admin/profiles" className="dark-link">
            고객/사업장 목록
          </Link>
        </li>
      </ul>
    </div>
  )
}
