import { Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthProvider'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'
import { canManageGovernmentNotices } from '../../lib/governmentHome'
import '../../government-support.css'

/**
 * 대행사 직원·관리자용 공지/전달사항 (보험 CRM GA 직원 공지 역할).
 * 사업장/고객/신청 데이터와 분리 — CRUD API는 후속.
 */
export default function GovernmentAdminNoticesPage() {
  const { token } = useAuth()
  const { summary } = useGovernmentAccess(token)

  if (!canManageGovernmentNotices(summary)) {
    return (
      <div className="government-admin-page">
        <h1 className="government-page__title">접근할 수 없습니다</h1>
        <p className="government-page__muted">공지/전달사항은 대행사 운영 계정만 이용할 수 있습니다.</p>
      </div>
    )
  }

  const showProgramUsersLink =
    Boolean(summary?.isSuperAdmin || summary?.isGovernmentIndustryAdmin) ||
    (summary?.governmentAgencyAdminTenantIds?.length ?? 0) > 0

  return (
    <div className="government-admin-page government-admin-notices-page">
      <h1 className="government-page__title">공지/전달사항</h1>
      <p className="government-page__muted">
        소속 대행사 이용자에게 전달할 공지·안내·요청사항을 관리합니다. 사업장/고객/신청 데이터는 이
        화면에서 다루지 않습니다.
      </p>
      <section className="government-admin-notices-page__placeholder">
        <p className="government-page__muted">
          공지 작성·발송 기능은 준비 중입니다. 현재는 운영 메뉴 구조만 제공합니다.
        </p>
        {showProgramUsersLink ? (
          <p className="government-page__muted" style={{ marginTop: '1rem' }}>
            이용자 계정·상태는{' '}
            <Link to="/government/admin/program-users" className="dark-link">
              이용자 관리
            </Link>
            에서만 확인하세요.
          </p>
        ) : null}
      </section>
    </div>
  )
}
