import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import { useAuth } from '../../../auth/AuthProvider'
import { TodoEditorDialog, type TodoCreatePrefill } from '../../../todos/components/TodoEditorDialog'
import { firstLineTodoTitle } from '../../../todos/utils/todoCopy'
import { suggestDueDateFromText } from '../../../todos/utils/suggestDueDateFromText'
import { fetchGovProfileMemos } from '../../api/governmentProfileMemosApi'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'
import GovernmentProfileMemosPageMobile from './memos/GovernmentProfileMemosPageMobile'
import GovernmentProfileMemosPagePC from './memos/GovernmentProfileMemosPagePC'
import type { GovernmentProfileMemosViewProps } from './memos/governmentProfileMemosViewProps'
import type { GovProfileMemo } from '../../types/governmentProfile.types'

export default function GovernmentProfileMemosPanel() {
  const { profileId: profileIdParam } = useParams()
  const profileId = String(profileIdParam ?? '').trim()
  const { token, user } = useAuth()
  const ws = useGovernmentProfileWorkspaceContext()
  const profile = ws.selected
  const gaIdNumeric =
    user?.gaId != null && Number.isFinite(Number(user.gaId)) ? Number(user.gaId) : null
  const [memos, setMemos] = useState<GovProfileMemo[]>([])
  const [loading, setLoading] = useState(true)
  const [statusText, setStatusText] = useState('')
  const [memoTodoDialogOpen, setMemoTodoDialogOpen] = useState(false)
  const [memoTodoSession, setMemoTodoSession] = useState(0)
  const [memoTodoPrefill, setMemoTodoPrefill] = useState<TodoCreatePrefill | null>(null)

  const loadMemos = useCallback(async () => {
    if (!token?.trim() || !profileId) {
      setMemos([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const rows = await fetchGovProfileMemos(token, profileId)
      setMemos(rows)
      setStatusText('')
    } catch (error) {
      setMemos([])
      setStatusText(error instanceof Error ? error.message : '메모를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [profileId, token])

  useEffect(() => {
    void loadMemos()
  }, [loadMemos])

  const addTodoFromMemo = useCallback(
    (payload: { noteId: string; memoText: string }) => {
      const txt = payload.memoText.trim() || '(메모 내용 없음)'
      setMemoTodoPrefill({
        sourceType: 'customer_memo',
        sourceId: payload.noteId,
        title: firstLineTodoTitle(txt),
        description: txt,
        dueDate: suggestDueDateFromText(txt),
        relatedEntityType: 'customer',
        relatedEntityId: profileId,
        lockRelated: true,
        lockedCustomerSummary: profile?.customerName,
      })
      setMemoTodoSession((k) => k + 1)
      setMemoTodoDialogOpen(true)
    },
    [profile?.customerName, profileId],
  )

  const profileLabel = useMemo(() => {
    return `사업장 #${profileId} · ${profile?.customerName || profile?.businessName || '-'}`
  }, [profile?.businessName, profile?.customerName, profileId])

  if (!profileId) {
    return <p className="government-page__muted">사업장을 먼저 선택해 주세요.</p>
  }

  if (!token?.trim()) {
    return <p className="government-page__muted">{statusText || '로그인이 필요합니다.'}</p>
  }

  const viewProps: GovernmentProfileMemosViewProps = {
    profileId,
    token,
    memos,
    loading,
    statusText,
    profileLabel,
    onMemosChange: setMemos,
    onStatusMessage: setStatusText,
    onAddTodoFromMemo: gaIdNumeric != null ? addTodoFromMemo : undefined,
  }

  return (
    <>
      <ResponsiveLayout<GovernmentProfileMemosViewProps>
        PC={GovernmentProfileMemosPagePC}
        Mobile={GovernmentProfileMemosPageMobile}
        viewProps={viewProps}
      />
      {gaIdNumeric != null ? (
        <TodoEditorDialog
          open={memoTodoDialogOpen}
          onClose={() => {
            setMemoTodoDialogOpen(false)
            setMemoTodoPrefill(null)
          }}
          token={token}
          gaId={gaIdNumeric}
          sessionKey={memoTodoSession}
          prefill={memoTodoPrefill}
          onCommitted={() => {}}
        />
      ) : null}
    </>
  )
}
