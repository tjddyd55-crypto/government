import type { GovernmentProfileSignaturesViewProps } from './governmentProfileSignaturesViewProps'
import GovernmentProfileSignaturesView from './GovernmentProfileSignaturesView'

export default function GovernmentProfileSignaturesMobileView(
  props: GovernmentProfileSignaturesViewProps & { token: string },
) {
  return (
    <div className="government-profile-mobile-section">
      <GovernmentProfileSignaturesView {...props} variant="mobile" />
    </div>
  )
}
