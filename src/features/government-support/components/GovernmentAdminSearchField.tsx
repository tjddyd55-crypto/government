import type { KeyboardEvent } from 'react'
import { FieldWrapper, FormButton, FormInput } from '../../../components/form'

type GovernmentAdminSearchFieldProps = {
  draft: string
  onDraftChange: (value: string) => void
  onApply: () => void
  onReset: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
  label?: string
  testId?: string
}

export default function GovernmentAdminSearchField({
  draft,
  onDraftChange,
  onApply,
  onReset,
  onKeyDown,
  placeholder = '검색',
  disabled = false,
  label = '검색',
  testId = 'government-admin-user-search',
}: GovernmentAdminSearchFieldProps) {
  const canReset = draft.trim().length > 0

  return (
    <FieldWrapper label={label} className="admin-user-management__filter-field government-admin-search-field-wrap">
      <div className="government-admin-search-field" data-testid={testId}>
        <FormInput
          className="gov-form-control admin-form-input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={placeholder}
        />
        <FormButton
          htmlType="button"
          variant="primary"
          className="gov-btn gov-btn--primary"
          onClick={onApply}
          disabled={disabled}
        >
          검색
        </FormButton>
        <FormButton
          htmlType="button"
          variant="secondary"
          className="gov-btn gov-btn--secondary"
          onClick={onReset}
          disabled={disabled || !canReset}
        >
          초기화
        </FormButton>
      </div>
    </FieldWrapper>
  )
}
