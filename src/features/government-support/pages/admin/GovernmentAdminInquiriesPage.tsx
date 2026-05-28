import { useCallback, useEffect, useMemo, useState } from 'react'
import { StatusMessage } from '../../../../components/feedback'
import { FormButton, FieldWrapper, FormSelect, FormTextarea } from '../../../../components/form'
import useIsMobile from '../../../../hooks/useIsMobile'
import { useAuth } from '../../../auth/AuthProvider'
import {
  fetchGovAdminInquiries,
  fetchGovAdminInquiryDetail,
  patchGovAdminInquiry,
  patchGovAdminInquiryAssignee,
  postGovAdminInquiryMessage,
  type GovAdminInquiryListItem,
} from '../../api/governmentInquiriesApi'
import type { GovCustomerInquiryDetail } from '../../customer-app/api/governmentCustomerAppApi'
import {
  formatAssigneeLabel,
  useGovernmentOperationalAssigneeOptions,
} from '../../hooks/useGovernmentOperationalAssigneeOptions'
import '../../../claim-requests/claim-inbox.css'

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'open', label: '대기' },
  { value: 'replied', label: '답변됨' },
  { value: 'closed', label: '완료' },
] as const

const DETAIL_STATUS_OPTIONS = [
  { value: 'open', label: '대기' },
  { value: 'replied', label: '답변됨' },
  { value: 'closed', label: '완료' },
]

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
}

function statusClass(status: string): string {
  switch (status) {
    case 'open':
      return 'claim-inbox__status claim-inbox__status--requested'
    case 'replied':
      return 'claim-inbox__status claim-inbox__status--processing'
    case 'closed':
      return 'claim-inbox__status claim-inbox__status--done'
    default:
      return 'claim-inbox__status'
  }
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.ceil(bytes / 1024)} KB`
}

function senderLabel(role: string): string {
  if (role === 'government_user') return '이용자'
  if (role === 'government_staff') return '대행사 직원'
  return '담당자'
}

export default function GovernmentAdminInquiriesPage() {
  const { token } = useAuth()
  const isMobile = useIsMobile()
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
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const { filterOptions, assignOptions } = useGovernmentOperationalAssigneeOptions(token)
  const [assigneeTarget, setAssigneeTarget] = useState('')

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

  const handleSelect = (id: string) => {
    setSelectedId(id)
    if (isMobile) setMobileDetailOpen(true)
  }

  const handleReply = async () => {
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
  }

  const handleStatusSave = async () => {
    if (!token?.trim() || !selectedId) return
    setActionBusy(true)
    setError('')
    try {
      await patchGovAdminInquiry(token, selectedId, { status: statusTarget })
      setNotice(`상태를 "${statusLabel(statusTarget)}"(으)로 변경했습니다.`)
      await loadRows()
      await loadDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : '상태 변경에 실패했습니다.')
    } finally {
      setActionBusy(false)
    }
  }

  const handleAssigneeSave = async () => {
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
  }

  const renderDetail = () => {
    if (detailLoading) return <div className="claim-inbox__empty">상세를 불러오는 중…</div>
    if (!detail) return <div className="claim-inbox__empty">목록에서 문의를 선택해 주세요.</div>

    return (
      <div className="claim-inbox__detail">
        <div className="claim-inbox__detail-head">
          <div>
            <div className="claim-inbox__detail-title">
              #{detail.id} {(selectedRow as GovAdminInquiryListItem | null)?.ownerDisplayName || detail.title}
            </div>
            <div className="claim-inbox__detail-meta">작성 {formatDateTime(detail.createdAt)}</div>
          </div>
          <span className={statusClass(detail.status)}>{statusLabel(detail.status)}</span>
        </div>
        <div className="claim-inbox__detail-meta">
          담당: {formatAssigneeLabel(detail.assignedToUserId, selectedRow?.assignedToDisplayName)}
        </div>
        {detail.content ? <div className="claim-inbox__detail-memo">{detail.content}</div> : null}

        <div className="claim-inbox__detail-section">
          <h3>대화</h3>
          {detail.messages.length === 0 ? (
            <div className="claim-inbox__empty claim-inbox__empty--small">메시지가 없습니다.</div>
          ) : (
            <ul className="claim-inbox__history-list">
              {detail.messages.map((msg) => (
                <li key={msg.id} className="claim-inbox__history-item">
                  <strong>
                    {senderLabel(msg.senderRole)}
                    {msg.senderUsername ? ` · ${msg.senderUsername}` : ''}
                  </strong>
                  <span>{formatDateTime(msg.createdAt)}</span>
                  <p>{msg.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {detail.files.length > 0 ? (
          <div className="claim-inbox__detail-section">
            <h3>첨부 파일</h3>
            <div className="claim-inbox__file-list">
              {detail.files.map((file) => {
                const downloadUrl = (file as { downloadUrl?: string }).downloadUrl
                return (
                  <div key={file.id} className="claim-inbox__file-item">
                    <span className="claim-inbox__file-thumb claim-inbox__file-thumb--file">
                      {String(file.mimeType ?? '').includes('pdf') ? 'PDF' : 'FILE'}
                    </span>
                    <div className="claim-inbox__file-main">
                      <div className="claim-inbox__file-name">{file.fileName}</div>
                      <div className="claim-inbox__file-meta">{formatFileSize(file.fileSize)}</div>
                    </div>
                    <div className="claim-inbox__file-actions">
                      {downloadUrl ? (
                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                          다운
                        </a>
                      ) : (
                        <span className="claim-inbox__file-meta">—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="claim-inbox__detail-section claim-inbox__status-editor">
          <h3>답변 작성</h3>
          <FieldWrapper label="답변 내용" className="admin-modal-field">
            <FormTextarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              placeholder="이용자에게 전달할 답변을 입력해 주세요."
              className="claim-inbox__status-memo"
            />
          </FieldWrapper>
          <FormButton htmlType="button" variant="primary" onClick={() => void handleReply()} loading={actionBusy}>
            답변 등록
          </FormButton>
        </div>

        <div className="claim-inbox__detail-section claim-inbox__status-editor">
          <h3>담당자</h3>
          <div className="claim-inbox__status-editor-row">
            <FieldWrapper label="담당 직원" className="admin-modal-field">
              <FormSelect
                value={assigneeTarget}
                onChange={(e) => setAssigneeTarget(e.target.value)}
                options={assignOptions}
                aria-label="담당자"
              />
            </FieldWrapper>
            <FormButton
              htmlType="button"
              variant="secondary"
              onClick={() => void handleAssigneeSave()}
              loading={actionBusy}
            >
              담당 저장
            </FormButton>
          </div>
        </div>

        <div className="claim-inbox__detail-section claim-inbox__status-editor">
          <h3>상태 변경</h3>
          <div className="claim-inbox__status-editor-row">
            <FieldWrapper label="상태" className="admin-modal-field">
              <FormSelect
                value={statusTarget}
                onChange={(e) => setStatusTarget(e.target.value)}
                options={DETAIL_STATUS_OPTIONS}
                aria-label="문의 상태"
              />
            </FieldWrapper>
            <FormButton htmlType="button" variant="secondary" onClick={() => void handleStatusSave()} loading={actionBusy}>
              상태 저장
            </FormButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="claim-inbox content-wrapper">
      <StatusMessage message={error} tone="error" />
      <StatusMessage message={notice} tone="success" />

      <section className="claim-inbox__hero">
        <div>
          <h1 className="claim-inbox__title">문의 관리</h1>
          <p className="claim-inbox__subtitle">프로그램 이용자가 남긴 문의를 확인하고 답변합니다.</p>
        </div>
        <FormButton htmlType="button" variant="secondary" onClick={() => void loadRows()} loading={loading}>
          새로고침
        </FormButton>
      </section>

      <section className="claim-inbox__toolbar">
        <label className="claim-inbox__filter-label">
          상태
          <FormSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[...STATUS_OPTIONS]}
            aria-label="문의 상태"
          />
        </label>
        <label className="claim-inbox__filter-label">
          담당자
          <FormSelect
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            options={filterOptions}
            aria-label="담당자 필터"
          />
        </label>
      </section>

      <div className={`claim-inbox__layout${isMobile ? ' claim-inbox__layout--mobile' : ''}`}>
        <section className="claim-inbox__list-panel">
          {rows.length === 0 ? <div className="claim-inbox__empty">문의가 없습니다.</div> : null}
          <ul className="claim-inbox__list">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={`claim-inbox__list-item${selectedId === row.id ? ' claim-inbox__list-item--active' : ''}`}
                  onClick={() => handleSelect(row.id)}
                >
                  <div className="claim-inbox__list-item-top">
                    <strong>#{row.id} {row.title || '문의'}</strong>
                    <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                  </div>
                  <div className="claim-inbox__list-item-meta">
                    {(row as GovAdminInquiryListItem).ownerDisplayName || '이용자'} ·{' '}
                    {formatAssigneeLabel(row.assignedToUserId, row.assignedToDisplayName)} · 메시지 {row.messageCount} ·{' '}
                    {formatDateTime(row.createdAt)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {!isMobile ? <section className="claim-inbox__detail-panel">{renderDetail()}</section> : null}
      </div>

      {isMobile && mobileDetailOpen ? (
        <div className="claim-inbox__mobile-modal" role="dialog" aria-modal="true">
          <div className="claim-inbox__mobile-modal-head">
            <strong>문의 상세</strong>
            <button type="button" onClick={() => setMobileDetailOpen(false)}>
              닫기
            </button>
          </div>
          <div className="claim-inbox__mobile-modal-body">{renderDetail()}</div>
        </div>
      ) : null}
    </main>
  )
}
