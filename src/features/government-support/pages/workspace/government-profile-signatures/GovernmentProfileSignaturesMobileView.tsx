import type { GovernmentProfileSignaturesViewProps } from './governmentProfileSignaturesViewProps'
import GovernmentProfileSignaturesView from './GovernmentProfileSignaturesView'

export default function GovernmentProfileSignaturesMobileView(
  props: GovernmentProfileSignaturesViewProps & { token: string },
) {
  return <GovernmentProfileSignaturesView {...props} variant="mobile" />
}
