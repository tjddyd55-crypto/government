import GovernmentProfileStorageWorkspace from '../../components/GovernmentProfileStorageWorkspace'

type Props = {
  token: string
  profileId: string
}

/** PC 전용 우측 문서/파일 패널 — 기존 파일 API·StorageWorkspace 재사용 */
export default function GovernmentProfileWorkspaceRightDocumentsPanel({ token, profileId }: Props) {
  return (
    <div className="government-profile-workspace-right-documents-panel">
      <header className="government-profile-workspace-right-documents-panel__header">
        <h3 className="government-profile-workspace-right-documents-panel__title">문서 관리</h3>
        <p className="government-profile-workspace-right-documents-panel__hint">서류/파일 업로드·목록</p>
      </header>
      <div className="government-profile-workspace-right-documents-panel__body">
        <GovernmentProfileStorageWorkspace
          token={token}
          profileId={profileId}
          variant="pc"
          panelLayout="sidebar"
        />
      </div>
    </div>
  )
}
