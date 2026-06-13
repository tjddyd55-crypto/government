import { useCallback, useState } from 'react'
import { useConfirmDialog } from '../../../components/dialog'
import { useAuth } from '../../auth/AuthProvider'
import {
  deleteGovernmentProgramUser,
  patchGovernmentAdminUser,
} from '../api/governmentAdminUsersApi'
import { mapGovernmentAdminApiError } from '../lib/mapGovernmentAdminApiError'
import type { GovernmentUserEntityStatus } from '../types/governmentAdminUser.types'

type UseGovernmentProgramUserAdminActionsOptions = {
  onChanged?: () => void | Promise<void>
}

export function useGovernmentProgramUserAdminActions(options: UseGovernmentProgramUserAdminActionsOptions = {}) {
  const { token, user } = useAuth()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [actingUserId, setActingUserId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const runAction = useCallback(
    async (targetUserId: string, task: () => Promise<void>) => {
      if (!token) return
      setActingUserId(targetUserId)
      setActionError(null)
      try {
        await task()
        await options.onChanged?.()
      } catch (e) {
        setActionError(mapGovernmentAdminApiError(e, '처리에 실패했습니다.'))
      } finally {
        setActingUserId(null)
      }
    },
    [token, options],
  )

  const suspendUser = useCallback(
    async (targetUserId: string, displayName: string) => {
      const ok = await confirm({
        title: '이용자 정지',
        message: `"${displayName}" 이용자를 정지하시겠습니까? 정지된 이용자는 서비스를 사용할 수 없습니다.`,
        confirmLabel: '정지',
        cancelLabel: '취소',
        tone: 'default',
      })
      if (!ok) return
      await runAction(targetUserId, async () => {
        await patchGovernmentAdminUser(token!, targetUserId, { status: 'blocked' satisfies GovernmentUserEntityStatus })
      })
    },
    [confirm, runAction, token],
  )

  const unsuspendUser = useCallback(
    async (targetUserId: string, displayName: string) => {
      const ok = await confirm({
        title: '정지 해제',
        message: `"${displayName}" 이용자의 정지를 해제하시겠습니까?`,
        confirmLabel: '해제',
        cancelLabel: '취소',
      })
      if (!ok) return
      await runAction(targetUserId, async () => {
        await patchGovernmentAdminUser(token!, targetUserId, { status: 'active' satisfies GovernmentUserEntityStatus })
      })
    },
    [confirm, runAction, token],
  )

  const archiveUser = useCallback(
    async (targetUserId: string, displayName: string) => {
      const ok = await confirm({
        title: '이용자 삭제(보관)',
        message: `"${displayName}" 이용자를 삭제/보관하시겠습니까? 사업장·신청·파일 기록은 삭제되지 않습니다.`,
        confirmLabel: '삭제',
        cancelLabel: '취소',
        tone: 'danger',
      })
      if (!ok) return
      await runAction(targetUserId, async () => {
        await deleteGovernmentProgramUser(token!, targetUserId)
      })
    },
    [confirm, runAction, token],
  )

  const isSelf = useCallback((targetUserId: string) => user?.id === targetUserId, [user?.id])

  return {
    confirmDialog,
    actingUserId,
    actionError,
    clearActionError: () => setActionError(null),
    suspendUser,
    unsuspendUser,
    archiveUser,
    isSelf,
  }
}
