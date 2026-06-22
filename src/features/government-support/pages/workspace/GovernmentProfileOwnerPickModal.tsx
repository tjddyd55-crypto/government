import { BaseDialog } from '../../../../components/dialog/BaseDialog'
import FormButton from '../../../../components/form/FormButton'
import { useCallback, useEffect, useState } from 'react'

export type GovernmentProfileOwnerPickModalProps = {
  open: boolean
  ownerOptions: Array<{ id: string; label: string }>
  onClose: () => void
  onConfirm: (ownerUserId: string) => void
}

export default function GovernmentProfileOwnerPickModal({
  open,
  ownerOptions,
  onClose,
  onConfirm,
}: GovernmentProfileOwnerPickModalProps) {
  const [ownerUserId, setOwnerUserId] = useState('')

  useEffect(() => {
    if (!open) {
      setOwnerUserId('')
      return
    }
    if (ownerOptions.length === 1) {
      setOwnerUserId(ownerOptions[0].id)
    }
  }, [open, ownerOptions])

  const handleConfirm = useCallback(() => {
    const id = ownerUserId.trim()
    if (!id) return
    onConfirm(id)
  }, [onConfirm, ownerUserId])

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      ariaLabel="담당 이용자 선택"
      closeOnBackdrop={false}
      panelPreset="largeForm"
      onEscapeRequest={onClose}
    >
      <div className="government-profile-owner-pick">
        <header className="government-profile-edit-modal__header">
          <h2 className="government-profile-edit-modal__title">담당 이용자 선택</h2>
        </header>
        <p className="government-page__muted government-profile-owner-pick__hint">
          새 사업장을 등록할 담당 이용자를 선택하세요.
        </p>
        <label className="dark-label government-profile-owner-pick__label">
          담당 이용자
          <select
            className="gov-form-control government-profile-owner-pick__select"
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
            aria-label="담당 이용자"
          >
            <option value="">선택하세요</option>
            {ownerOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <div className="government-profile-owner-pick__actions">
          <FormButton htmlType="button" variant="secondary" onClick={onClose}>
            취소
          </FormButton>
          <FormButton
            htmlType="button"
            variant="primary"
            disabled={!ownerUserId.trim()}
            onClick={handleConfirm}
          >
            다음
          </FormButton>
        </div>
      </div>
    </BaseDialog>
  )
}
