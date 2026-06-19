import type { GovernmentProfileProgressViewProps } from './governmentProfileProgressViewProps'
import GovernmentProfileProgressPageBody from './GovernmentProfileProgressPageBody'

export default function GovernmentProfileProgressPageMobile(props: GovernmentProfileProgressViewProps) {
  return (
    <div className="government-profile-mobile-section">
      <GovernmentProfileProgressPageBody {...props} />
    </div>
  )
}
