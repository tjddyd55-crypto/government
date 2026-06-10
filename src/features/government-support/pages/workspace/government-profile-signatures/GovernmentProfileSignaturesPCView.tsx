import type { GovernmentProfileSignaturesViewProps } from './governmentProfileSignaturesViewProps'
import GovernmentProfileSignaturesView from './GovernmentProfileSignaturesView'

export default function GovernmentProfileSignaturesPCView(
  props: GovernmentProfileSignaturesViewProps & { token: string },
) {
  return <GovernmentProfileSignaturesView {...props} variant="pc" />
}
