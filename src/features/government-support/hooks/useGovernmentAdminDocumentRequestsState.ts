import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createGovAdminDocumentRequest,
  downloadGovAdminDocumentRequestFile,
  fetchGovAdminDocumentRequestDetail,
  fetchGovAdminDocumentRequests,
  patchGovAdminDocumentRequestAssignee,
  type GovAdminDocumentRequestDetail,
  type GovAdminDocumentRequestFile,
  type GovAdminDocumentRequestListItem,
} from '../api/governmentDocumentRequestsAdminApi'
import { fetchGovProfiles } from '../api/governmentProfilesApi'
import { useGovernmentOperationalAssigneeOptions } from './useGovernmentOperationalAssigneeOptions'
import type { GovSupportProfile } from '../types/governmentProfile.types'

export const GOV_ADMIN_DOC_REQUEST_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'open', label: '미제출' },
  { value: 'partial', label: '일부 제출' },
  { value: 'completed', label: '제출 완료' },
] as const

export function govAdminDocRequestStatusLabel(status: string): string {
  return GOV_ADMIN_DOC_REQUEST_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
}

export function govAdminDocRequestStatusClass(status: string): string {
  switch (status) {
    case 'open':
      return 'claim-inbox__status claim-inbox__status--requested'
    case 'partial':
      return 'claim-inbox__status claim-inbox__status--processing'
    case 'completed':
      return 'claim-inbox__status claim-inbox__status--done'
    default:
      return 'claim-inbox__status'
  }
}

export function govAdminDocRequestItemStatusClass(status: string): string {
  if (status === '제출 완료' || status === '검토 완료' || status === '최종 완료') {
    return 'claim-inbox__status claim-inbox__status--done'
  }
  return 'claim-inbox__status claim-inbox__status--requested'
}

function profileLabel(profile: GovSupportProfile): string {
  return profile.businessName?.trim() || profile.customerName?.trim() || '사업장'
}

export function useGovernmentAdminDocumentRequestsState(token: string | null | undefined) {
  const [rows, setRows] = useState<GovAdminDocumentRequestListItem[]>([])
  const [profiles, setProfiles] = useState<GovSupportProfile[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<GovAdminDocumentRequestDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeBusy, setComposeBusy] = useState(false)
  const [composeProfileId, setComposeProfileId] = useState('')
  const [composeTitle, setComposeTitle] = useState('요청 서류')
  const [composeMessage, setComposeMessage] = useState('')
  const [composeItems, setComposeItems] = useState(['사업자등록증', '재무제표'])
  const [assigneeTarget, setAssigneeTarget] = useState('')
  const [assignBusy, setAssignBusy] = useState(false)
  const { filterOptions, assignOptions } = useGovernmentOperationalAssigneeOptions(token)

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId])
  const openCount = useMemo(() => rows.filter((row) => row.status === 'open').length, [rows])
  const partialCount = useMemo(() => rows.filter((row) => row.status === 'partial').length, [rows])
  const completedCount = useMemo(() => rows.filter((row) => row.status === 'completed').length, [rows])

  const profileOptions = useMemo(
    () => [
      { value: '', label: '사업장 선택' },
      ...profiles.map((p) => ({ value: String(p.id), label: profileLabel(p) })),
    ],
    [profiles],
  )

  const loadProfiles = useCallback(async () => {
    if (!token?.trim()) return
    try {
      const list = await fetchGovProfiles(token)
      setProfiles(list)
      if (!composeProfileId && list[0]?.id) {
        setComposeProfileId(String(list[0].id))
      }
    } catch {
      setProfiles([])
    }
  }, [composeProfileId, token])

  const loadRows = useCallback(async () => {
    if (!token?.trim()) return
    setLoading(true)
    setError('')
    try {
      const list = await fetchGovAdminDocumentRequests(token, {
        status: statusFilter || undefined,
        assignee: assigneeFilter || undefined,
      })
      setRows(list)
      setSelectedId((prev) => {
        if (prev && list.some((row) => row.id === prev)) return prev
        return list[0]?.id ?? null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청서류 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [assigneeFilter, statusFilter, token])

  const loadDetail = useCallback(async () => {
    if (!token?.trim() || !selectedId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    try {
      const data = await fetchGovAdminDocumentRequestDetail(token, selectedId)
      setDetail(data)
      setAssigneeTarget(data.assignedToUserId ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청서류 상세를 불러오지 못했습니다.')
    } finally {
      setDetailLoading(false)
    }
  }, [selectedId, token])

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const onSelectRow = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const onDownloadFile = useCallback(
    async (file: GovAdminDocumentRequestFile, itemId: string) => {
      if (!token?.trim() || !selectedId) return
      try {
        if (file.downloadUrl) {
          window.open(file.downloadUrl, '_blank', 'noopener,noreferrer')
          return
        }
        const res = await downloadGovAdminDocumentRequestFile(token, selectedId, itemId, file.id)
        window.open(res.downloadUrl, '_blank', 'noopener,noreferrer')
      } catch (e) {
        setError(e instanceof Error ? e.message : '파일을 다운로드하지 못했습니다.')
      }
    },
    [selectedId, token],
  )

  const onCreateRequest = useCallback(async (): Promise<string | null> => {
    if (!token?.trim() || !composeProfileId) {
      setError('사업장을 선택해 주세요.')
      return null
    }
    const items = composeItems.map((label) => label.trim()).filter(Boolean)
    if (items.length === 0) {
      setError('요청 서류 항목을 1개 이상 입력해 주세요.')
      return null
    }
    setComposeBusy(true)
    setError('')
    try {
      const created = await createGovAdminDocumentRequest(token, composeProfileId, {
        title: composeTitle.trim() || '요청 서류',
        message: composeMessage.trim(),
        items: items.map((label) => ({ label, docType: label })),
      })
      setNotice('요청서류를 발송했습니다.')
      setComposeOpen(false)
      setComposeMessage('')
      await loadRows()
      setSelectedId(created.id)
      return created.id
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청서류 발송에 실패했습니다.')
      return null
    } finally {
      setComposeBusy(false)
    }
  }, [composeItems, composeMessage, composeProfileId, composeTitle, loadRows, token])

  const onAssigneeSave = useCallback(async () => {
    if (!token?.trim() || !selectedId) return
    setAssignBusy(true)
    setError('')
    try {
      await patchGovAdminDocumentRequestAssignee(token, selectedId, assigneeTarget || null)
      setNotice('담당자가 저장되었습니다.')
      await loadRows()
      await loadDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : '담당자 지정에 실패했습니다.')
    } finally {
      setAssignBusy(false)
    }
  }, [assigneeTarget, loadDetail, loadRows, selectedId, token])

  return {
    rows,
    selectedId,
    selectedRow,
    detail,
    loading,
    detailLoading,
    error,
    notice,
    composeOpen,
    setComposeOpen,
    composeBusy,
    composeProfileId,
    setComposeProfileId,
    composeTitle,
    setComposeTitle,
    composeMessage,
    setComposeMessage,
    composeItems,
    setComposeItems,
    assigneeTarget,
    setAssigneeTarget,
    assignBusy,
    statusFilter,
    setStatusFilter,
    assigneeFilter,
    setAssigneeFilter,
    filterOptions,
    assignOptions,
    profileOptions,
    openCount,
    partialCount,
    completedCount,
    onSelectRow,
    onDownloadFile,
    onCreateRequest,
    onAssigneeSave,
    loadRows,
  }
}

export type GovernmentAdminDocumentRequestsViewProps = ReturnType<typeof useGovernmentAdminDocumentRequestsState>
