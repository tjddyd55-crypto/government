import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StatusMessage } from '../../../components/feedback'
import { FormButton } from '../../../components/form'
import { useGovernmentProfileWorkspaceContext } from '../pages/workspace/governmentProfileWorkspaceContext'
import GovernmentProfileBasicInfoEditForm from './GovernmentProfileBasicInfoEditForm'
import GovernmentProfileBasicInfoReadView from './GovernmentProfileBasicInfoReadView'
import {
  basicInfoFormToPatch,
  profileToBasicInfoForm,
  type GovProfileBasicInfoFormState,
} from './governmentProfileBasicInfoFormState'

export default function GovernmentProfileBasicInfoPanel() {
  const { profileId: profileIdParam } = useParams()
  const profileId = String(profileIdParam ?? '').trim()
  const ws = useGovernmentProfileWorkspaceContext()
  const profile = ws.selected
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<GovProfileBasicInfoFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statusText, setStatusText] = useState('')

  useEffect(() => {
    if (!profile || profile.id !== profileId) {
      setEditing(false)
      setForm(null)
      return
    }
    if (!editing) {
      setForm(profileToBasicInfoForm(profile))
    }
  }, [profile, profileId, editing])

  const handleStartEdit = useCallback(() => {
    if (!profile) return
    setForm(profileToBasicInfoForm(profile))
    setEditing(true)
    setError('')
    setStatusText('')
  }, [profile])

  const handleCancelEdit = useCallback(() => {
    if (profile) {
      setForm(profileToBasicInfoForm(profile))
    }
    setEditing(false)
    setError('')
    setStatusText('')
  }, [profile])

  const handleSave = useCallback(async () => {
    if (!profile || !form) return
    setSaving(true)
    setError('')
    setStatusText('')
    try {
      await ws.saveProfile(profile.id, basicInfoFormToPatch(form))
      setEditing(false)
      setStatusText('저장했습니다.')
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }, [form, profile, ws])

  if (!profileId || !profile || profile.id !== profileId) {
    return <p className="government-page__muted">사업장을 선택해 주세요.</p>
  }

  return (
    <div className="government-profile-basic-info-panel">
      <StatusMessage message={error} tone="error" />
      <StatusMessage message={ws.feedback ?? statusText} tone="success" />

      {!editing ? (
        <>
          <div className="customer-edit-actions government-profile-basic-info-panel__edit-actions">
            <FormButton htmlType="button" variant="primary" onClick={handleStartEdit}>
              기본정보 수정
            </FormButton>
          </div>
          <GovernmentProfileBasicInfoReadView profile={profile} />
        </>
      ) : form ? (
        <GovernmentProfileBasicInfoEditForm
          profileId={profile.id}
          form={form}
          onChange={setForm}
          onSave={handleSave}
          onCancel={handleCancelEdit}
          saving={saving}
          statusText={statusText}
        />
      ) : null}
    </div>
  )
}
