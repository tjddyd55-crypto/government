import GovernmentProfileFilesPagePC from './GovernmentProfileFilesPagePC'
import type { GovernmentProfileFilesViewProps } from './governmentProfileFilesViewProps'

export default function GovernmentProfileFilesPageMobile(props: GovernmentProfileFilesViewProps) {
  return (
    <div className="government-profile-mobile-section">
      <GovernmentProfileFilesPagePC {...props} variant="mobile" />
    </div>
  )
}
