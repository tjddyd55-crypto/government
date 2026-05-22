import { useCallback, useEffect, useMemo, useState } from 'react'
import { StatusMessage } from '../../../../components/feedback'
import { FormButton, FormInput, FormSelect, FormTextarea } from '../../../../components/form'
import useIsMobile from '../../../../hooks/useIsMobile'
import { useAuth } from '../../../auth/AuthProvider'
import {
  createGovAdminDocumentRequest,
  downloadGovAdminDocumentRequestFile,
  fetchGovAdminDocumentRequestDetail,
  fetchGovAdminDocumentRequests,
  type GovAdminDocumentRequestDetail,
  type GovAdminDocumentRequestFile,
  type GovAdminDocumentRequestListItem,
} from '../../api/governmentDocumentRequestsAdminApi'
import { fetchGovProfiles } from '../../api/governmentProfilesApi'
import type { GovSupportProfile } from '../../types/governmentProfile.types'
import '../../../claim-requests/claim-inbox.css'

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'open', label: '미제출' },
  { value: 'partial', label: '일부 제출' },
  { value: 'completed', label: '제출 완료' },
] as const

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.ceil(bytes / 1024)} KB`
}

function requestStatusLabel(status: string): string {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status
}

function requestStatusClass(status: string): string {
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

function itemStatusClass(status: string): string {
  if (status === '제출 완료' || status === '검토 완료' || status === '최종 완료') {
    return 'claim-inbox__status claim-inbox__status--done'
  }
  return 'claim-inbox__status claim-inbox__status--requested'
}

function profileLabel(profile: GovSupportProfile): string {
  const name = profile.businessName?.trim() || profile.customerName?.trim() || `고객 #${profile.id}`
  return `#${profile.id} ${name}`
}

export default function GovernmentAdminDocumentRequestsPage() {
  const { token } = useAuth()
  const isMobile = useIsMobile()
  const [rows, setRows] = useState<GovAdminDocumentRequestListItem[]>([])
  const [profiles, setProfiles] = useState<GovSupportProfile[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<GovAdminDocumentRequestDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeBusy, setComposeBusy] = useState(false)
  const [composeProfileId, setComposeProfileId] = useState('')
  const [composeTitle, setComposeTitle] = useState('요청 서류')
  const [composeMessage, setComposeMessage] = useState('')
  const [composeItems, setComposeItems] = useState(['사업자등록증', '재무제표'])

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId])
  const openCount = useMemo(() => rows.filter((row) => row.status === 'open').length, [rows])
  const partialCount = useMemo(() => rows.filter((row) => row.status === 'partial').length, [rows])
  const completedCount = useMemo(() => rows.filter((row) => row.status === 'completed').length, [rows])

  const profileOptions = useMemo(
    () => [
      { value: '', label: '고객/사업장 선택' },
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
      const list = await fetchGovAdminDocumentRequests(token, statusFilter || undefined)
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
  }, [statusFilter, token])

  const loadDetail = useCallback(async () => {
    if (!token?.trim() || !selectedId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    try {
      const data = await fetchGovAdminDocumentRequestDetail(token, selectedId)
      setDetail(data)
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

  const handleSelect = (id: string) => {
    setSelectedId(id)
    if (isMobile) setMobileDetailOpen(true)
  }

  const handleDownloadFile = async (file: GovAdminDocumentRequestFile, itemId: string) => {
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
  }

  const handleCreateRequest = async () => {
    if (!token?.trim() || !composeProfileId) {
      setError('고객/사업장을 선택해 주세요.')
      return
    }
    const items = composeItems.map((label) => label.trim()).filter(Boolean)
    if (items.length === 0) {
      setError('요청 서류 항목을 1개 이상 입력해 주세요.')
      return
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
      if (isMobile) setMobileDetailOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청서류 발송에 실패했습니다.')
    } finally {
      setComposeBusy(false)
    }
  }

  const renderDetail = () => {
    if (detailLoading) return <div className="claim-inbox__empty">상세를 불러오는 중…</div>
    if (!detail) return <div className="claim-inbox__empty">목록에서 요청서류를 선택해 주세요.</div>

    return (
      <div className="claim-inbox__detail">
        <div className="claim-inbox__detail-head">
          <div>
            <div className="claim-inbox__detail-title">
              #{detail.id} {detail.title || '요청 서류'}
            </div>
            <div className="claim-inbox__detail-meta">
              {detail.profileDisplayName || selectedRow?.profileDisplayName || '이용자'} · 발송{' '}
              {formatDateTime(detail.createdAt)}
            </div>
            <div className="claim-inbox__detail-meta">
              제출 {detail.submittedCount}/{detail.itemCount}
            </div>
          </div>
          <span className={requestStatusClass(detail.status)}>{requestStatusLabel(detail.status)}</span>
        </div>

        {detail.message ? <div className="claim-inbox__detail-memo">{detail.message}</div> : null}

        <div className="claim-inbox__detail-section">
          <h3>요청 항목</h3>
          {detail.items.length === 0 ? (
            <div className="claim-inbox__empty claim-inbox__empty--small">요청 항목이 없습니다.</div>
          ) : (
            <ul className="claim-inbox__history-list">
              {detail.items.map((item) => (
                <li key={item.id} className="claim-inbox__history-item">
                  <div className="claim-inbox__list-item-top">
                    <strong>{item.label}</strong>
                    <span className={itemStatusClass(item.status)}>{item.status}</span>
                  </div>
                  {item.files.length === 0 ? (
                    <p className="claim-inbox__file-meta">제출 파일 없음</p>
                  ) : (
                    <div className="claim-inbox__file-list">
                      {item.files.map((file) => (
                        <div key={file.id} className="claim-inbox__file-item">
                          <span className="claim-inbox__file-thumb claim-inbox__file-thumb--file">
                            {String(file.mimeType ?? '').includes('pdf') ? 'PDF' : 'FILE'}
                          </span>
                          <div className="claim-inbox__file-main">
                            <div className="claim-inbox__file-name">{file.fileName}</div>
                            <div className="claim-inbox__file-meta">{formatFileSize(file.fileSize)}</div>
                          </div>
                          <div className="claim-inbox__file-actions">
                            <button type="button" onClick={() => void handleDownloadFile(file, item.id)}>
                              다운
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
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
          <h1 className="claim-inbox__title">요청서류 관리</h1>
          <p className="claim-inbox__subtitle">이용자에게 요청서류를 발송하고 제출 여부를 확인합니다.</p>
        </div>
        <div className="claim-inbox__detail-actions">
          <FormButton htmlType="button" variant="primary" onClick={() => setComposeOpen((v) => !v)}>
            {composeOpen ? '발송 닫기' : '요청서류 발송'}
          </FormButton>
          <FormButton htmlType="button" variant="secondary" onClick={() => void loadRows()} loading={loading}>
            새로고침
          </FormButton>
        </div>
      </section>

      {composeOpen ? (
        <section className="claim-inbox__detail-section">
          <h3>요청서류 발송</h3>
          <div className="claim-inbox__status-editor-row">
            <FormSelect
              value={composeProfileId}
              onChange={(e) => setComposeProfileId(e.target.value)}
              options={profileOptions}
            />
            <FormInput
              value={composeTitle}
              onChange={(e) => setComposeTitle(e.target.value)}
              placeholder="요청 제목"
            />
          </div>
          <FormTextarea
            value={composeMessage}
            onChange={(e) => setComposeMessage(e.target.value)}
            rows={3}
            placeholder="이용자에게 전달할 안내 메시지"
            className="claim-inbox__status-memo"
          />
          {composeItems.map((item, index) => (
            <FormInput
              key={`compose-item-${index}`}
              value={item}
              onChange={(e) => {
                const next = [...composeItems]
                next[index] = e.target.value
                setComposeItems(next)
              }}
              placeholder={`서류 항목 ${index + 1}`}
            />
          ))}
          <div className="claim-inbox__detail-actions">
            <FormButton
              htmlType="button"
              variant="secondary"
              onClick={() => setComposeItems((items) => [...items, ''])}
            >
              항목 추가
            </FormButton>
            <FormButton
              htmlType="button"
              variant="primary"
              onClick={() => void handleCreateRequest()}
              loading={composeBusy}
            >
              발송
            </FormButton>
          </div>
        </section>
      ) : null}

      <section className="claim-inbox__summary-grid" aria-label="요청서류 요약">
        <div className="claim-inbox__summary-card">
          <span>전체</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="claim-inbox__summary-card claim-inbox__summary-card--requested">
          <span>미제출</span>
          <strong>{openCount}</strong>
        </div>
        <div className="claim-inbox__summary-card claim-inbox__summary-card--processing">
          <span>일부 제출</span>
          <strong>{partialCount}</strong>
        </div>
        <div className="claim-inbox__summary-card claim-inbox__summary-card--done">
          <span>제출 완료</span>
          <strong>{completedCount}</strong>
        </div>
      </section>

      <section className="claim-inbox__toolbar">
        <label className="claim-inbox__filter-label">
          상태
          <FormSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[...STATUS_OPTIONS]}
          />
        </label>
      </section>

      <div className={`claim-inbox__layout${isMobile ? ' claim-inbox__layout--mobile' : ''}`}>
        <section className="claim-inbox__list-panel">
          {loading ? <div className="claim-inbox__empty">목록을 불러오는 중…</div> : null}
          {!loading && rows.length === 0 ? <div className="claim-inbox__empty">요청서류가 없습니다.</div> : null}
          <ul className="claim-inbox__list">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={`claim-inbox__list-item${selectedId === row.id ? ' claim-inbox__list-item--active' : ''}`}
                  onClick={() => handleSelect(row.id)}
                >
                  <div className="claim-inbox__list-item-top">
                    <strong>#{row.id} {row.title || '요청 서류'}</strong>
                    <span className={requestStatusClass(row.status)}>{requestStatusLabel(row.status)}</span>
                  </div>
                  <div className="claim-inbox__list-item-meta">
                    {row.profileDisplayName || '이용자'} · {row.submittedCount}/{row.itemCount} 제출 ·{' '}
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
            <strong>요청서류 상세</strong>
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
