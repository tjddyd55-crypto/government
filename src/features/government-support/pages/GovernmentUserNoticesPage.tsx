import { useCallback, useEffect, useState } from 'react'
import { EmptyState, LoadingState, StatusMessage } from '../../../components/feedback'
import { FieldWrapper, FormInput, FormSelect } from '../../../components/form'
import { governmentPageTitle } from '../../../config/governmentAppMeta'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { useAuth } from '../../auth/AuthProvider'
import { fetchGovernmentNotices, type GovernmentNoticeRow } from '../api/governmentOperationsApi'
import {
  GOVERNMENT_NOTICE_CATEGORIES,
  formatOpsDate,
  labelForNoticeCategory,
} from '../constants/governmentOperations'

export default function GovernmentUserNoticesPage() {
  useDocumentTitle(governmentPageTitle('공지사항'))
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
    <main className="page page--with-back government-user-notices-page gov-user-notices-page gov-user-page">
      <section className="government-user-notices-hero">
        <h1 className="government-user-notices-hero__title">공지사항</h1>
        <p className="government-user-notices-hero__subtitle">소속 대행사 공지를 확인할 수 있습니다.</p>
      </section>

      <section className="government-user-notices-toolbar">
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
        <div className="government-user-notices-layout">
          <section className="government-user-notices-list">
            <ul className="government-user-notices-card-list">
              {ordered.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`government-user-notices-card${
                      selected?.id === row.id ? ' government-user-notices-card--selected' : ''
                    }`}
                    onClick={() => setSelected(row)}
                  >
                    <div className="government-user-notices-card__title-row">
                      <strong>
                        {row.isPinned ? <span className="government-ops-badge">중요</span> : null} {row.title}
                      </strong>
                    </div>
                    <div className="government-user-notices-card__meta">
                      {labelForNoticeCategory(row.category)} · {formatOpsDate(row.publishedAt ?? row.createdAt)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {selected ? (
            <section className="government-user-notices-detail">
              <article className="government-user-notices-detail-card">
                <div className="government-user-notices-detail-card__title">{selected.title}</div>
                <div className="government-user-notices-detail-card__meta">
                  {labelForNoticeCategory(selected.category)} · {formatOpsDate(selected.publishedAt ?? selected.createdAt)}
                </div>
                <div className="government-user-notices-detail-card__body">{selected.content}</div>
              </article>
            </section>
          ) : null}
        </div>
      ) : null}
    </main>
  )
}
