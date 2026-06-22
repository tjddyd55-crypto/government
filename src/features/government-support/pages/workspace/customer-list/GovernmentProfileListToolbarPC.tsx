import FormButton from '../../../../../components/form/FormButton'
import type { GovernmentProfileListToolbarExtendedProps } from './governmentProfileListToolbarExtendedProps'
import '../../../government-customer-list-pc.css'

export default function GovernmentProfileListToolbarPC({
  search,
  customerStatusOptionId,
  businessType,
  businessTypeOptions,
  statusOptions,
  onSearchChange,
  onCustomerStatusChange,
  onBusinessTypeChange,
  onAddProfile,
  showOwnerFilter = false,
  ownerUserId = '',
  ownerOptions = [],
  onOwnerUserChange,
  showTenantFilter = false,
  tenantId = '',
  tenantOptions = [],
  onTenantChange,
}: GovernmentProfileListToolbarExtendedProps) {
  return (
    <div className="government-customer-list-toolbar government-customer-list-toolbar--pc">
      <input
        type="search"
        className="gov-form-control government-customer-list-toolbar__search"
        placeholder={
          showOwnerFilter
            ? '이름·휴대폰·업종·담당자 검색'
            : '이름·휴대폰·업종·사업장명 검색'
        }
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        data-testid="government-customer-search"
      />
      {showTenantFilter && tenantOptions.length > 0 ? (
        <select
          className="gov-form-control government-customer-list-toolbar__filter"
          value={tenantId}
          onChange={(e) => onTenantChange?.(e.target.value)}
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
        className="gov-form-control government-customer-list-toolbar__filter"
        value={customerStatusOptionId}
        onChange={(e) => onCustomerStatusChange(e.target.value)}
        aria-label="고객상태 필터"
      >
        <option value="">고객상태 전체</option>
        <option value="none">상태 없음</option>
        {statusOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        className="gov-form-control government-customer-list-toolbar__filter"
        value={businessType}
        onChange={(e) => onBusinessTypeChange(e.target.value)}
        aria-label="업종 필터"
      >
        <option value="">업종 전체</option>
        {businessTypeOptions.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      {showOwnerFilter ? (
        <select
          className="gov-form-control government-customer-list-toolbar__filter"
          value={ownerUserId}
          onChange={(e) => onOwnerUserChange?.(e.target.value)}
          aria-label="담당 이용자 필터"
          data-testid="government-customer-owner-filter"
        >
          <option value="">담당 이용자 전체</option>
          {ownerOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : null}
      <FormButton
        htmlType="button"
        variant="primary"
        className="gov-btn gov-btn--primary government-customer-list-toolbar__add"
        data-testid="government-profile-list-add-btn"
        onClick={onAddProfile}
      >
        + 사업장 추가
      </FormButton>
    </div>
  )
}
