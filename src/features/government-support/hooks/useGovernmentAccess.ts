import { useCallback, useEffect, useState } from 'react'
import {
  fetchGovernmentAccessSummary,
  type GovernmentAccessSummary,
} from '../api/governmentSupportApi'

function hasGovernmentAccessToken(token?: string | null): boolean {
  return typeof token === 'string' && token.trim() !== ''
}

export function useGovernmentAccess(token?: string | null) {
  const trimmed = typeof token === 'string' ? token.trim() : ''
  const [loading, setLoading] = useState(() => hasGovernmentAccessToken(token))
  const [error, setError] = useState<unknown>(null)
  const [summary, setSummary] = useState<GovernmentAccessSummary | null>(null)

  const load = useCallback(async () => {
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      setSummary(await fetchGovernmentAccessSummary(trimmed))
    } catch (e) {
      setError(e)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [trimmed])

  useEffect(() => {
    if (!trimmed) {
      setSummary(null)
      setError(null)
      setLoading(false)
      return
    }
    void load()
  }, [trimmed, load])

  return { loading, error, summary, reload: load }
}
