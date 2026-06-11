import type { GovernmentProfileWorkspaceTab } from '../../config/governmentProfileWorkspaceTabs'
import type { GovernmentProfileWorkspaceLayoutViewProps } from './governmentProfileWorkspaceViewProps'

export type GovernmentProfileWorkspaceTabsProps = Pick<
  GovernmentProfileWorkspaceLayoutViewProps,
  | 'activeTab'
  | 'selectedProfileId'
  | 'onClickBasic'
  | 'onClickFiles'
  | 'onClickDocuments'
  | 'onClickEdoc'
  | 'onClickConsultations'
  | 'onClickMemos'
  | 'onClickProgress'
  | 'onClickSignatures'
  | 'onClickApplications'
>

export function tabHandlerForId(
  tab: GovernmentProfileWorkspaceTab,
  props: GovernmentProfileWorkspaceTabsProps,
): () => void {
  const map: Record<GovernmentProfileWorkspaceTab, () => void> = {
    basic: props.onClickBasic,
    files: props.onClickFiles,
    documents: props.onClickDocuments,
    edoc: props.onClickEdoc,
    consultations: props.onClickConsultations,
    memos: props.onClickMemos,
    progress: props.onClickProgress,
    signatures: props.onClickSignatures,
    applications: props.onClickApplications,
  }
  return map[tab]
}
