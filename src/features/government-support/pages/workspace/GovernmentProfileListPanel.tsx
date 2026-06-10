import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import GovernmentProfileListPanelPCView from './GovernmentProfileListPanelPCView'
import GovernmentProfileListPanelMobileView from './GovernmentProfileListPanelMobileView'

export default function GovernmentProfileListPanel() {
  return <ResponsiveLayout PC={GovernmentProfileListPanelPCView} Mobile={GovernmentProfileListPanelMobileView} />
}
