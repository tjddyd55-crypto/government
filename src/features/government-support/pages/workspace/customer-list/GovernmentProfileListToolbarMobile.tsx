import FormButton from '../../../../../components/form/FormButton'
import type { GovernmentProfileListToolbarProps } from './governmentProfileListToolbarProps'
import '../../../government-customer-list-mobile.css'

export default function GovernmentProfileListToolbarMobile({
  search,
  customerStatusOptionId,
  businessType,
  businessTypeOptions,
  statusOptions,
  onSearchChange,
  onCustomerStatusChange,
  onBusinessTypeChange,
  onAddProfile,
}: GovernmentProfileListToolbarProps) {
  return (
    <div className="government-customer-list-toolbar government-customer-list-toolbar--mobile">
      <input
        type="search"
        className="gov-form-control government-customer-list-toolbar__search"
        placeholder="검색"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        data-testid="government-customer-search"
      />
      <div className="government-customer-list-toolbar__filters">
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
      </div>
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
