import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, StatusMessage } from '../../../../../components/feedback'
import { FormButton, FormInput, FormSelect } from '../../../../../components/form'
import { getGovernmentProgressStatusLabel } from '../../../constants/governmentProgressStatus'
import { governmentMyApplicationTabPath } from '../../../constants/governmentRouteKeys'
import {
  displayGovField,
  formatGovProfileDateTime,
  maskBusinessNumber,
} from '../../../lib/governmentProfileDisplay'
import {
  getGovernmentProfileAddress,
  GOVERNMENT_REGION_SORT_OPTIONS,
} from '../../../utils/governmentAddressRegionUtils'
import type { GovernmentRegionsViewProps } from '../../../hooks/useGovernmentRegionsState'

function profileDisplayName(profile: GovernmentRegionsViewProps['profiles'][number]) {
  return profile.businessName?.trim() || profile.customerName?.trim() || '—'
}

export default function GovernmentRegionsPageBody(props: GovernmentRegionsViewProps) {
  const {
    loading,
    error,
    groups,
    summary,
    filters,
    selectedGroupKey,
    filterOptions,
    sigunguOptions,
    eupmyeondongOptions,
    visibleProfiles,
    onSetSearchQuery,
    onSetSido,
    onSetSigungu,
    onSetEupmyeondong,
    onSetProgressStatus,
    onSetDocStatus,
    onSetSort,
    onSelectGroup,
    onResetFilters,
  } = props

  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)

  const hasAdvancedFilters =
    Boolean(filters.eupmyeondong) || Boolean(filters.progressStatus) || Boolean(filters.docStatus)

  return (
    <main
      className="page page--with-back government-region-page gov-user-page"
      data-testid="government-region-page"
    >
      <header className="government-region-page-header">
        <div className="government-region-page-heading">
          <h1 className="government-region-page-heading__title">지역별 보기</h1>
          <p className="government-region-page-heading__description">
            등록된 사업장을 주소지 기준으로 모아볼 수 있습니다.
          </p>
        </div>
        <div
          className="government-region-summary-chips"
          data-testid="government-region-summary-grid"
          aria-label="사업장 현황"
        >
          <span className="government-region-summary-chip">
            전체 <strong>{summary.total}</strong>
          </span>
          <span className="government-region-summary-chip">
            주소 있음 <strong>{summary.withAddress}</strong>
          </span>
          <span className="government-region-summary-chip">
            주소 없음 <strong>{summary.withoutAddress}</strong>
          </span>
          <span className="government-region-summary-chip">
            선택 지역 <strong>{summary.selectedRegionCount}</strong>
          </span>
        </div>
      </header>

      <section
        className={`government-region-compact-toolbar${
          advancedFiltersOpen ? ' government-region-compact-toolbar--advanced-open' : ''
        }`}
        data-testid="government-region-filter-card"
      >
        <div className="government-region-compact-toolbar__main">
          <FormInput
            className="gov-form-control government-region-search-input"
            value={filters.searchQuery}
            onChange={(event) => onSetSearchQuery(event.target.value)}
            placeholder="사업장명 · 대표자 · 주소 · 사업자등록번호"
            aria-label="검색"
          />
          <FormSelect
            className="gov-form-control government-region-filter-select"
            value={filters.sido}
            onChange={(event) => onSetSido(event.target.value)}
            options={[
              { value: '', label: '시/도' },
              ...filterOptions.sidos.map((sido) => ({ value: sido, label: sido })),
            ]}
          />
          <FormSelect
            className="gov-form-control government-region-filter-select"
            value={filters.sigungu}
            onChange={(event) => onSetSigungu(event.target.value)}
            disabled={!filters.sido}
            options={[
              { value: '', label: '시/군/구' },
              ...sigunguOptions.map((sigungu) => ({ value: sigungu, label: sigungu })),
            ]}
          />
          <FormSelect
            className="gov-form-control government-region-filter-select government-region-filter-select--sort"
            value={filters.sort}
            onChange={(event) => onSetSort(event.target.value as typeof filters.sort)}
            options={GOVERNMENT_REGION_SORT_OPTIONS}
          />
          <FormButton
            htmlType="button"
            variant="secondary"
            className={`gov-btn gov-btn--secondary government-region-advanced-filter-toggle${
              hasAdvancedFilters ? ' government-region-advanced-filter-toggle--active' : ''
            }`}
            onClick={() => setAdvancedFiltersOpen((open) => !open)}
            aria-expanded={advancedFiltersOpen}
          >
            {advancedFiltersOpen ? '상세 필터 닫기' : '상세 필터'}
          </FormButton>
          <FormButton
            htmlType="button"
            variant="secondary"
            className="gov-btn gov-btn--secondary government-region-reset-button"
            onClick={onResetFilters}
          >
            초기화
          </FormButton>
        </div>

        {advancedFiltersOpen ? (
          <div className="government-region-compact-toolbar__advanced">
            <FormSelect
              className="gov-form-control government-region-filter-select"
              value={filters.eupmyeondong}
              onChange={(event) => onSetEupmyeondong(event.target.value)}
              disabled={!filters.sigungu}
              options={[
                { value: '', label: '세부지역' },
                ...eupmyeondongOptions.map((eup) => ({ value: eup, label: eup })),
              ]}
            />
            <FormSelect
              className="gov-form-control government-region-filter-select"
              value={filters.progressStatus}
              onChange={(event) => onSetProgressStatus(event.target.value)}
              options={[
                { value: '', label: '신청 상태' },
                ...filterOptions.progressStatuses.map((status) => ({
                  value: status,
                  label: getGovernmentProgressStatusLabel(status),
                })),
              ]}
            />
            <FormSelect
              className="gov-form-control government-region-filter-select"
              value={filters.docStatus}
              onChange={(event) => onSetDocStatus(event.target.value)}
              options={[
                { value: '', label: '서류 상태' },
                ...filterOptions.docStatuses.map((status) => ({ value: status, label: status })),
              ]}
            />
          </div>
        ) : null}
      </section>

      {error ? <StatusMessage message={error} tone="error" className="status-message--flush-top" /> : null}
      {loading ? <LoadingState message="사업장 목록을 불러오는 중…" /> : null}

      {!loading ? (
        <section className="government-region-layout" data-testid="government-region-layout">
          <aside className="government-region-group-panel" data-testid="government-region-group-panel">
            <h2 className="government-region-group-panel__title">지역 그룹</h2>
            {groups.length === 0 ? (
              <p className="government-region-empty">표시할 지역 그룹이 없습니다.</p>
            ) : (
              <ul className="government-region-group-list">
                {groups.map((group) => (
                  <li key={group.key}>
                    <button
                      type="button"
                      className={`government-region-group-item${
                        selectedGroupKey === group.key ? ' government-region-group-item--active' : ''
                      }`}
                      onClick={() => onSelectGroup(group.key)}
                    >
                      <span className="government-region-group-item__label">{group.label}</span>
                      <span className="government-region-group-item__count">({group.count})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="government-region-results-panel" data-testid="government-region-results-panel">
            <h2 className="government-region-results-panel__title">
              {groups.find((group) => group.key === selectedGroupKey)?.label ?? '사업장 목록'}
            </h2>

            {visibleProfiles.length === 0 ? (
              <p className="government-region-empty">조건에 맞는 사업장이 없습니다.</p>
            ) : (
              <div className="government-region-result-table" data-testid="government-region-result-list">
                {visibleProfiles.map((profile) => {
                  const address = getGovernmentProfileAddress(profile)
                  const progressLabel = profile.progressStatus?.trim()
                    ? getGovernmentProgressStatusLabel(profile.progressStatus)
                    : '—'
                  return (
                    <article key={profile.id} className="government-region-result-card">
                      <div className="government-region-result-card__header">
                        <strong className="government-region-result-card__title">
                          {profileDisplayName(profile)}
                        </strong>
                        <div className="government-region-result-card__actions">
                          <Link
                            to={governmentMyApplicationTabPath(profile.id, 'basic')}
                            className="gov-btn gov-btn--primary gov-btn--sm government-region-result-card__detail-link"
                          >
                            상세 보기
                          </Link>
                        </div>
                      </div>
                      <p className="government-region-result-card__address">{displayGovField(address)}</p>
                      <dl className="government-region-result-card__meta-grid">
                        <div>
                          <dt>대표자/담당자</dt>
                          <dd>{displayGovField(profile.customerName)}</dd>
                        </div>
                        <div>
                          <dt>연락처</dt>
                          <dd>{displayGovField(profile.phone)}</dd>
                        </div>
                        <div>
                          <dt>사업자등록번호</dt>
                          <dd>
                            {profile.businessNumber?.trim()
                              ? maskBusinessNumber(profile.businessNumber)
                              : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt>신청 상태</dt>
                          <dd>{progressLabel}</dd>
                        </div>
                        <div>
                          <dt>서류 상태</dt>
                          <dd>{displayGovField(profile.docStatus || profile.edocStatus)}</dd>
                        </div>
                        <div>
                          <dt>등록일</dt>
                          <dd>{formatGovProfileDateTime(profile.createdAt)}</dd>
                        </div>
                      </dl>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </section>
      ) : null}
    </main>
  )
}
