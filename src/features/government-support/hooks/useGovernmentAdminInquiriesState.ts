import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchGovAdminInquiries,
  fetchGovAdminInquiryDetail,
  patchGovAdminInquiry,
  patchGovAdminInquiryAssignee,
  postGovAdminInquiryMessage,
  type GovAdminInquiryListItem,
} from '../api/governmentInquiriesApi'
import type { GovCustomerInquiryDetail } from '../customer-app/api/governmentCustomerAppApi'
import { useGovernmentOperationalAssigneeOptions } from './useGovernmentOperationalAssigneeOptions'

export const GOV_ADMIN_INQUIRY_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'open', label: '대기' },
  { value: 'replied', label: '답변됨' },
  { value: 'closed', label: '완료' },
] as const

export const GOV_ADMIN_INQUIRY_DETAIL_STATUS_OPTIONS = [
  { value: 'open', label: '대기' },
  { value: 'replied', label: '답변됨' },
  { value: 'closed', label: '완료' },
]

export function govAdminInquiryStatusLabel(status: string): string {
  return GOV_ADMIN_INQUIRY_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
}

export function govAdminInquiryStatusClass(status: string): string {
  switch (status) {
    case 'open':
      return 'government-admin-inquiries-status-badge government-admin-inquiries-status-badge--open'
    case 'replied':
      return 'government-admin-inquiries-status-badge government-admin-inquiries-status-badge--replied'
    case 'closed':
      return 'government-admin-inquiries-status-badge government-admin-inquiries-status-badge--closed'
    default:
      return 'government-admin-inquiries-status-badge'
  }
}

export function govAdminInquirySenderLabel(role: string): string {
  if (role === 'government_user') return '이용자'
  if (role === 'government_staff') return '대행사 직원'
  return '담당자'
}

export function useGovernmentAdminInquiriesState(token: string | null | undefined) {
  const [rows, setRows] = useState<GovAdminInquiryListItem[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<GovCustomerInquiryDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [statusTarget, setStatusTarget] = useState('replied')
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [assigneeTarget, setAssigneeTarget] = useState('')
  const { filterOptions, assignOptions } = useGovernmentOperationalAssigneeOptions(token)

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId])

  const loadRows = useCallback(async () => {
    if (!token?.trim()) return
    setLoading(true)
    setError('')
    try {
      const list = await fetchGovAdminInquiries(token, {
        status: statusFilter || undefined,
        assignee: assigneeFilter || undefined,
      })
      setRows(list)
      setSelectedId((prev) => {
        if (prev && list.some((row) => row.id === prev)) return prev
        return list[0]?.id ?? null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '문의 목록을 불러오지 못했습니다.')
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
      const data = await fetchGovAdminInquiryDetail(token, selectedId)
      setDetail(data)
      setStatusTarget(data.status === 'open' ? 'replied' : data.status)
      setAssigneeTarget(data.assignedToUserId ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : '문의 상세를 불러오지 못했습니다.')
    } finally {
      setDetailLoading(false)
    }
  }, [selectedId, token])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const onSelectRow = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const onReply = useCallback(async () => {
    if (!token?.trim() || !selectedId || !reply.trim()) return
    setActionBusy(true)
    setError('')
    try {
      await postGovAdminInquiryMessage(token, selectedId, reply.trim())
      setReply('')
      setNotice('답변이 등록되었습니다.')
      await loadRows()
      await loadDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : '답변 전송에 실패했습니다.')
    } finally {
      setActionBusy(false)
    }
  }, [loadDetail, loadRows, reply, selectedId, token])

  const onStatusSave = useCallback(async () => {
    if (!token?.trim() || !selectedId) return
    setActionBusy(true)
    setError('')
    try {
      await patchGovAdminInquiry(token, selectedId, { status: statusTarget })
      setNotice(`상태를 "${govAdminInquiryStatusLabel(statusTarget)}"(으)로 변경했습니다.`)
      await loadRows()
      await loadDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : '상태 변경에 실패했습니다.')
    } finally {
      setActionBusy(false)
    }
  }, [loadDetail, loadRows, selectedId, statusTarget, token])

  const onAssigneeSave = useCallback(async () => {
    if (!token?.trim() || !selectedId) return
    setActionBusy(true)
    setError('')
    try {
      await patchGovAdminInquiryAssignee(token, selectedId, assigneeTarget || null)
      setNotice('담당자가 저장되었습니다.')
      await loadRows()
      await loadDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : '담당자 지정에 실패했습니다.')
    } finally {
      setActionBusy(false)
    }
  }, [assigneeTarget, loadDetail, loadRows, selectedId, token])

  return {
    rows,
    selectedId,
    selectedRow,
    detail,
    loading,
    detailLoading,
    reply,
    setReply,
    statusTarget,
    setStatusTarget,
    actionBusy,
    error,
    notice,
    assigneeTarget,
    setAssigneeTarget,
    statusFilter,
    setStatusFilter,
    assigneeFilter,
    setAssigneeFilter,
    filterOptions,
    assignOptions,
    onSelectRow,
    onReply,
    onStatusSave,
    onAssigneeSave,
    loadRows,
  }
}

export type GovernmentAdminInquiriesViewProps = ReturnType<typeof useGovernmentAdminInquiriesState>
