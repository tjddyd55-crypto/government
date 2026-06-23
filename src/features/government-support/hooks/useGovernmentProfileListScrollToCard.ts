import { useLayoutEffect, type RefObject } from 'react'
import { normalizeGovProfileId } from '../lib/governmentProfileDocumentCategories'

type Options = {
  listRef: RefObject<HTMLElement | null>
  profileId: string | null
  /** user expand 토글 시 같은 profileId라도 재스크롤 */
  expandProfileId?: string | null
  /** 새 카드가 목록에 붙은 뒤 재시도 */
  listRevision?: number
}

function scrollCardToListTop(container: HTMLElement, profileId: string): boolean {
  const normalized = normalizeGovProfileId(profileId)
  if (!normalized) return false

  const card = container.querySelector<HTMLElement>(`[data-profile-id="${normalized}"]`)
  if (!card) return false

  const containerTop = container.getBoundingClientRect().top
  const cardTop = card.getBoundingClientRect().top
  const nextScrollTop = container.scrollTop + (cardTop - containerTop)
  container.scrollTo({
    top: Math.max(0, nextScrollTop),
    behavior: 'smooth',
  })
  return true
}

/**
 * 선택·펼침·라우트 진입 시 해당 고객 카드를 좌측 리스트 scroll container 최상단으로 이동한다.
 */
export function useGovernmentProfileListScrollToCard({
  listRef,
  profileId,
  expandProfileId = null,
  listRevision = 0,
}: Options) {
  useLayoutEffect(() => {
    const normalized =
      normalizeGovProfileId(profileId) ?? normalizeGovProfileId(expandProfileId)
    if (!normalized) return

    const container = listRef.current
    if (!container) return

    const run = () => scrollCardToListTop(container, normalized)

    if (run()) return

    const frameId = requestAnimationFrame(() => {
      run()
    })

    return () => cancelAnimationFrame(frameId)
  }, [listRef, profileId, expandProfileId, listRevision])
}
