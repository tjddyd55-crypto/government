import { Navigate } from 'react-router-dom'
import { GOVERNMENT_ROUTE_PATHS } from '../../constants/governmentRouteKeys'

/** 관리자 메뉴에서 숨김 — 직접 URL 접근 시 대시보드로 이동 (API/DB 유지) */
export default function GovernmentAdminDocumentRequestsPage() {
  return <Navigate to={GOVERNMENT_ROUTE_PATHS.adminRoot} replace />
}
