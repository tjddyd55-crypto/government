import { useEffect, useMemo, useRef } from 'react'
import { FormButton, FormInput, FormTextarea } from '../../../components/form'
import AddressSearchField from '../../../components/form/AddressSearchField'
import { formatAddressForSave, parseAddressFromSave } from '../../../components/form/addressSearchUtils'
import type { GovProfileBasicInfoFormState } from './governmentProfileBasicInfoFormState'
import {
  GOVERNMENT_PROFILE_BASIC_INFO_SECTIONS,
  type GovProfileBasicInfoFieldKey,
} from './governmentProfileBasicInfo.config'

const ADDRESS_FIELD_KEYS = new Set<GovProfileBasicInfoFieldKey>(['homeAddress', 'businessAddress'])

type Props = {
  profileId: string
  form: GovProfileBasicInfoFormState
  onChange: (next: GovProfileBasicInfoFormState) => void
  onSave: () => void | Promise<void>
  onCancel: () => void
  saving?: boolean
  statusText?: string
  focusFirstField?: boolean
  onFocusFirstFieldHandled?: () => void
}

function AddressFieldControl({
  fieldKey,
  label,
  profileId,
  value,
  disabled,
  onValueChange,
}: {
  fieldKey: GovProfileBasicInfoFieldKey
  label: string
  profileId: string
  value: string
  disabled?: boolean
  onValueChange: (value: string) => void
}) {
  const parsed = useMemo(() => parseAddressFromSave(value), [value])

  return (
    <label className="field field--wide government-address-field">
      <span className="field__label">{label}</span>
      <AddressSearchField
        layout="gov"
        className="government-address-field__search address-search-field"
        value={parsed}
        disabled={disabled}
        addressPlaceholder="주소"
        detailPlaceholder="상세주소를 입력하세요 (선택)"
        onChange={(next) => onValueChange(formatAddressForSave(next))}
      />
    </label>
  )
}

export default function GovernmentProfileBasicInfoEditForm({
  profileId,
  form,
  onChange,
  onSave,
  onCancel,
  saving = false,
  statusText,
  focusFirstField = false,
  onFocusFirstFieldHandled,
}: Props) {
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const patchField = (key: keyof GovProfileBasicInfoFormState, value: string) => {
    onChange({ ...form, [key]: value })
  }

  const firstInputKey = GOVERNMENT_PROFILE_BASIC_INFO_SECTIONS[0]?.fields[0]?.key

  useEffect(() => {
    if (!focusFirstField) return
    firstFieldRef.current?.focus()
    onFocusFirstFieldHandled?.()
  }, [focusFirstField, onFocusFirstFieldHandled])

  return (
    <>
      <div className="customer-edit-banner" role="status">
        ✏ 사업장 기본정보 수정 중
      </div>
      <form
        className="customer-edit-form government-profile-basic-info-edit-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void onSave()
        }}
      >
        {GOVERNMENT_PROFILE_BASIC_INFO_SECTIONS.map((section) => (
          <section key={section.id} className="customer-detail-read__section" aria-labelledby={`gov-basic-edit-${section.id}`}>
            <div className="customer-detail-read__section-header">
              <h4 id={`gov-basic-edit-${section.id}`} className="customer-detail-read__section-title">
                {section.title}
              </h4>
            </div>
            <div className="field-grid-customers">
              {section.fields.map((field) =>
                ADDRESS_FIELD_KEYS.has(field.key) ? (
                  <AddressFieldControl
                    key={field.key}
                    fieldKey={field.key}
                    label={field.label}
                    profileId={profileId}
                    value={form[field.key] ?? ''}
                    disabled={saving}
                    onValueChange={(value) => patchField(field.key, value)}
                  />
                ) : (
                  <label key={field.key} className={`field${field.wide ? ' field--wide' : ''}`}>
                    <span className="field__label">{field.label}</span>
                    {field.textarea ? (
                      <FormTextarea
                        className="field__control gov-form-control customer-form-textarea"
                        rows={3}
                        name={`${profileId}-${field.key}`}
                        value={form[field.key] ?? ''}
                        onChange={(e) => patchField(field.key, e.target.value)}
                        disabled={saving}
                      />
                    ) : (
                      <FormInput
                        ref={field.key === firstInputKey ? firstFieldRef : undefined}
                        className="field__control gov-form-control"
                        name={`${profileId}-${field.key}`}
                        value={form[field.key] ?? ''}
                        onChange={(e) => patchField(field.key, e.target.value)}
                        disabled={saving}
                      />
                    )}
                  </label>
                ),
              )}
            </div>
          </section>
        ))}
        {statusText?.trim() ? (
          <p className="customer-edit-form__status" role="status" aria-live="polite">
            {statusText}
          </p>
        ) : null}
        <div className="customer-edit-actions">
          <FormButton
            className="button-save gov-btn gov-btn--primary"
            htmlType="button"
            variant="primary"
            disabled={saving}
            loading={saving}
            loadingText="저장 중…"
            onClick={() => void onSave()}
          >
            저장
          </FormButton>
          <FormButton
            htmlType="button"
            variant="secondary"
            className="gov-btn gov-btn--secondary"
            disabled={saving}
            onClick={onCancel}
          >
            취소
          </FormButton>
        </div>
      </form>
    </>
  )
}
