import { Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { GovernmentAccessProvider } from '../context/GovernmentAccessContext'

/** 관리자 단일 레이아웃 트리 — access summary 1회 fetch 후 하위 가드·레이아웃 공유 */
export function GovernmentAdminAccessShell() {
  const { token } = useAuth()
  return (
    <GovernmentAccessProvider token={token}>
      <Outlet />
    </GovernmentAccessProvider>
  )
}
