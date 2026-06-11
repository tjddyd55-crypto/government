import { Navigate } from 'react-router-dom'
import { GOVERNMENT_ROUTE_PATHS } from '../../constants/governmentRouteKeys'

export default function GovernmentCustomerAppIndexPage() {
  return <Navigate to={GOVERNMENT_ROUTE_PATHS.appRequests} replace />
}
