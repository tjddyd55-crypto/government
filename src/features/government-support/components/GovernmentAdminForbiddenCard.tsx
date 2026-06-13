type GovernmentAdminForbiddenCardProps = {
  title?: string
  message: string
}

export default function GovernmentAdminForbiddenCard({
  title = '접근 권한이 없습니다',
  message,
}: GovernmentAdminForbiddenCardProps) {
  return (
    <div className="government-admin-forbidden-card" data-testid="government-admin-forbidden-card">
      <h2 className="government-admin-forbidden-card__title">{title}</h2>
      <p className="government-admin-forbidden-card__message">{message}</p>
    </div>
  )
}
