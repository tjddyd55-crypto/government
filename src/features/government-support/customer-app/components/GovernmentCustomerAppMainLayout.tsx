import { Outlet } from 'react-router-dom'
import '../../government-support.css'
import GovernmentCustomerAppShell from './GovernmentCustomerAppShell'

export default function GovernmentCustomerAppMainLayout() {
  return (
    <GovernmentCustomerAppShell>
      <Outlet />
    </GovernmentCustomerAppShell>
  )
}
