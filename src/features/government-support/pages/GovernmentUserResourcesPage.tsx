import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, StatusMessage } from '../../../components/feedback'
import { FieldWrapper, FormButton, FormInput, FormSelect } from '../../../components/form'
import { useAuth } from '../../auth/AuthProvider'
import {
  downloadGovernmentResource,
  fetchGovernmentResources,
  type GovernmentResourceRow,
} from '../api/governmentOperationsApi'
import {
  GOVERNMENT_RESOURCE_CATEGORIES,
  formatFileSize,
  formatOpsDate,
  labelForResourceCategory,
} from '../constants/governmentOperations'
import '../government-support.css'

export default function GovernmentUserResourcesPage() {
  const { token, logout } = useAuth()
  const [rows, setRows] = useState<GovernmentResourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterQ, setFilterQ] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setRows(
        await fetchGovernmentResources(token, {
          category: filterCategory || undefined,
          q: filterQ.trim() || undefined,
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '자료를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [token, filterCategory, filterQ])

  useEffect(() => {
    void load()
  }, [load])

  const handleDownload = async (row: GovernmentResourceRow) => {
    if (!token) return
    setDownloadingId(row.id)
    try {
      await downloadGovernmentResource(token, row.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '다운로드에 실패했습니다.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <main className="page government-page government-user-resources-page">
      <header className="government-workspace__header">
        <div>
          <strong style={{ color: '#f8fafc' }}>자료실/서식함</strong>
          <Link to="/government/workspace" className="government-admin-layout__workspace-link" style={{ marginLeft: '0.75rem' }}>
            내 사업장
          </Link>
          <Link to="/government/notices" className="government-admin-layout__workspace-link" style={{ marginLeft: '0.75rem' }}>
            공지사항
          </Link>
        </div>
        <FormButton htmlType="button" variant="secondary" onClick={() => logout()}>
          로그아웃
        </FormButton>
      </header>

      <section className="government-admin-users-page__filters">
        <FieldWrapper label="검색">
          <FormInput value={filterQ} onChange={(e) => setFilterQ(e.target.value)} placeholder="제목·설명" />
        </FieldWrapper>
        <FieldWrapper label="카테고리">
          <FormSelect
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[{ value: '', label: '전체' }, ...GOVERNMENT_RESOURCE_CATEGORIES]}
          />
        </FieldWrapper>
      </section>

      {error ? <StatusMessage message={error} tone="error" className="m-3" /> : null}
      {loading ? <LoadingState message="불러오는 중…" /> : null}
      {!loading && rows.length === 0 ? <EmptyState message="표시할 자료가 없습니다." /> : null}

      {!loading && rows.length > 0 ? (
        <div className="government-user-ops-cards">
          {rows.map((row) => (
            <div key={row.id} className="government-admin-users-page__card">
              <div className="government-admin-users-page__card-row">
                <span className="government-admin-users-page__card-label">제목</span>
                <span>{row.title}</span>
              </div>
              <div className="government-admin-users-page__card-row">
                <span className="government-admin-users-page__card-label">카테고리</span>
                <span>{labelForResourceCategory(row.category)}</span>
              </div>
              <div className="government-admin-users-page__card-row">
                <span className="government-admin-users-page__card-label">파일</span>
                <span>
                  {row.fileName} ({formatFileSize(row.fileSize)})
                </span>
              </div>
              <div className="government-admin-users-page__card-row">
                <span className="government-admin-users-page__card-label">등록일</span>
                <span>{formatOpsDate(row.publishedAt ?? row.createdAt)}</span>
              </div>
              {row.description ? (
                <p className="government-page__muted" style={{ marginTop: '0.5rem' }}>
                  {row.description}
                </p>
              ) : null}
              <div className="government-admin-users-page__card-actions">
                <FormButton
                  htmlType="button"
                  variant="primary"
                  disabled={downloadingId === row.id}
                  onClick={() => void handleDownload(row)}
                >
                  다운로드
                </FormButton>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </main>
  )
}
