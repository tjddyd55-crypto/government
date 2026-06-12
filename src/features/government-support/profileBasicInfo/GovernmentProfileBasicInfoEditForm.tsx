import { useRef, type RefObject } from 'react'
import { FormButton, FormInput, FormTextarea } from '../../../components/form'
import GovernmentAddressSearchButton from '../components/GovernmentAddressSearchButton'
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
}

function AddressFieldControl({
  fieldKey,
  label,
  wide,
  textarea,
  profileId,
  value,
  disabled,
  onValueChange,
}: {
  fieldKey: GovProfileBasicInfoFieldKey
  label: string
  wide?: boolean
  textarea?: boolean
  profileId: string
  value: string
  disabled?: boolean
  onValueChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)

  return (
    <label className={`field government-address-field${wide ? ' field--wide' : ''}`}>
      <span className="field__label">{label}</span>
      <div className="government-address-field__controls">
        <GovernmentAddressSearchButton
          disabled={disabled}
          focusTargetRef={inputRef}
          onAddressSelect={onValueChange}
        />
        {textarea ? (
          <FormTextarea
            ref={inputRef as RefObject<HTMLTextAreaElement>}
            className="field__control gov-form-control customer-form-textarea government-address-field__input"
            rows={3}
            name={`${profileId}-${fieldKey}`}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            disabled={disabled}
            placeholder="주소 검색 후 상세주소를 이어서 입력할 수 있습니다."
          />
        ) : (
          <FormInput
            ref={inputRef as RefObject<HTMLInputElement>}
            className="field__control gov-form-control government-address-field__input"
            name={`${profileId}-${fieldKey}`}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            disabled={disabled}
          />
        )}
      </div>
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
}: Props) {
  const patchField = (key: keyof GovProfileBasicInfoFormState, value: string) => {
    onChange({ ...form, [key]: value })
  }

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
                    wide={field.wide}
                    textarea={field.textarea}
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
