import { EmptyState } from '../../../../components/feedback'

/** 사용자 관리 API 연동 전 안내 화면 (보험 CRM UserManagementPage 패턴으로 확장 예정) */
export default function GovernmentAdminUsersPage() {
  return (
    <div className="government-admin-page">
      <h1 className="government-page__title">사용자 관리</h1>
      <EmptyState message="사용자 관리 API 준비 중입니다. 현재는 가입 코드(/government/join)로 staff를 등록하세요." />
    </div>
  )
}
