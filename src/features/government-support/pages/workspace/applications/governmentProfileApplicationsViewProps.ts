import type { FormEvent } from 'react'
import type { GovProfileApplication } from '../../../types/governmentProfile.types'
import type { GovernmentProfileApplicationStatus } from '../../../constants/governmentProfileApplication.config'

export type GovernmentProfileApplicationsViewProps = {
  error: string
  statusNotice: string
  loading: boolean
  busy: boolean
  rows: GovProfileApplication[]
  selectedId: string | null
  detail: GovProfileApplication | null
  detailLoading: boolean
  detailEditing: boolean
  mobileDetailOpen: boolean
  createTitle: string
  createType: string
  createContent: string
  statusTarget: GovernmentProfileApplicationStatus
  editTitle: string
  editContent: string
  editType: string
  applicationTypeOptions: readonly string[]
  statusOptions: Array<{ value: GovernmentProfileApplicationStatus; label: string }>
  profileLabel: string
  onSetCreateTitle: (value: string) => void
  onSetCreateType: (value: string) => void
  onSetCreateContent: (value: string) => void
  onSubmitCreate: (e: FormEvent) => void
  onSelectApplication: (id: string) => void
  onStartDetailEdit: () => void
  onCancelDetailEdit: () => void
  onCloseDetail: () => void
  onCloseMobileDetail: () => void
  onDeleteApplicationById: (id: string) => void
  onSetStatusTarget: (status: GovernmentProfileApplicationStatus) => void
  onSetEditTitle: (value: string) => void
  onSetEditContent: (value: string) => void
  onSetEditType: (value: string) => void
  onSaveDetail: () => void
  onSaveStatus: () => void
  onDeleteApplication: () => void
  onReloadList: () => void
  formatDateTime: (iso: string | null | undefined) => string
  statusLabel: (status: string) => string
  statusBadgeClass: (status: string) => string
  listPreviewText: (item: GovProfileApplication) => string
}
