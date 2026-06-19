import { GovernmentProfileInlineNotesSection } from '../../../components/GovernmentProfileInlineNotesSection'
import type { GovernmentProfileMemosViewProps } from './governmentProfileMemosViewProps'

export default function GovernmentProfileMemosPagePC({
  profileId,
  token,
  memos,
  loading,
  statusText,
  profileLabel,
  onMemosChange,
  onStatusMessage,
  onAddTodoFromMemo,
}: GovernmentProfileMemosViewProps) {
  if (loading) {
    return (
      <section className="customer-workspace-home">
        <h3 className="customer-workspace-home__title">사업장 메모</h3>
        <p className="customer-workspace-home__desc">불러오는 중…</p>
      </section>
    )
  }

  return (
    <section className="customer-workspace-home">
      <h3 className="customer-workspace-home__title">사업장 메모</h3>
      <p className="customer-workspace-home__desc">{profileLabel}</p>
      <GovernmentProfileInlineNotesSection
        key={profileId}
        profileId={profileId}
        token={token}
        memos={memos}
        onMemosChange={onMemosChange}
        onStatusMessage={onStatusMessage}
        onAddTodoFromMemo={onAddTodoFromMemo}
        layout="default"
      />
      {statusText ? <p className="customer-workspace-home__selected">{statusText}</p> : null}
    </section>
  )
}
