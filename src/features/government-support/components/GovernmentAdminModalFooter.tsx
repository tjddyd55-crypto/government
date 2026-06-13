import type { ReactNode } from 'react'

type GovernmentAdminModalFooterProps = {
  children: ReactNode
}

export default function GovernmentAdminModalFooter({ children }: GovernmentAdminModalFooterProps) {
  return <div className="government-admin-modal-footer">{children}</div>
}
