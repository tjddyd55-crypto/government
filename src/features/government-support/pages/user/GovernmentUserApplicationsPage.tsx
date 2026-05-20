import { Link } from 'react-router-dom'
import { EmptyState } from '../../../../components/feedback'
import { useDocumentTitle } from '../../../../hooks/useDocumentTitle'
import '../../government-support.css'

export default function GovernmentUserApplicationsPage() {
  useDocumentTitle('정부지원 CRM · 내 고객/신청')

  return (
    <section className="government-user-section">
      <h1 className="government-page__title">내 고객/신청</h1>
      <EmptyState message="사업장을 선택하면 신청 내역과 고객 정보를 관리할 수 있습니다." />
      <p className="government-page__muted" style={{ marginTop: '1rem' }}>
        <Link to="/government/my-businesses" className="dark-link">
          내 사업장으로 이동
        </Link>
      </p>
    </section>
  )
}
