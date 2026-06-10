import type { ReactNode } from 'react'

type GovernmentAdminPageShellProps = {
  title: string
  description: ReactNode
  toolbar?: ReactNode
  children: ReactNode
  /** 보험 admin-ga-management / admin-user-management 스코프 */
  managementKind?: 'ga' | 'user'
}

/** 보험 GaManagementPage · UserManagementPage 와 동일한 page-header · toolbar · table-wrap 골격 */
export default function GovernmentAdminPageShell({
  title,
  description,
  toolbar,
  children,
  managementKind = 'ga',
}: GovernmentAdminPageShellProps) {
  const managementClass = managementKind === 'user' ? 'admin-user-management' : 'admin-ga-management'

  return (
    <main className={`page page--with-back ${managementClass}`}>
      <header className="page-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      {toolbar ? (
        <section className={`admin-toolbar ${managementClass}__toolbar card auth-card`}>{toolbar}</section>
      ) : null}

      <div className={`card ${managementClass}__table-wrap`}>{children}</div>
    </main>
  )
}
