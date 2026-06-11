import { Navigate } from 'react-router-dom'
import { GOVERNMENT_ROUTE_PATHS } from '../../constants/governmentRouteKeys'

/** 보험 CRM `my-businesses` → workspace SSOT `my-applications` 리다이렉트 */
export default function GovernmentUserBusinessesPage() {
  return <Navigate to={GOVERNMENT_ROUTE_PATHS.myApplications} replace />
}
