import { createContext, useContext } from 'react'

export type GovernmentUserChromeContextValue = {
  setWorkspaceBreadcrumbSuffix: (label: string | null) => void
}

export const GovernmentUserChromeContext = createContext<GovernmentUserChromeContextValue | null>(null)

export function useGovernmentUserChromeContext(): GovernmentUserChromeContextValue {
  const ctx = useContext(GovernmentUserChromeContext)
  if (!ctx) {
    throw new Error('useGovernmentUserChromeContext must be used within GovernmentUserLayout')
  }
  return ctx
}

export function useGovernmentUserChromeContextOptional(): GovernmentUserChromeContextValue | null {
  return useContext(GovernmentUserChromeContext)
}
