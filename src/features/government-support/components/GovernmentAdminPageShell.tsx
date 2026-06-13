import type { ReactNode } from 'react'
import GovernmentAdminForbiddenCard from './GovernmentAdminForbiddenCard'

type GovernmentAdminPageShellProps = {
  title: string
  description: ReactNode
  toolbar?: ReactNode
  children?: ReactNode
  /** 보험 admin-ga-management / admin-user-management 스코프 */
  managementKind?: 'ga' | 'user'
  testId?: string
  forbidden?: { title?: string; message: string }
}

/** 보험 GaManagementPage · UserManagementPage 와 동일한 page-header · toolbar · table-wrap 골격 */
export default function GovernmentAdminPageShell({
  title,
  description,
  toolbar,
  children,
  managementKind = 'ga',
  testId = 'government-admin-page',
  forbidden,
}: GovernmentAdminPageShellProps) {
  const managementClass = managementKind === 'user' ? 'admin-user-management' : 'admin-ga-management'

  if (forbidden) {
    return (
      <div
        className={`government-admin-page ${managementClass}`}
        data-testid={testId}
      >
        <header className="page-header">
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </header>
        <GovernmentAdminForbiddenCard title={forbidden.title} message={forbidden.message} />
      </div>
    )
  }

  return (
    <div className={`government-admin-page ${managementClass}`} data-testid={testId}>
      <header className="page-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      {toolbar ? (
        <section className={`admin-toolbar ${managementClass}__toolbar card auth-card`}>{toolbar}</section>
      ) : null}

      <div className={`card ${managementClass}__table-wrap`}>{children}</div>
    </div>
  )
}
