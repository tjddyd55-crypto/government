import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  GovernmentConfirmDialog,
  type GovernmentConfirmDialogTone,
} from '../components/GovernmentConfirmDialog'

type GovernmentConfirmRequest = {
  title?: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: GovernmentConfirmDialogTone
  closeOnBackdrop?: boolean
}

type PendingGovernmentConfirm = GovernmentConfirmRequest & {
  resolve: (value: boolean) => void
}

/** 정부지원 CRM 전용 확인 모달 — 화이트 패널 + gov-btn */
export function useGovernmentConfirmDialog() {
  const [pending, setPending] = useState<PendingGovernmentConfirm | null>(null)

  const closeWith = useCallback((result: boolean) => {
    setPending((current) => {
      if (!current) {
        return null
      }
      current.resolve(result)
      return null
    })
  }, [])

  const confirm = useCallback((request: GovernmentConfirmRequest) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        ...request,
        resolve,
      })
    })
  }, [])

  useEffect(() => {
    return () => {
      setPending((current) => {
        if (current) {
          current.resolve(false)
        }
        return null
      })
    }
  }, [])

  return {
    confirm,
    confirmDialog: (
      <GovernmentConfirmDialog
        open={Boolean(pending)}
        title={pending?.title}
        message={pending?.message ?? ''}
        confirmLabel={pending?.confirmLabel}
        cancelLabel={pending?.cancelLabel}
        tone={pending?.tone ?? 'default'}
        closeOnBackdrop={pending?.closeOnBackdrop}
        onConfirm={() => closeWith(true)}
        onCancel={() => closeWith(false)}
      />
    ),
  }
}
