import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGovernmentConfirmDialog } from '../hooks/useGovernmentConfirmDialog'
import { FormTextarea, FormButton } from '../../../components/form'
import {
  createGovProfileMemo,
  deleteGovProfileMemo,
} from '../api/governmentProfileMemosApi'
import { GOVERNMENT_PROFILE_MEMO_MAX_LENGTH } from '../constants/governmentProfileMemo.config'
import type { GovProfileMemo } from '../types/governmentProfile.types'

function makePendingMemoId(): string {
  return `pending:${Date.now()}:${Math.random().toString(16).slice(2)}`
}

type Props = {
  profileId: string
  token: string | null
  memos: GovProfileMemo[]
  onMemosChange: (memos: GovProfileMemo[]) => void
  onStatusMessage: (msg: string) => void
  /** 메모 줄에서 플랫폼 할 일 초안 생성 */
  onAddTodoFromMemo?: (payload: { noteId: string; memoText: string }) => void
  /** default: PC 인라인 폼 / mobileRecord: 모바일 상담 이력형 기록 UI */
  layout?: 'default' | 'mobileRecord'
}

export const GovernmentProfileInlineNotesSection = memo(function GovernmentProfileInlineNotesSection({
  profileId,
  token,
  memos,
  onMemosChange,
  onStatusMessage,
  onAddTodoFromMemo,
  layout = 'default',
}: Props) {
  const [draft, setDraft] = useState('')
  const [localMemos, setLocalMemos] = useState<GovProfileMemo[]>(() => memos)
  const [saving, setSaving] = useState(false)
  const savingLock = useRef(false)

  const serverMemosSignature = useMemo(() => {
    return `${profileId}|${JSON.stringify(memos.map((m) => [m.id, m.content, m.updatedAt]))}`
  }, [profileId, memos])

  useEffect(() => {
    setLocalMemos(memos)
  }, [serverMemosSignature, memos])

  const { confirm, confirmDialog } = useGovernmentConfirmDialog()

  const sortedItems = useMemo(() => {
    return [...localMemos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [localMemos])

  const clearDraft = useCallback(() => {
    setDraft('')
  }, [])

  const requestClearDraft = useCallback(async () => {
    if (!draft.trim()) {
      clearDraft()
      return
    }
    const ok = await confirm({
      title: '메모 작성',
      message: '작성 중인 내용이 있습니다. 취소할까요?',
      confirmLabel: '취소',
      cancelLabel: '계속 작성',
      tone: 'warning',
    })
    if (ok) {
      clearDraft()
    }
  }, [clearDraft, confirm, draft])

  async function commitCreateToServer(
    optimistic: GovProfileMemo,
    nextOptimisticList: GovProfileMemo[],
    rollback: () => void,
  ) {
    if (!token?.trim()) {
      rollback()
      return
    }
    if (!profileId.trim()) {
      onStatusMessage('사업장 정보가 올바르지 않습니다.')
      rollback()
      return
    }
    onStatusMessage('')
    try {
      const saved = await createGovProfileMemo(token, profileId, optimistic.content)
      const withoutPending = nextOptimisticList.filter((m) => m.id !== optimistic.id)
      const next = [saved, ...withoutPending]
      setLocalMemos(next)
      onMemosChange(next)
    } catch (e) {
      rollback()
      const msg = e instanceof Error ? e.message : '메모 저장에 실패했습니다.'
      onStatusMessage(msg)
    } finally {
      savingLock.current = false
      setSaving(false)
    }
  }

  async function commitDeleteToServer(memoId: string, snapshot: GovProfileMemo[], nextForApi: GovProfileMemo[]) {
    if (!token?.trim()) {
      setLocalMemos(snapshot)
      return
    }
    onStatusMessage('')
    try {
      await deleteGovProfileMemo(token, profileId, memoId)
      setLocalMemos(nextForApi)
      onMemosChange(nextForApi)
    } catch (e) {
      setLocalMemos(snapshot)
      const msg = e instanceof Error ? e.message : '메모 삭제에 실패했습니다.'
      onStatusMessage(msg)
    } finally {
      savingLock.current = false
      setSaving(false)
    }
  }

  function handleMemoSave() {
    if (savingLock.current) {
      return
    }
    const trimmed = draft.trim()
    if (!trimmed) {
      return
    }
    if (trimmed.length > GOVERNMENT_PROFILE_MEMO_MAX_LENGTH) {
      onStatusMessage(`메모는 ${GOVERNMENT_PROFILE_MEMO_MAX_LENGTH}자 이하로 입력해주세요.`)
      return
    }
    const tempId = makePendingMemoId()
    const optimistic: GovProfileMemo = {
      id: tempId,
      profileId,
      ownerUserId: '',
      content: trimmed,
      createdByUserId: null,
      updatedByUserId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
    }
    const nextForApi = [optimistic, ...localMemos]

    savingLock.current = true
    setSaving(true)
    setLocalMemos(nextForApi)

    clearDraft()

    void commitCreateToServer(optimistic, nextForApi, () => {
      setLocalMemos((prev) => prev.filter((m) => m.id !== tempId))
    })
  }

  function removeNote(id: string) {
    if (savingLock.current) {
      return
    }
    const snapshot = localMemos
    const nextForApi = snapshot.filter((n) => n.id !== id)

    savingLock.current = true
    setSaving(true)
    setLocalMemos(nextForApi)

    void commitDeleteToServer(id, snapshot, nextForApi)
  }

  async function requestRemoveNote(id: string) {
    if (savingLock.current) {
      return
    }
    const ok = await confirm({
      title: '메모 삭제',
      message: '메모를 삭제하시겠습니까? 삭제한 메모는 되돌릴 수 없습니다.',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      tone: 'danger',
    })
    if (!ok) {
      return
    }
    removeNote(id)
  }

  const composeForm =
    layout === 'mobileRecord' ? null : (
    <section
      className="gov-user-card gov-workspace-compose-card"
      data-testid="government-profile-memo-compose-inline"
    >
      <div className="gov-workspace-compose-card__header">
        <h3 className="gov-workspace-compose-card__title">메모 작성</h3>
        <p className="gov-workspace-compose-card__desc">사업장 관련 메모를 바로 등록합니다.</p>
      </div>
      <FormTextarea
        className="gov-form-control gov-workspace-compose-card__textarea"
        value={draft}
        maxLength={GOVERNMENT_PROFILE_MEMO_MAX_LENGTH}
        onChange={(e) => setDraft(e.target.value.slice(0, GOVERNMENT_PROFILE_MEMO_MAX_LENGTH))}
        placeholder="메모 내용"
        rows={4}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      <div className="gov-workspace-compose-card__actions">
        {draft.trim() ? (
          <FormButton
            htmlType="button"
            variant="secondary"
            className="gov-btn gov-btn--secondary"
            disabled={saving}
            onClick={() => void requestClearDraft()}
          >
            취소
          </FormButton>
        ) : null}
        <FormButton
          htmlType="button"
          variant="primary"
          className="gov-btn gov-btn--primary"
          disabled={saving || !draft.trim() || !token?.trim()}
          onClick={handleMemoSave}
        >
          {saving ? '저장 중…' : '메모 추가'}
        </FormButton>
      </div>
    </section>
  )

  if (layout === 'mobileRecord') {
    return (
      <>
        <section className="government-profile-mobile-card government-profile-mobile-memos-form">
          <h2 className="government-profile-mobile-card__title">메모 기록</h2>
          <p className="government-profile-mobile-card__desc">고객 관리 중 필요한 내용을 기록합니다.</p>
          <form
            className="government-profile-mobile-form"
            onSubmit={(event) => {
              event.preventDefault()
              handleMemoSave()
            }}
          >
            <FormTextarea
              className="gov-form-control government-profile-mobile-textarea"
              value={draft}
              maxLength={GOVERNMENT_PROFILE_MEMO_MAX_LENGTH}
              onChange={(e) => setDraft(e.target.value.slice(0, GOVERNMENT_PROFILE_MEMO_MAX_LENGTH))}
              placeholder="메모 내용"
              rows={4}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
            />
            <FormButton
              htmlType="submit"
              variant="primary"
              className="gov-btn gov-btn--primary customer-workspace-tab-submit"
              disabled={saving || !draft.trim() || !token?.trim()}
            >
              {saving ? '저장 중…' : '메모 추가'}
            </FormButton>
          </form>
        </section>

        <section className="government-profile-mobile-card government-profile-mobile-memos-list">
          <div className="government-profile-mobile-memos-list__head">
            <h2 className="government-profile-mobile-card__title">등록된 메모</h2>
            <span className="government-profile-mobile-memos-list__count">총 {sortedItems.length}건</span>
          </div>

          {sortedItems.length === 0 ? (
            <p className="government-profile-mobile-empty">등록된 메모가 없습니다.</p>
          ) : (
            <ul className="government-profile-mobile-list">
              {sortedItems.map((note) => (
                <li
                  key={note.id}
                  className="government-profile-mobile-list-item government-profile-mobile-memo-item customer-workspace-record-item"
                >
                  <div className="customer-workspace-record-item__head">
                    <div className="customer-workspace-record-item__date">
                      {new Date(note.createdAt).toLocaleString('ko-KR')}
                    </div>
                    <div className="customer-workspace-record-item__actions">
                      {onAddTodoFromMemo ? (
                        <FormButton
                          htmlType="button"
                          variant="secondary"
                          className="gov-btn gov-btn--secondary gov-btn--sm"
                          disabled={saving}
                          onClick={() => onAddTodoFromMemo({ noteId: note.id, memoText: note.content })}
                        >
                          할 일로 추가
                        </FormButton>
                      ) : null}
                      <FormButton
                        htmlType="button"
                        variant="danger"
                        size="sm"
                        className="gov-btn gov-btn--danger gov-btn--sm"
                        disabled={saving}
                        onClick={() => void requestRemoveNote(note.id)}
                      >
                        삭제
                      </FormButton>
                    </div>
                  </div>
                  <div className="customer-workspace-record-item__body">{note.content || '—'}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
        {confirmDialog}
      </>
    )
  }

  return (
    <div className="customer-inline-notes gov-workspace-notes-section">
      {composeForm}

      <div className="gov-workspace-record-section">
        <div className="gov-workspace-record-section__head">
          <h3 className="gov-workspace-record-section__title">등록된 메모</h3>
          <span className="gov-workspace-record-section__count">총 {sortedItems.length}건</span>
        </div>

        {sortedItems.length === 0 ? (
          <p className="gov-workspace-record-section__empty">등록된 내용이 없습니다.</p>
        ) : (
          <ul className="gov-workspace-record-list">
            {sortedItems.map((note) => {
              return (
                <li key={note.id} className="gov-workspace-record-card customer-inline-memo-row">
                  <div className="gov-workspace-record-card__body customer-inline-memo-row__body">
                    <div className="gov-workspace-record-card__text">{note.content}</div>
                    <small className="customer-inline-memo-row__meta gov-workspace-record-card__meta">
                      {new Date(note.createdAt).toLocaleString('ko-KR')}
                    </small>
                  </div>
                  <div className="gov-workspace-record-card__actions">
                    {onAddTodoFromMemo ? (
                      <FormButton
                        htmlType="button"
                        aria-label="할 일로 추가"
                        title="할 일로 추가"
                        disabled={saving}
                        className="gov-btn gov-btn--secondary gov-btn--sm government-profile-inline-note__todo-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddTodoFromMemo({ noteId: note.id, memoText: note.content })
                        }}
                      >
                        할 일로 추가
                      </FormButton>
                    ) : null}
                    <FormButton
                      htmlType="button"
                      variant="danger"
                      size="sm"
                      aria-label="메모 삭제"
                      title="삭제"
                      disabled={saving}
                      className="gov-btn gov-btn--danger gov-btn--sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        void requestRemoveNote(note.id)
                      }}
                    >
                      삭제
                    </FormButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {confirmDialog}
    </div>
  )
})
