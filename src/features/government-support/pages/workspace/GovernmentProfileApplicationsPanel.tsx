import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import { useGovernmentConfirmDialog } from '../../hooks/useGovernmentConfirmDialog'
import { useAuth } from '../../../auth/AuthProvider'
import {
  createGovProfileApplication,
  deleteGovProfileApplication,
  fetchGovProfileApplication,
  fetchGovProfileApplications,
  patchGovProfileApplication,
} from '../../api/governmentProfileApplicationsApi'
import {
  GOVERNMENT_PROFILE_APPLICATION_STATUSES,
  GOVERNMENT_PROFILE_APPLICATION_TYPES,
  formatGovernmentProfileApplicationDateTime,
  governmentProfileApplicationListPreview,
  governmentProfileApplicationStatusBadgeClass,
  governmentProfileApplicationStatusLabel,
  type GovernmentProfileApplicationStatus,
} from '../../constants/governmentProfileApplication.config'
import type { GovProfileApplication } from '../../types/governmentProfile.types'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'
import GovernmentProfileApplicationsPageMobile from './applications/GovernmentProfileApplicationsPageMobile'
import GovernmentProfileApplicationsPagePC from './applications/GovernmentProfileApplicationsPagePC'
import type { GovernmentProfileApplicationsViewProps } from './applications/governmentProfileApplicationsViewProps'

export default function GovernmentProfileApplicationsPanel() {
  const { profileId: profileIdParam } = useParams()
  const profileId = String(profileIdParam ?? '').trim()
  const { token } = useAuth()
  const ws = useGovernmentProfileWorkspaceContext()
  const profile = ws.selected
  const { confirm, confirmDialog } = useGovernmentConfirmDialog()

  const [rows, setRows] = useState<GovProfileApplication[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<GovProfileApplication | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [statusNotice, setStatusNotice] = useState('')
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [detailEditing, setDetailEditing] = useState(false)

  const [createTitle, setCreateTitle] = useState('')
  const [createType, setCreateType] = useState('')
  const [createContent, setCreateContent] = useState('')

  const [statusTarget, setStatusTarget] = useState<GovernmentProfileApplicationStatus>('requested')
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editType, setEditType] = useState('')

  const validId = profileId.length > 0

  const profileLabel = useMemo(() => {
    if (profile?.businessName?.trim()) return profile.businessName.trim()
    if (profile?.customerName?.trim()) return profile.customerName.trim()
    return '선택 사업장'
  }, [profile?.businessName, profile?.customerName])

  useEffect(() => {
    if (!statusNotice) {
      return
    }
    const timer = window.setTimeout(() => setStatusNotice(''), 4000)
    return () => window.clearTimeout(timer)
  }, [statusNotice])

  useEffect(() => {
    if (!token?.trim() || !validId) {
      return
    }
    setRows([])
    setSelectedId(null)
    setDetail(null)
  }, [profileId, token, validId])

  const loadList = useCallback(async () => {
    if (!token?.trim() || !validId) {
      return
    }
    setLoading(true)
    setError('')
    try {
      const list = await fetchGovProfileApplications(token, profileId, { limit: 100 })
      setRows(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오지 못했습니다.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [profileId, token, validId])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const resetEditFieldsFromDetail = useCallback((row: GovProfileApplication) => {
    setEditTitle(row.title)
    setEditContent(row.content)
    setEditType(row.applicationType)
    setStatusTarget((row.status as GovernmentProfileApplicationStatus) || 'requested')
  }, [])

  const loadDetail = useCallback(
    async (applicationId: string) => {
      if (!token?.trim() || !validId) {
        return
      }
      setDetailLoading(true)
      setError('')
      try {
        const row = await fetchGovProfileApplication(token, profileId, applicationId)
        setDetail(row)
        resetEditFieldsFromDetail(row)
      } catch (e) {
        setError(e instanceof Error ? e.message : '상세를 불러오지 못했습니다.')
        setDetail(null)
      } finally {
        setDetailLoading(false)
      }
    },
    [profileId, resetEditFieldsFromDetail, token, validId],
  )

  const onSelectApplication = useCallback(
    (id: string) => {
      setSelectedId(id)
      setDetailEditing(false)
      setMobileDetailOpen(true)
      void loadDetail(id)
    },
    [loadDetail],
  )

  const onStartDetailEdit = useCallback(() => {
    setDetailEditing(true)
  }, [])

  const onCancelDetailEdit = useCallback(() => {
    if (detail) {
      resetEditFieldsFromDetail(detail)
    }
    setDetailEditing(false)
  }, [detail, resetEditFieldsFromDetail])

  const onCloseDetail = useCallback(() => {
    setSelectedId(null)
    setDetail(null)
    setDetailEditing(false)
  }, [])

  const onSubmitCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!token?.trim() || !validId) {
      return
    }
    const title = createTitle.trim()
    const content = createContent.trim()
    if (!title) {
      setError('신청 제목을 입력해 주세요.')
      return
    }
    if (!content) {
      setError('신청 내용을 입력해 주세요.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const created = await createGovProfileApplication(token, profileId, {
        title,
        content,
        applicationType: createType.trim() || undefined,
      })
      setCreateTitle('')
      setCreateType('')
      setCreateContent('')
      await loadList()
      onSelectApplication(created.id)
      setStatusNotice('신청을 등록했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const onSaveDetail = async () => {
    if (!token?.trim() || !validId || !detail) {
      return
    }
    const title = editTitle.trim()
    const content = editContent.trim()
    if (!title) {
      setError('신청 제목을 입력해 주세요.')
      return
    }
    if (!content) {
      setError('신청 내용을 입력해 주세요.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const updated = await patchGovProfileApplication(token, profileId, detail.id, {
        title,
        content,
        applicationType: editType.trim(),
      })
      setDetail(updated)
      resetEditFieldsFromDetail(updated)
      setDetailEditing(false)
      setStatusNotice('신청 내용을 저장했습니다.')
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const onSaveStatus = async () => {
    if (!token?.trim() || !validId || !detail) {
      return
    }
    if (statusTarget === detail.status) {
      setError('현재 상태와 동일합니다.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const updated = await patchGovProfileApplication(token, profileId, detail.id, {
        status: statusTarget,
      })
      setDetail(updated)
      resetEditFieldsFromDetail(updated)
      setDetailEditing(false)
      setStatusNotice(`상태를 "${governmentProfileApplicationStatusLabel(updated.status)}"(으)로 변경했습니다.`)
      await loadList()
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const deleteApplicationById = useCallback(
    async (applicationId: string) => {
      if (!token?.trim() || !validId) {
        return
      }
      const row = rows.find((item) => item.id === applicationId)
      const confirmed = await confirm({
        title: '신청 보관',
        message: `#${applicationId} ${row?.title || '신청'}을(를) 보관(삭제)하시겠습니까?`,
        confirmLabel: '보관',
        tone: 'danger',
      })
      if (!confirmed) {
        return
      }
      setBusy(true)
      setError('')
      try {
        await deleteGovProfileApplication(token, profileId, applicationId)
        if (selectedId === applicationId) {
          setDetail(null)
          setSelectedId(null)
          setDetailEditing(false)
          setMobileDetailOpen(false)
        }
        await loadList()
        setStatusNotice('신청을 보관했습니다.')
      } catch (err) {
        setError(err instanceof Error ? err.message : '삭제에 실패했습니다.')
      } finally {
        setBusy(false)
      }
    },
    [confirm, loadList, profileId, rows, selectedId, token, validId],
  )

  const onDeleteApplication = async () => {
    if (!detail) {
      return
    }
    await deleteApplicationById(detail.id)
  }

  if (!validId) {
    return (
      <div className="content-wrapper page-shell">
        <p>사업장을 먼저 선택해 주세요.</p>
      </div>
    )
  }

  const viewProps: GovernmentProfileApplicationsViewProps = {
    error,
    statusNotice,
    loading,
    busy,
    rows,
    selectedId,
    detail,
    detailLoading,
    detailEditing,
    mobileDetailOpen,
    createTitle,
    createType,
    createContent,
    statusTarget,
    editTitle,
    editContent,
    editType,
    applicationTypeOptions: GOVERNMENT_PROFILE_APPLICATION_TYPES,
    statusOptions: GOVERNMENT_PROFILE_APPLICATION_STATUSES,
    profileLabel,
    onSetCreateTitle: setCreateTitle,
    onSetCreateType: setCreateType,
    onSetCreateContent: setCreateContent,
    onSubmitCreate,
    onSelectApplication,
    onStartDetailEdit,
    onCancelDetailEdit,
    onCloseDetail,
    onCloseMobileDetail: () => setMobileDetailOpen(false),
    onDeleteApplicationById: deleteApplicationById,
    onSetStatusTarget: setStatusTarget,
    onSetEditTitle: setEditTitle,
    onSetEditContent: setEditContent,
    onSetEditType: setEditType,
    onSaveDetail,
    onSaveStatus,
    onDeleteApplication,
    onReloadList: loadList,
    formatDateTime: formatGovernmentProfileApplicationDateTime,
    statusLabel: governmentProfileApplicationStatusLabel,
    statusBadgeClass: governmentProfileApplicationStatusBadgeClass,
    listPreviewText: (item) => governmentProfileApplicationListPreview(item.content, item.title),
  }

  return (
    <>
      <ResponsiveLayout<GovernmentProfileApplicationsViewProps>
        PC={GovernmentProfileApplicationsPagePC}
        Mobile={GovernmentProfileApplicationsPageMobile}
        viewProps={viewProps}
      />
      {confirmDialog}
    </>
  )
}
