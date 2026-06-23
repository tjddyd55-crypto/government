import { useState } from 'react'
import GovernmentProfileStorageWorkspace from '../../components/GovernmentProfileStorageWorkspace'

type Props = {
  token: string
  profileId: string
}

/** PC 전용 우측 문서/파일 패널 — 기존 파일 API·StorageWorkspace 재사용 */
export default function GovernmentProfileWorkspaceRightDocumentsPanel({ token, profileId }: Props) {
  const [fileCount, setFileCount] = useState(0)

  return (
    <div className="government-profile-workspace-right-documents-panel">
      <header className="government-profile-workspace-right-documents-panel__header">
        <div className="government-profile-workspace-right-documents-panel__header-row">
          <h3 className="government-profile-workspace-right-documents-panel__title">문서 관리</h3>
          <span className="government-profile-workspace-right-documents-panel__count">총 {fileCount}개</span>
        </div>
      </header>
      <div className="government-profile-workspace-right-documents-panel__body">
        <GovernmentProfileStorageWorkspace
          token={token}
          profileId={profileId}
          variant="pc"
          panelLayout="sidebar"
          onFileCountChange={setFileCount}
        />
      </div>
    </div>
  )
}
