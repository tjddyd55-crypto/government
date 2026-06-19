import { StatusMessage } from '../../../../../components/feedback'
import { GovernmentProfileInlineNotesSection } from '../../../components/GovernmentProfileInlineNotesSection'
import type { GovernmentProfileMemosViewProps } from './governmentProfileMemosViewProps'

export default function GovernmentProfileMemosPageMobile({
  profileId,
  token,
  memos,
  loading,
  statusText,
  onMemosChange,
  onStatusMessage,
  onAddTodoFromMemo,
}: GovernmentProfileMemosViewProps) {
  if (loading) {
    return (
      <div className="content-wrapper page-shell government-profile-mobile-section government-profile-mobile-memos">
        <div className="government-profile-mobile-empty">메모를 불러오는 중…</div>
      </div>
    )
  }

  return (
    <div className="content-wrapper page-shell government-profile-mobile-section government-profile-mobile-memos">
      <StatusMessage message={statusText} tone="error" className="status-message--flush-top" />

      <GovernmentProfileInlineNotesSection
        key={profileId}
        profileId={profileId}
        token={token}
        memos={memos}
        onMemosChange={onMemosChange}
        onStatusMessage={onStatusMessage}
        onAddTodoFromMemo={onAddTodoFromMemo}
        layout="mobileRecord"
      />
    </div>
  )
}
