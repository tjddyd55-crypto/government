import { useCallback, useEffect, useState } from 'react'
import { BaseDialog } from '../../../../components/dialog/BaseDialog'
import type { GovSupportProfile } from '../../types/governmentProfile.types'
import GovernmentProfileBasicInfoEditForm from '../../profileBasicInfo/GovernmentProfileBasicInfoEditForm'
import {
  basicInfoFormToPatch,
  profileToBasicInfoForm,
  type GovProfileBasicInfoFormState,
} from '../../profileBasicInfo/governmentProfileBasicInfoFormState'

type Props = {
  open: boolean
  profile: GovSupportProfile | null
  onClose: () => void
  onSave: (profileId: string, patch: Partial<GovSupportProfile>) => Promise<void>
}

export default function GovernmentProfileEditModal({ open, profile, onClose, onSave }: Props) {
  const [form, setForm] = useState<GovProfileBasicInfoFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && profile) {
      setForm(profileToBasicInfoForm(profile))
      setError('')
      setSaving(false)
    }
  }, [open, profile])

  const handleSave = useCallback(async () => {
    if (!profile || !form) return
    setSaving(true)
    setError('')
    try {
      await onSave(profile.id, basicInfoFormToPatch(form))
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [form, onClose, onSave, profile])

  if (!profile) return null

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      ariaLabel="사업장 기본정보 수정"
      closeOnBackdrop={false}
      panelPreset="largeForm"
      onEscapeRequest={onClose}
    >
      <div className="government-profile-edit-modal">
        <header className="government-profile-edit-modal__header">
          <h2 className="government-profile-edit-modal__title">사업장 기본정보 수정</h2>
        </header>
        <div className="government-profile-edit-modal__body">
          {error ? <p className="government-user-section__error">{error}</p> : null}
          {form ? (
            <GovernmentProfileBasicInfoEditForm
              profileId={profile.id}
              form={form}
              onChange={setForm}
              onSave={handleSave}
              onCancel={onClose}
              saving={saving}
            />
          ) : null}
        </div>
      </div>
    </BaseDialog>
  )
}
