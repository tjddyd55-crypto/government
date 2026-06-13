import { useCallback, useState, type KeyboardEvent } from 'react'

/** 관리자 목록 검색: draft(입력) / query(적용) 분리, Enter·검색 버튼으로 apply */
export function useGovernmentAdminTextSearch(initialQuery = '') {
  const [draft, setDraft] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)

  const apply = useCallback(() => {
    setQuery(draft.trim())
  }, [draft])

  const reset = useCallback(() => {
    setDraft('')
    setQuery('')
  }, [])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        apply()
      }
    },
    [apply],
  )

  return { draft, query, setDraft, apply, reset, onKeyDown, hasDraft: draft.trim().length > 0, hasQuery: query.length > 0 }
}
