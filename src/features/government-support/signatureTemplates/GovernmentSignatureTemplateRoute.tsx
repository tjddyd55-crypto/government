import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'

export function GovernmentSignatureTemplateRoute() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to={GOVERNMENT_ROUTE_PATHS.login} replace />
  }
  return <Outlet />
}
