import { FormButton, FormInput, FormTextarea } from '../../../components/form'
import type { GovProfileBasicInfoFormState } from './governmentProfileBasicInfoFormState'
import { GOVERNMENT_PROFILE_BASIC_INFO_SECTIONS } from './governmentProfileBasicInfo.config'

type Props = {
  profileId: string
  form: GovProfileBasicInfoFormState
  onChange: (next: GovProfileBasicInfoFormState) => void
  onSave: () => void | Promise<void>
  onCancel: () => void
  saving?: boolean
  statusText?: string
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
        className="customer-edit-form"
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
              {section.fields.map((field) => (
                <label
                  key={field.key}
                  className={`field${field.wide ? ' field--wide' : ''}`}
                >
                  <span className="field__label">{field.label}</span>
                  {field.textarea ? (
                    <FormTextarea
                      className="field__control customer-form-textarea"
                      rows={3}
                      name={`${profileId}-${field.key}`}
                      value={form[field.key] ?? ''}
                      onChange={(e) => patchField(field.key, e.target.value)}
                    />
                  ) : (
                    <FormInput
                      className="field__control"
                      name={`${profileId}-${field.key}`}
                      value={form[field.key] ?? ''}
                      onChange={(e) => patchField(field.key, e.target.value)}
                    />
                  )}
                </label>
              ))}
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
            className="button-save"
            htmlType="button"
            variant="primary"
            disabled={saving}
            loading={saving}
            loadingText="저장 중…"
            onClick={() => void onSave()}
          >
            저장
          </FormButton>
          <FormButton htmlType="button" variant="secondary" disabled={saving} onClick={onCancel}>
            취소
          </FormButton>
        </div>
      </form>
    </>
  )
}
