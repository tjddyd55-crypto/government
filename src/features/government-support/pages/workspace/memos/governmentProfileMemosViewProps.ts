import type { GovProfileMemo } from '../../../types/governmentProfile.types'

export type GovernmentProfileMemosViewProps = {
  profileId: string
  token: string
  memos: GovProfileMemo[]
  loading: boolean
  statusText: string
  profileLabel: string
  onMemosChange: (memos: GovProfileMemo[]) => void
  onStatusMessage: (msg: string) => void
  onAddTodoFromMemo?: (payload: { noteId: string; memoText: string }) => void
}
