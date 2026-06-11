import { useCallback, useEffect, useState } from 'react'
import { EmptyState, LoadingState, StatusMessage } from '../../../components/feedback'
import { FieldWrapper, FormInput, FormSelect } from '../../../components/form'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { useAuth } from '../../auth/AuthProvider'
import { fetchGovernmentNotices, type GovernmentNoticeRow } from '../api/governmentOperationsApi'
import {
  GOVERNMENT_NOTICE_CATEGORIES,
  formatOpsDate,
  labelForNoticeCategory,
} from '../constants/governmentOperations'
import '../../claim-requests/claim-inbox.css'

export default function GovernmentUserNoticesPage() {
  useDocumentTitle('정부지원 CRM · 공지사항')
  const { token } = useAuth()
  const [rows, setRows] = useState<GovernmentNoticeRow[]>([])
  const [selected, setSelected] = useState<GovernmentNoticeRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterQ, setFilterQ] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const list = await fetchGovernmentNotices(token, {
        category: filterCategory || undefined,
        q: filterQ.trim() || undefined,
      })
      setRows(list)
      setSelected((prev) => (prev ? list.find((r) => r.id === prev.id) ?? list[0] ?? null : list[0] ?? null))
    } catch (e) {
      setError(e instanceof Error ? e.message : '공지를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [token, filterCategory, filterQ])

  useEffect(() => {
    void load()
  }, [load])

  const pinned = rows.filter((r) => r.isPinned)
  const normal = rows.filter((r) => !r.isPinned)
  const ordered = [...pinned, ...normal]

  return (
    <main className="page page--with-back claim-inbox content-wrapper government-user-notices-page gov-user-page gov-user-notices-page">
      <section className="claim-inbox__hero">
        <div>
          <h1 className="claim-inbox__title">공지사항</h1>
          <p className="claim-inbox__subtitle">소속 대행사 공지를 확인할 수 있습니다.</p>
        </div>
      </section>

      <section className="claim-inbox__toolbar">
        <FieldWrapper label="검색">
          <FormInput
            className="gov-form-control"
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            placeholder="제목·내용"
          />
        </FieldWrapper>
        <FieldWrapper label="구분">
          <FormSelect
            className="gov-form-control"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[{ value: '', label: '전체' }, ...GOVERNMENT_NOTICE_CATEGORIES]}
          />
        </FieldWrapper>
      </section>

      {error ? <StatusMessage message={error} tone="error" className="m-0 mb-3" /> : null}
      {loading ? <LoadingState message="불러오는 중…" /> : null}
      {!loading && rows.length === 0 ? <EmptyState message="표시할 공지가 없습니다." /> : null}

      {!loading && rows.length > 0 ? (
        <div className="claim-inbox__layout">
          <section className="claim-inbox__list-panel">
            <ul className="claim-inbox__list">
              {ordered.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`claim-inbox__list-item${selected?.id === row.id ? ' claim-inbox__list-item--active' : ''}`}
                    onClick={() => setSelected(row)}
                  >
                    <div className="claim-inbox__list-item-top">
                      <strong>
                        {row.isPinned ? <span className="government-ops-badge">중요</span> : null} {row.title}
                      </strong>
                    </div>
                    <div className="claim-inbox__list-item-meta">
                      {labelForNoticeCategory(row.category)} · {formatOpsDate(row.publishedAt ?? row.createdAt)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {selected ? (
            <section className="claim-inbox__detail-panel">
              <div className="claim-inbox__detail">
                <div className="claim-inbox__detail-head">
                  <div>
                    <div className="claim-inbox__detail-title">{selected.title}</div>
                    <div className="claim-inbox__detail-meta">
                      {labelForNoticeCategory(selected.category)} · {formatOpsDate(selected.publishedAt ?? selected.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="claim-inbox__detail-memo">{selected.content}</div>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </main>
  )
}
