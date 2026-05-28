import { apiRequest } from '../../../lib/apiClient'

export type GovernmentAdminNotification = {
  id: string
  tenantId: string
  recipientUserId: string | null
  actorUserId: string | null
  ownerUserId: string | null
  profileId: string | null
  eventType: string
  title: string
  message: string
  targetType: string
  targetId: string
  targetUrl: string
  isRead: boolean
  readAt: string | null
  createdAt: string
}

function unwrapNotifications(raw: unknown): GovernmentAdminNotification[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as Record<string, unknown>
  const list = Array.isArray(o.notifications) ? o.notifications : []
  return list as GovernmentAdminNotification[]
}

export async function fetchGovernmentAdminNotifications(
  token: string,
  limit = 20,
): Promise<GovernmentAdminNotification[]> {
  const raw = await apiRequest<unknown>(`/government-support/admin/notifications?limit=${limit}`, { token })
  return unwrapNotifications(raw)
}

export async function fetchGovernmentAdminNotificationsUnreadCount(token: string): Promise<number> {
  const raw = await apiRequest<{ count?: number; success?: boolean }>(
    '/government-support/admin/notifications/unread-count',
    { token },
  )
  return Number(raw?.count ?? 0)
}

export async function markGovernmentAdminNotificationRead(token: string, notificationId: string): Promise<void> {
  await apiRequest(`/government-support/admin/notifications/${encodeURIComponent(notificationId)}/read`, {
    token,
    method: 'PATCH',
  })
}

export async function markAllGovernmentAdminNotificationsRead(token: string): Promise<void> {
  await apiRequest('/government-support/admin/notifications/read-all', {
    token,
    method: 'PATCH',
  })
}
