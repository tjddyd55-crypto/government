import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchGovernmentAdminUsers } from '../api/governmentAdminUsersApi'
import type { GovernmentAdminUserRow } from '../types/governmentAdminUser.types'

export type GovernmentOperationalAssigneeOption = {
  value: string
  label: string
}

function assigneeLabel(user: GovernmentAdminUserRow): string {
  const name = String(user.displayName ?? user.display_name ?? '').trim()
  const username = String(user.username ?? '').trim()
  if (name && username) return `${name} (@${username})`
  return name || username || String(user.id ?? '')
}

export function useGovernmentOperationalAssigneeOptions(token: string | null) {
  const [users, setUsers] = useState<GovernmentAdminUserRow[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!token?.trim()) {
      setUsers([])
      return
    }
    setLoading(true)
    try {
      const [staff, admins] = await Promise.all([
        fetchGovernmentAdminUsers(token, { role: 'government_staff', status: 'active' }),
        fetchGovernmentAdminUsers(token, { role: 'government_agency_admin', status: 'active' }),
      ])
      const merged = new Map<string, GovernmentAdminUserRow>()
      for (const row of [...staff, ...admins]) {
        const id = String(row.id ?? '')
        if (id) merged.set(id, row)
      }
      setUsers([...merged.values()])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const options = useMemo((): GovernmentOperationalAssigneeOption[] => {
    return users.map((user) => ({
      value: String(user.id),
      label: assigneeLabel(user),
    }))
  }, [users])

  const filterOptions = useMemo(
    (): GovernmentOperationalAssigneeOption[] => [
      { value: '', label: '담당자 전체' },
      { value: 'me', label: '내 담당' },
      { value: 'unassigned', label: '미지정' },
      ...options.map((o) => ({ value: o.value, label: o.label })),
    ],
    [options],
  )

  const assignOptions = useMemo(
    (): GovernmentOperationalAssigneeOption[] => [
      { value: '', label: '미지정' },
      ...options,
    ],
    [options],
  )

  return { options, filterOptions, assignOptions, loading, reload: load }
}

export function formatAssigneeLabel(
  assignedToUserId: string | null | undefined,
  assignedToDisplayName: string | null | undefined,
): string {
  if (!assignedToUserId) return '미지정'
  return assignedToDisplayName?.trim() || '담당자'
}
