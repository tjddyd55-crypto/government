import { createContext, useContext, type ReactNode } from 'react'
import { useGovernmentAccess } from '../hooks/useGovernmentAccess'

type GovernmentAccessContextValue = ReturnType<typeof useGovernmentAccess>

const GovernmentAccessContext = createContext<GovernmentAccessContextValue | null>(null)

export function GovernmentAccessProvider({
  token,
  children,
}: {
  token: string | null | undefined
  children: ReactNode
}) {
  const value = useGovernmentAccess(token)
  return <GovernmentAccessContext.Provider value={value}>{children}</GovernmentAccessContext.Provider>
}

export function useGovernmentAccessContext(): GovernmentAccessContextValue {
  const ctx = useContext(GovernmentAccessContext)
  if (!ctx) {
    throw new Error('useGovernmentAccessContext must be used within GovernmentAccessProvider')
  }
  return ctx
}

/** Provider 밖(비관리자 라우트)에서도 동일 훅 시그니처로 fallback */
export function useGovernmentAccessShared(token: string | null | undefined): GovernmentAccessContextValue {
  const ctx = useContext(GovernmentAccessContext)
  const standalone = useGovernmentAccess(token)
  return ctx ?? standalone
}
