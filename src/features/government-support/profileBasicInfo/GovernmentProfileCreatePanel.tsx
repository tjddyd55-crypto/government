import { useCallback, useState } from 'react'
import { StatusMessage } from '../../../components/feedback'
import { useGovernmentProfileWorkspaceContext } from '../pages/workspace/governmentProfileWorkspaceContext'
import GovernmentProfileBasicInfoEditForm from './GovernmentProfileBasicInfoEditForm'
import {
  basicInfoFormToPatch,
  emptyBasicInfoForm,
  type GovProfileBasicInfoFormState,
} from './governmentProfileBasicInfoFormState'
import { GOVERNMENT_PROFILE_CREATE_SEGMENT } from '../lib/governmentProfileCreateFlow'

export default function GovernmentProfileCreatePanel() {
  const ws = useGovernmentProfileWorkspaceContext()
  const [form, setForm] = useState<GovProfileBasicInfoFormState>(() => emptyBasicInfoForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statusText, setStatusText] = useState('')

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError('')
    setStatusText('')
    try {
      const row = await ws.createProfileFromForm(basicInfoFormToPatch(form))
      if (!row) {
        setError(ws.error ?? '사업장 등록에 실패했습니다.')
        return
      }
      setStatusText('사업장을 등록했습니다.')
      await ws.completeProfileCreate(row.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '사업장 등록에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [form, ws])

  const handleCancel = useCallback(() => {
    ws.cancelProfileCreate()
  }, [ws])

  return (
    <div className="government-profile-basic-info-panel government-profile-create-panel government-profile-mobile-section">
      <p className="government-page__muted government-profile-create-panel__banner">신규 사업장 작성 중</p>
      <StatusMessage message={error} tone="error" />
      <StatusMessage message={statusText || ws.feedback} tone="success" />
      <GovernmentProfileBasicInfoEditForm
        profileId={GOVERNMENT_PROFILE_CREATE_SEGMENT}
        form={form}
        onChange={setForm}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        statusText={statusText}
        focusFirstField
      />
    </div>
  )
}
