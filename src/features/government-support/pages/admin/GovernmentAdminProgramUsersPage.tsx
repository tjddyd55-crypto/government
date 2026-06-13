import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState } from '../../../../components/feedback'
import { FieldWrapper, FormButton, FormInput, FormSelect } from '../../../../components/form'
import { useAuth } from '../../../auth/AuthProvider'
import GovernmentAdminPageShell from '../../components/GovernmentAdminPageShell'
import GovernmentAdminSearchField from '../../components/GovernmentAdminSearchField'
import { useGovernmentAdminTextSearch } from '../../hooks/useGovernmentAdminTextSearch'
import { mapGovernmentAdminApiError } from '../../lib/mapGovernmentAdminApiError'
import { fetchGovernmentAdminUsers } from '../../api/governmentAdminUsersApi'
import { fetchGovAgencies } from '../../api/governmentProfilesApi'
import { GOVERNMENT_ROLE_LABELS } from '../../constants/governmentRoles'
import type { GovAgencyRow } from '../../types/governmentProfile.types'
import type {
  GovernmentAdminUserRow,
  GovernmentUserEntityStatus,
} from '../../types/governmentAdminUser.types'
import '../../government-support.css'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: '상태 전체' },
  { value: 'active', label: '정상' },
  { value: 'blocked', label: '접근금지' },
  { value: 'inactive', label: '비활성' },
]

const STATUS_LABEL: Record<GovernmentUserEntityStatus, string> = {
  active: '정상',
  blocked: '접근금지',
  inactive: '비활성',
}

const EMPTY_MESSAGE = '표시할 이용자가 없습니다.'

function normalizeUserStatus(s: string | undefined): GovernmentUserEntityStatus {
  const v = String(s ?? '').toLowerCase()
  if (v === 'blocked' || v === 'inactive') {
    return v
  }
  return 'active'
}

function UserStatusBadge({ status }: { status: GovernmentUserEntityStatus }) {
  const st = normalizeUserStatus(status)
  return (
    <span className={`admin-entity-status-badge admin-entity-status-badge--${st}`}>
      {STATUS_LABEL[st]}
    </span>
  )
}

function formatCreatedAt(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10)
  }
  return d.toISOString().slice(0, 10)
}

function tenantLabel(row: GovernmentAdminUserRow): string {
  if (row.tenantName) return row.tenantName
  if (row.agencyCode) return row.agencyCode
  return '—'
}

function roleLabel(row: GovernmentAdminUserRow): string {
  return GOVERNMENT_ROLE_LABELS[row.role] ?? row.role
}

export default function GovernmentAdminProgramUsersPage() {
  const { token } = useAuth()
  const [agencies, setAgencies] = useState<GovAgencyRow[]>([])
  const [rows, setRows] = useState<GovernmentAdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filterTenant, setFilterTenant] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const textSearch = useGovernmentAdminTextSearch()

  const tenantFilterOptions = useMemo(
    () => [
      { value: '', label: '전체' },
      ...agencies.map((a) => ({ value: a.id, label: a.name })),
    ],
    [agencies],
  )

  const loadAgencies = useCallback(async () => {
    if (!token) return
    try {
      const list = await fetchGovAgencies(token)
      setAgencies(list)
    } catch {
      setAgencies([])
    }
  }, [token])

  const loadUsers = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setLoadError('')
    try {
      const list = await fetchGovernmentAdminUsers(token, {
        role: 'government_user',
        tenantId: filterTenant || undefined,
        status: filterStatus || undefined,
        q: textSearch.query.trim() || undefined,
      })
      setRows(list)
    } catch (e) {
      setLoadError(mapGovernmentAdminApiError(e, '이용자 목록을 불러오지 못했습니다.'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token, filterTenant, filterStatus, textSearch.query])

  useEffect(() => {
    void loadAgencies()
  }, [loadAgencies])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const resetFilters = () => {
    setFilterTenant('')
    setFilterStatus('')
    textSearch.reset()
  }

  return (
    <GovernmentAdminPageShell
      managementKind="user"
      title="이용자 관리"
      description="기관 코드로 가입한 프로그램 이용자 계정·상태만 확인합니다. 사업장·신청 데이터는 이용자 본인 워크스페이스에서 관리합니다."
      testId="government-admin-page"
      toolbar={
        <div className="government-admin-toolbar">
          <div className="government-admin-toolbar__filters">
            <GovernmentAdminSearchField
              draft={textSearch.draft}
              onDraftChange={textSearch.setDraft}
              onApply={textSearch.apply}
              onReset={textSearch.reset}
              onKeyDown={textSearch.onKeyDown}
              placeholder="아이디·이름"
              disabled={loading}
              testId="government-admin-user-search"
            />
            <FieldWrapper label="대행사 선택" className="government-admin-toolbar__field">
              <FormSelect
                className="gov-form-control"
                value={filterTenant}
                onChange={(e) => setFilterTenant(e.target.value)}
                options={tenantFilterOptions}
                disabled={loading}
                aria-busy={loading}
                aria-label="대행사 선택"
              />
            </FieldWrapper>
            <FieldWrapper label="상태" className="government-admin-toolbar__field">
              <FormSelect
                className="gov-form-control"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={STATUS_FILTER_OPTIONS}
                disabled={loading}
                aria-label="상태"
              />
            </FieldWrapper>
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary"
              onClick={resetFilters}
              disabled={loading}
            >
              초기화
            </FormButton>
          </div>
        </div>
      }
    >
      {loadError ? (
        <div className="admin-user-management__error-card gov-status-error-card" role="alert">
          {loadError}
        </div>
      ) : null}
      {loading ? <LoadingState message="불러오는 중…" className="gov-status-loading" /> : null}
      {!loading ? <ProgramUsersTable rows={rows} isLoading={loading} /> : null}
    </GovernmentAdminPageShell>
  )
}

function ProgramUsersTable(props: { rows: GovernmentAdminUserRow[]; isLoading: boolean }) {
  return (
    <>
      <div className="table-container table-container--desktop">
        <table className="admin-user-table admin-data-table">
          <thead>
            <tr>
              <th scope="col">대행사</th>
              <th scope="col">이름</th>
              <th scope="col">아이디</th>
              <th scope="col">역할</th>
              <th scope="col">상태</th>
              <th scope="col">가입일</th>
              <th scope="col" className="admin-table-cell--actions">
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {props.rows.length === 0 && !props.isLoading ? (
              <tr>
                <td colSpan={7} className="admin-data-table__empty-cell">
                  {EMPTY_MESSAGE}
                </td>
              </tr>
            ) : (
              props.rows.map((row) => (
                <tr key={row.id}>
                  <td>{tenantLabel(row)}</td>
                  <td>{row.displayName || '—'}</td>
                  <td>{row.username}</td>
                  <td>{roleLabel(row)}</td>
                  <td>
                    <UserStatusBadge status={row.status} />
                  </td>
                  <td>{formatCreatedAt(row.createdAt)}</td>
                  <td className="admin-table-cell--actions">
                    <div className="admin-table-actions">
                      <Link
                        to={`/government/admin/program-users/${row.id}`}
                        className="gov-btn gov-btn--secondary gov-btn--sm"
                      >
                        상세
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-responsive-card-list">
        {props.rows.length === 0 && !props.isLoading ? (
          <EmptyState message={EMPTY_MESSAGE} className="m-0 px-1 py-2 text-[var(--text-sub)]" />
        ) : (
          props.rows.map((row) => <ProgramUserMobileCard key={row.id} row={row} />)
        )}
      </div>
    </>
  )
}

function ProgramUserMobileCard({ row }: { row: GovernmentAdminUserRow }) {
  return (
    <article className="admin-user-card">
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">대행사</span>
        <span className="admin-user-card__value">{tenantLabel(row)}</span>
      </div>
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">이름</span>
        <span className="admin-user-card__value">{row.displayName || '—'}</span>
      </div>
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">아이디</span>
        <span className="admin-user-card__value">{row.username}</span>
      </div>
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">역할</span>
        <span className="admin-user-card__value">{roleLabel(row)}</span>
      </div>
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">상태</span>
        <span className="admin-user-card__value">
          <UserStatusBadge status={row.status} />
        </span>
      </div>
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">가입일</span>
        <span className="admin-user-card__value">{formatCreatedAt(row.createdAt)}</span>
      </div>
      <div className="admin-user-card__actions">
        <Link
          to={`/government/admin/program-users/${row.id}`}
          className="gov-btn gov-btn--secondary gov-btn--sm"
        >
          상세
        </Link>
      </div>
    </article>
  )
}
