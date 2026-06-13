import { useCallback, useEffect, useState } from 'react'
import { EmptyState, LoadingState, StatusMessage } from '../../../components/feedback'
import { FieldWrapper, FormButton, FormInput, FormSelect } from '../../../components/form'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
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
import '../../claim-requests/claim-inbox.css'

export default function GovernmentUserResourcesPage() {
  useDocumentTitle('정부지원 CRM · 자료실')
  const { token } = useAuth()
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
    <main className="page page--with-back claim-inbox content-wrapper government-user-resources-page gov-user-page gov-user-resources-page">
      <section className="claim-inbox__hero">
        <div>
          <h1 className="claim-inbox__title">자료실/서식함</h1>
          <p className="claim-inbox__subtitle">소속 대행사 자료를 다운로드할 수 있습니다.</p>
        </div>
      </section>

      <section className="claim-inbox__toolbar">
        <FieldWrapper label="검색">
          <FormInput
            className="gov-form-control"
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            placeholder="제목·설명"
          />
        </FieldWrapper>
        <FieldWrapper label="카테고리">
          <FormSelect
            className="gov-form-control"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[{ value: '', label: '전체' }, ...GOVERNMENT_RESOURCE_CATEGORIES]}
          />
        </FieldWrapper>
      </section>

      {error ? <StatusMessage message={error} tone="error" className="m-0 mb-3" /> : null}
      {loading ? <LoadingState message="불러오는 중…" /> : null}
      {!loading && rows.length === 0 ? <EmptyState message="표시할 자료가 없습니다." /> : null}

      {!loading && rows.length > 0 ? (
        <section className="claim-inbox__list-panel">
          <ul className="claim-inbox__list">
            {rows.map((row) => (
              <li key={row.id}>
                <article className="gov-user-resource-card claim-inbox__list-item">
                  <div className="claim-inbox__list-item-top">
                    <strong>{row.title}</strong>
                    <span className="claim-inbox__status">{labelForResourceCategory(row.category)}</span>
                  </div>
                  <div className="claim-inbox__list-item-meta">
                    {row.fileName} ({formatFileSize(row.fileSize)}) · {formatOpsDate(row.publishedAt ?? row.createdAt)}
                  </div>
                  {row.description ? <p className="claim-inbox__detail-memo">{row.description}</p> : null}
                  <div className="claim-inbox__detail-actions">
                    <FormButton
                      htmlType="button"
                      variant="primary"
                      className="gov-btn gov-btn--primary gov-btn--sm"
                      disabled={downloadingId === row.id}
                      onClick={() => void handleDownload(row)}
                    >
                      다운로드
                    </FormButton>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
