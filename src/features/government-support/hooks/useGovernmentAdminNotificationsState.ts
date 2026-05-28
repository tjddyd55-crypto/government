import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../../lib/apiClient'
import {
  fetchGovernmentAdminNotifications,
  markAllGovernmentAdminNotificationsRead,
  markGovernmentAdminNotificationRead,
  type GovernmentAdminNotification,
} from '../api/governmentNotificationsApi'

export type GovernmentAdminNotificationsViewProps = {
  loading: boolean
  error: string
  items: GovernmentAdminNotification[]
  pendingReadId: string | null
  pendingReadAll: boolean
  onReload: () => void
  onRowClick: (item: GovernmentAdminNotification) => void
  onReadAll: () => void
}

export function useGovernmentAdminNotificationsState(
  token: string | null,
  navigate: (path: string) => void,
): GovernmentAdminNotificationsViewProps {
  const [items, setItems] = useState<GovernmentAdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingReadId, setPendingReadId] = useState<string | null>(null)
  const [pendingReadAll, setPendingReadAll] = useState(false)

  const load = useCallback(async () => {
    if (!token?.trim()) {
      setItems([])
      setLoading(false)
      return
    }
    setError('')
    setLoading(true)
    try {
      const notifications = await fetchGovernmentAdminNotifications(token, 50)
      setItems(notifications)
    } catch (e) {
      setItems([])
      setError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : '알림을 불러오지 못했습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const onRowClick = useCallback(
    async (item: GovernmentAdminNotification) => {
      if (!token || pendingReadId) return
      setPendingReadId(item.id)
      try {
        if (!item.isRead) {
          await markGovernmentAdminNotificationRead(token, item.id)
          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, isRead: true } : x)))
        }
        const url = item.targetUrl?.trim()
        if (url) {
          navigate(url)
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : '읽음 처리에 실패했습니다.')
      } finally {
        setPendingReadId(null)
      }
    },
    [token, pendingReadId, navigate],
  )

  const onReadAll = useCallback(async () => {
    if (!token || pendingReadAll) return
    setPendingReadAll(true)
    try {
      await markAllGovernmentAdminNotificationsRead(token)
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })))
      setError('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '전체 읽음 처리에 실패했습니다.')
    } finally {
      setPendingReadAll(false)
    }
  }, [token, pendingReadAll])

  return {
    loading,
    error,
    items,
    pendingReadId,
    pendingReadAll,
    onReload: load,
    onRowClick,
    onReadAll,
  }
}

export function formatGovNotificationDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR')
}
