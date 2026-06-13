import { useEffect } from 'react'

const BODY_CLASS = 'government-public-signature-active'

/** 공개 서명 플로우(portal 모달·consent 서명 패드)까지 화이트/옐로 토큰을 적용한다. */
export function useGovernmentPublicSignatureBodyClass(): void {
  useEffect(() => {
    document.body.classList.add(BODY_CLASS)
    return () => {
      document.body.classList.remove(BODY_CLASS)
    }
  }, [])
}
