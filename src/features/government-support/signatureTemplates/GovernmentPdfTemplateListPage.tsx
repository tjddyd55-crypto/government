import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, StatusMessage } from '../../../components/feedback'
import { FieldWrapper, FormButton, FormInput, FormSelect } from '../../../components/form'
import { useAuth } from '../../auth/AuthProvider'
import GovernmentAdminPageShell from '../components/GovernmentAdminPageShell'
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'
import { mapGovernmentSignatureApiError } from '../signatures/governmentSignatureUserDisplay'
import {
  listGovSignaturePdfTemplates,
  type GovSignaturePdfTemplateListItem,
} from './governmentSignaturePdfTemplateClient'
import '../government-support.css'

function formatGovDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ko-KR')
}

function scopeLabel(row: GovSignaturePdfTemplateListItem): string {
  if (row.govTenantId == null) {
    return '전체 대행사'
  }
  return row.tenantName?.trim() ? row.tenantName.trim() : `대행사 #${row.govTenantId}`
}

function statusLabel(row: GovSignaturePdfTemplateListItem): string {
  return row.isActive ? '활성' : '비활성'
}

export default function GovernmentPdfTemplateListPage() {
  const { token } = useAuth()
  const [rows, setRows] = useState<GovSignaturePdfTemplateListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'agency'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const load = useCallback(async () => {
    if (!token?.trim()) {
      return
    }
    setLoadError('')
    setLoading(true)
    try {
      const res = await listGovSignaturePdfTemplates(token)
      setRows(res.templates)
    } catch (e) {
      setLoadError(mapGovernmentSignatureApiError(e, 'PDF 목록을 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (scopeFilter === 'global' && row.govTenantId != null) {
        return false
      }
      if (scopeFilter === 'agency' && row.govTenantId == null) {
        return false
      }
      if (statusFilter === 'active' && !row.isActive) {
        return false
      }
      if (statusFilter === 'inactive' && row.isActive) {
        return false
      }
      if (!q) {
        return true
      }
      const hay = `${row.title} ${row.description ?? ''} ${row.code}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, scopeFilter, search, statusFilter])

  const renderRow = (row: GovSignaturePdfTemplateListItem) => (
    <tr key={row.id}>
      <td>
        <strong>{row.title}</strong>
        {row.description ? <div className="government-admin-page__muted">{row.description}</div> : null}
      </td>
      <td>{scopeLabel(row)}</td>
      <td>{row.linkedTemplateCount ?? 0}</td>
      <td>{row.fieldCount ?? 0}</td>
      <td>
        <span className={`admin-entity-status-badge admin-entity-status-badge--${row.isActive ? 'active' : 'inactive'}`}>
          {statusLabel(row)}
        </span>
      </td>
      <td>{formatGovDate(row.createdAt)}</td>
      <td>{formatGovDate(row.updatedAt)}</td>
      <td className="admin-table-cell--actions">
        <div className="admin-table-actions">
          <Link
            to={`${GOVERNMENT_ROUTE_PATHS.adminSignaturePdfList}/${row.id}`}
            className="gov-btn gov-btn--primary gov-btn--sm"
          >
            좌표 편집
          </Link>
          <Link
            to={`${GOVERNMENT_ROUTE_PATHS.adminSignatureTemplates}?pdfTemplateId=${row.id}`}
            className="gov-btn gov-btn--secondary gov-btn--sm"
          >
            템플릿 만들기
          </Link>
        </div>
      </td>
    </tr>
  )

  const renderCard = (row: GovSignaturePdfTemplateListItem) => (
    <article key={row.id} className="admin-ga-card">
      <div className="admin-ga-card__row">
        <span className="admin-ga-card__label">PDF 문서명</span>
        <span className="admin-ga-card__value">{row.title}</span>
      </div>
      <div className="admin-ga-card__row">
        <span className="admin-ga-card__label">사용 범위</span>
        <span className="admin-ga-card__value">{scopeLabel(row)}</span>
      </div>
      <div className="admin-ga-card__row">
        <span className="admin-ga-card__label">연결 템플릿 / 좌표 필드</span>
        <span className="admin-ga-card__value">
          {row.linkedTemplateCount ?? 0}개 / {row.fieldCount ?? 0}개
        </span>
      </div>
      <div className="admin-ga-card__row">
        <span className="admin-ga-card__label">상태</span>
        <span className="admin-ga-card__value">{statusLabel(row)}</span>
      </div>
      <div className="admin-ga-card__row">
        <span className="admin-ga-card__label">등록일</span>
        <span className="admin-ga-card__value">{formatGovDate(row.createdAt)}</span>
      </div>
      <div className="admin-ga-card__actions">
        <Link
          to={`${GOVERNMENT_ROUTE_PATHS.adminSignaturePdfList}/${row.id}`}
          className="gov-btn gov-btn--primary gov-btn--sm"
        >
          좌표 편집
        </Link>
        <Link
          to={`${GOVERNMENT_ROUTE_PATHS.adminSignatureTemplates}?pdfTemplateId=${row.id}`}
          className="gov-btn gov-btn--secondary gov-btn--sm"
        >
          템플릿 만들기
        </Link>
      </div>
    </article>
  )

  return (
    <GovernmentAdminPageShell
      title="PDF 좌표 설정"
      description="업로드한 PDF 문서의 입력·서명 좌표를 관리합니다."
      toolbar={
        <div className="government-admin-toolbar">
          <div className="government-admin-toolbar__filters">
            <FieldWrapper label="검색" className="government-admin-toolbar__field">
              <FormInput
                className="gov-form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="문서명 검색"
                disabled={loading}
              />
            </FieldWrapper>
            <FieldWrapper label="범위" className="government-admin-toolbar__field">
              <FormSelect
                className="gov-form-control"
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value as 'all' | 'global' | 'agency')}
                disabled={loading}
              >
                <option value="all">전체</option>
                <option value="global">전체 대행사</option>
                <option value="agency">특정 대행사</option>
              </FormSelect>
            </FieldWrapper>
            <FieldWrapper label="상태" className="government-admin-toolbar__field">
              <FormSelect
                className="gov-form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                disabled={loading}
              >
                <option value="all">전체</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </FormSelect>
            </FieldWrapper>
          </div>
          <div className="government-admin-toolbar__actions">
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary"
              onClick={() => void load()}
              disabled={loading}
            >
              새로고침
            </FormButton>
            <Link to={GOVERNMENT_ROUTE_PATHS.adminSignaturePdfNew} className="gov-btn gov-btn--primary">
              새 PDF 업로드
            </Link>
          </div>
        </div>
      }
    >
      {loadError ? <StatusMessage message={loadError} tone="error" className="m-0 mb-3" /> : null}
      {loading ? <LoadingState message="불러오는 중…" className="gov-status-loading" /> : null}

      {!loading ? (
        <>
          <div className="government-admin-table-wrap table-container table-container--desktop">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>PDF 문서명</th>
                  <th>사용 범위</th>
                  <th>연결 템플릿</th>
                  <th>좌표 필드</th>
                  <th>상태</th>
                  <th>등록일</th>
                  <th>수정일</th>
                  <th className="admin-table-cell--actions">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="admin-data-table__empty-cell">
                      등록된 PDF 문서가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => renderRow(row))
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-responsive-card-list">
            {filteredRows.length === 0 ? (
              <EmptyState message="등록된 PDF 문서가 없습니다." className="gov-status-empty m-0" />
            ) : (
              filteredRows.map((row) => renderCard(row))
            )}
          </div>
        </>
      ) : null}
    </GovernmentAdminPageShell>
  )
}
