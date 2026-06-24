import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import { governmentPageTitle } from '../../../../config/governmentAppMeta'
import { useDocumentTitle } from '../../../../hooks/useDocumentTitle'
import { useAuth } from '../../../auth/AuthProvider'
import { useGovernmentRegionsState } from '../../hooks/useGovernmentRegionsState'
import GovernmentRegionsPageMobileView from './regions/GovernmentRegionsPageMobileView'
import GovernmentRegionsPagePCView from './regions/GovernmentRegionsPagePCView'

export default function GovernmentRegionsPage() {
  useDocumentTitle(governmentPageTitle('지역별 보기'))
  const { token } = useAuth()
  const viewProps = useGovernmentRegionsState(token)

  return (
    <ResponsiveLayout
      PC={GovernmentRegionsPagePCView}
      Mobile={GovernmentRegionsPageMobileView}
      viewProps={viewProps}
    />
  )
}
