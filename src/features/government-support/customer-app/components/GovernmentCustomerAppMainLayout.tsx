import { Outlet } from 'react-router-dom'
import GovernmentCustomerAppShell from './GovernmentCustomerAppShell'

export default function GovernmentCustomerAppMainLayout() {
  return (
    <GovernmentCustomerAppShell>
      <Outlet />
    </GovernmentCustomerAppShell>
  )
}
