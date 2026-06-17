import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, StatusMessage } from '../../../../../components/feedback'
import { FormInput } from '../../../../../components/form'
import GovernmentAdminPageShell from '../../../components/GovernmentAdminPageShell'
import { GOVERNMENT_ROUTE_PATHS } from '../../../constants/governmentRouteKeys'
import type { GovernmentAdminCustomersViewProps } from '../../../hooks/useGovernmentAdminCustomersState'
import {
  resolveGovernmentCustomerBusinessType,
  resolveGovernmentCustomerCardName,
  resolveGovernmentCustomerStatusLabel,
} from '../../../lib/governmentCustomerListDisplay'

type Props = GovernmentAdminCustomersViewProps & {
  variant: 'pc' | 'mobile'
}

function ownerLabel(row: GovernmentAdminCustomersViewProps['rows'][number]): string {
  return row.ownerDisplayName?.trim() || row.ownerUsername?.trim() || '—'
}

export default function GovernmentAdminCustomersBody({
  variant,
  allowed,
  accessLoading,
  isIndustryScope,
  tenantId,
  tenantOptions,
  search,
  customerStatusFilter,
  businessTypeFilter,
  ownerUserFilter,
  rows,
  summary,
  statusOptions,
  businessTypeOptions,
  ownerOptions,
  loading,
  error,
  feedback,
  setTenantId,
  setSearch,
  setCustomerStatusFilter,
  setBusinessTypeFilter,
  setOwnerUserFilter,
  onStatusChange,
}: Props) {
  const isMobile = variant === 'mobile'

  if (accessLoading) {
    return (
      <GovernmentAdminPageShell
        title="고객 관리"
        description="대행사 소속 이용자 고객을 조회·관리합니다."
        testId="government-admin-customers-page"
      >
        <LoadingState message="권한을 확인하는 중…" />
      </GovernmentAdminPageShell>
    )
  }

  if (!allowed) {
    return (
      <GovernmentAdminPageShell
        title="고객 관리"
        description="대행사 소속 이용자 고객을 조회·관리합니다."
        testId="government-admin-customers-page"
        forbidden={{
          message: '고객 관리는 대행사 관리자·업종 관리자만 이용할 수 있습니다.',
        }}
      />
    )
  }

  const toolbar = (
    <div className={`government-admin-customers-toolbar${isMobile ? ' government-admin-customers-toolbar--mobile' : ''}`}>
      <FormInput
        className="gov-form-control government-admin-customers-toolbar__search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="이름·연락처·사업장 검색"
        aria-label="고객 검색"
      />
      {isIndustryScope ? (
        <select
          className="gov-form-control government-admin-customers-toolbar__filter"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          aria-label="대행사 필터"
        >
          {tenantOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      ) : null}
      <select
        className="gov-form-control government-admin-customers-toolbar__filter"
        value={ownerUserFilter}
        onChange={(e) => setOwnerUserFilter(e.target.value)}
        aria-label="이용자 필터"
      >
        <option value="">전체 이용자</option>
        {ownerOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        className="gov-form-control government-admin-customers-toolbar__filter"
        value={customerStatusFilter}
        onChange={(e) => setCustomerStatusFilter(e.target.value)}
        aria-label="고객상태 필터"
      >
        <option value="">전체 고객상태</option>
        <option value="none">상태 없음</option>
        {statusOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        className="gov-form-control government-admin-customers-toolbar__filter"
        value={businessTypeFilter}
        onChange={(e) => setBusinessTypeFilter(e.target.value)}
        aria-label="업종 필터"
      >
        <option value="">전체 업종</option>
        {businessTypeOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <GovernmentAdminPageShell
      title="고객 관리"
      description="대행사 소속 이용자의 사업장·고객상태를 조회합니다. 진행상황·서류상태는 상세 화면에서 확인하세요."
      managementKind="user"
      testId="government-admin-customers-page"
      toolbar={toolbar}
    >
      {summary ? (
        <div className="government-admin-customers-summary">
          <span>총 {summary.totalCount}건</span>
          {summary.byStatus.length > 0 ? (
            <span className="government-admin-customers-summary__status">
              {summary.byStatus.map((item) => `${item.statusLabel} ${item.count}`).join(' · ')}
            </span>
          ) : null}
        </div>
      ) : null}
      {feedback ? <StatusMessage message={feedback} className="m-0 mb-3" /> : null}
      {error ? <StatusMessage message={error} tone="error" className="m-0 mb-3" /> : null}
      {loading ? <LoadingState message="불러오는 중…" /> : null}
      {!loading && rows.length === 0 ? (
        <EmptyState message="조건에 맞는 고객이 없습니다." />
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="government-admin-table-wrap">
          <table className="government-admin-table government-admin-customers-table">
            <thead>
              <tr>
                <th>고객명</th>
                <th>연락처</th>
                <th>업종</th>
                <th>고객상태</th>
                <th>담당 이용자</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const name = resolveGovernmentCustomerCardName(row)
                const statusLabel = resolveGovernmentCustomerStatusLabel(row)
                const statusColor = row.customerStatusColor || '#94A3B8'
                return (
                  <tr key={row.id}>
                    <td>{name}</td>
                    <td>{row.phone?.trim() || '—'}</td>
                    <td>{resolveGovernmentCustomerBusinessType(row)}</td>
                    <td>
                      <div className="government-admin-customers-table__status">
                        <span
                          className="government-customer-card__status-dot"
                          style={{ backgroundColor: statusColor }}
                          aria-hidden
                        />
                        <select
                          className="gov-form-control government-admin-customers-table__status-select"
                          value={row.customerStatusOptionId ?? ''}
                          onChange={(e) => void onStatusChange(row.id, e.target.value || null)}
                          aria-label={`${name} 고객상태`}
                        >
                          <option value="">상태 없음 ({statusLabel})</option>
                          {statusOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      {row.ownerUserId ? (
                        <Link
                          to={`${GOVERNMENT_ROUTE_PATHS.adminProgramUsers}/${encodeURIComponent(row.ownerUserId)}`}
                          className="dark-link"
                        >
                          {ownerLabel(row)}
                        </Link>
                      ) : (
                        ownerLabel(row)
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </GovernmentAdminPageShell>
  )
}
