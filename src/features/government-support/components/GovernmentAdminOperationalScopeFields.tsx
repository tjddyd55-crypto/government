import { FieldWrapper, FormSelect } from '../../../components/form'
import { GOVERNMENT_SCOPE_OPTIONS } from '../constants/governmentOperations'

type GovernmentAdminOperationalScopeFieldsProps = {
  canPickScope: boolean
  scopeType: string
  tenantId: string
  agencyOptions: { value: string; label: string }[]
  onScopeTypeChange: (value: string) => void
  onTenantIdChange: (value: string) => void
  disabled?: boolean
}

export default function GovernmentAdminOperationalScopeFields({
  canPickScope,
  scopeType,
  tenantId,
  agencyOptions,
  onScopeTypeChange,
  onTenantIdChange,
  disabled = false,
}: GovernmentAdminOperationalScopeFieldsProps) {
  if (canPickScope) {
    return (
      <>
        <FieldWrapper label="공개 범위">
          <FormSelect
            className="gov-form-control"
            value={scopeType}
            onChange={(e) => onScopeTypeChange(e.target.value)}
            options={[...GOVERNMENT_SCOPE_OPTIONS]}
            disabled={disabled}
            aria-label="공개 범위"
          />
        </FieldWrapper>
        {scopeType === 'agency' ? (
          <FieldWrapper label="대행사">
            <FormSelect
              className="gov-form-control"
              value={tenantId}
              onChange={(e) => onTenantIdChange(e.target.value)}
              options={agencyOptions}
              disabled={disabled}
              aria-label="대행사 선택"
            />
          </FieldWrapper>
        ) : null}
      </>
    )
  }

  if (agencyOptions.length > 1) {
    return (
      <FieldWrapper label="대행사">
        <FormSelect
          className="gov-form-control"
          value={tenantId}
          onChange={(e) => onTenantIdChange(e.target.value)}
          options={agencyOptions}
          disabled={disabled}
          aria-label="대행사"
        />
      </FieldWrapper>
    )
  }

  return null
}
