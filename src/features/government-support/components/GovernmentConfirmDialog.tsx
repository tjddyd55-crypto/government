import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FormButton } from '../../../components/form'

export type GovernmentConfirmDialogTone = 'default' | 'danger' | 'warning'

export type GovernmentConfirmDialogProps = {
  open: boolean
  title?: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  tone?: GovernmentConfirmDialogTone
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function GovernmentConfirmDialog({
  open,
  title = '확인',
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  busy = false,
  tone = 'default',
  onConfirm,
  onCancel,
}: GovernmentConfirmDialogProps) {
  useEffect(() => {
    if (!open || busy) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel, open])

  if (!open) {
    return null
  }

  const confirmVariant = tone === 'danger' ? 'danger' : 'primary'
  const confirmClass =
    tone === 'danger'
      ? 'gov-btn gov-btn--danger'
      : tone === 'warning'
        ? 'gov-btn gov-btn--secondary'
        : 'gov-btn gov-btn--primary'

  const dialogNode = (
    <div
      className="government-confirm-dialog__backdrop"
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) {
          onCancel()
        }
        event.stopPropagation()
      }}
    >
      <div
        className="government-confirm-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="government-confirm-dialog__title">{title}</h3>
        <div className="government-confirm-dialog__message">{message}</div>
        <div className="government-confirm-dialog__footer">
          <FormButton
            htmlType="button"
            variant="secondary"
            className="gov-btn gov-btn--secondary"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </FormButton>
          <FormButton
            htmlType="button"
            variant={confirmVariant}
            className={confirmClass}
            onClick={() => void onConfirm()}
            disabled={busy}
          >
            {busy ? '처리 중…' : confirmLabel}
          </FormButton>
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(dialogNode, document.body)
  }
  return dialogNode
}
