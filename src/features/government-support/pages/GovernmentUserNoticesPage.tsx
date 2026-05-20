import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, StatusMessage } from '../../../components/feedback'
import { FieldWrapper, FormButton, FormInput, FormSelect } from '../../../components/form'
import { useAuth } from '../../auth/AuthProvider'
import { fetchGovernmentNotices, type GovernmentNoticeRow } from '../api/governmentOperationsApi'
import {
  GOVERNMENT_NOTICE_CATEGORIES,
  formatOpsDate,
  labelForNoticeCategory,
} from '../constants/governmentOperations'
import '../government-support.css'

export default function GovernmentUserNoticesPage() {
  const { token, logout } = useAuth()
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

  return (
    <main className="page government-page government-user-notices-page">
      <header className="government-workspace__header">
        <div>
          <strong style={{ color: '#f8fafc' }}>공지사항</strong>
          <Link to="/government/workspace" className="government-admin-layout__workspace-link" style={{ marginLeft: '0.75rem' }}>
            내 사업장
          </Link>
          <Link to="/government/resources" className="government-admin-layout__workspace-link" style={{ marginLeft: '0.75rem' }}>
            자료실
          </Link>
        </div>
        <FormButton htmlType="button" variant="secondary" onClick={() => logout()}>
          로그아웃
        </FormButton>
      </header>

      <section className="government-admin-users-page__filters">
        <FieldWrapper label="검색">
          <FormInput value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="제목·내용" />
        </FieldWrapper>
        <FieldWrapper label="구분">
          <FormSelect
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[{ value: '', label: '전체' }, ...GOVERNMENT_NOTICE_CATEGORIES]}
          />
        </FieldWrapper>
      </section>

      {error ? <StatusMessage message={error} tone="error" className="m-3" /> : null}
      {loading ? <LoadingState message="불러오는 중…" /> : null}
      {!loading && rows.length === 0 ? <EmptyState message="표시할 공지가 없습니다." /> : null}

      {!loading && rows.length > 0 ? (
        <div className="government-user-ops-layout">
          <aside className="government-user-ops-list">
            {[...pinned, ...normal].map((row) => (
              <button
                key={row.id}
                type="button"
                className={`government-list-item ${selected?.id === row.id ? 'government-list-item--active' : ''}`}
                onClick={() => setSelected(row)}
              >
                <div className="government-list-item__title">
                  {row.isPinned ? <span className="government-ops-badge">중요</span> : null} {row.title}
                </div>
                <div className="government-list-item__meta">
                  {labelForNoticeCategory(row.category)} · {formatOpsDate(row.publishedAt ?? row.createdAt)}
                </div>
              </button>
            ))}
          </aside>
          {selected ? (
            <article className="government-user-ops-detail">
              <h1 className="government-page__title">{selected.title}</h1>
              <p className="government-page__muted">
                {labelForNoticeCategory(selected.category)} · {formatOpsDate(selected.publishedAt ?? selected.createdAt)}
              </p>
              <div className="government-user-ops-detail__body">{selected.content}</div>
            </article>
          ) : null}
        </div>
      ) : null}
    </main>
  )
}
