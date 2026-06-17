import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchGovAdminCustomers } from '../api/governmentAdminCustomersApi'
import { fetchGovCustomerStatusOptions } from '../api/governmentCustomerStatusApi'
import { fetchGovernmentAdminUsers } from '../api/governmentAdminUsersApi'
import { fetchGovAgencies } from '../api/governmentProfilesApi'
import { patchGovProfileCustomerStatus } from '../api/governmentProfilesApi'
import { useGovernmentAccessContext } from '../context/GovernmentAccessContext'
import { canListGovernmentAdminCustomers } from '../lib/governmentAccess'
import { collectGovernmentBusinessTypeOptions } from '../lib/governmentCustomerListDisplay'
import { mapGovernmentAdminApiError } from '../lib/mapGovernmentAdminApiError'
import type {
  GovAdminCustomerSummary,
  GovCustomerStatusOption,
  GovSupportProfile,
} from '../types/governmentProfile.types'

export type GovernmentAdminCustomersViewProps = {
  allowed: boolean
  accessLoading: boolean
  isIndustryScope: boolean
  tenantId: string
  tenantOptions: Array<{ id: string; name: string }>
  search: string
  customerStatusFilter: string
  businessTypeFilter: string
  ownerUserFilter: string
  rows: GovSupportProfile[]
  summary: GovAdminCustomerSummary | null
  statusOptions: GovCustomerStatusOption[]
  businessTypeOptions: string[]
  ownerOptions: Array<{ id: string; label: string }>
  loading: boolean
  error: string | null
  feedback: string | null
  setTenantId: (value: string) => void
  setSearch: (value: string) => void
  setCustomerStatusFilter: (value: string) => void
  setBusinessTypeFilter: (value: string) => void
  setOwnerUserFilter: (value: string) => void
  onStatusChange: (profileId: string, optionId: string | null) => Promise<void>
  reload: () => Promise<void>
}

export function useGovernmentAdminCustomersState(
  token: string | null | undefined,
): GovernmentAdminCustomersViewProps {
  const { summary, loading: accessLoading } = useGovernmentAccessContext()
  const allowed = canListGovernmentAdminCustomers(summary)
  const isIndustryScope =
    summary?.isSuperAdmin === true || summary?.isGovernmentIndustryAdmin === true

  const defaultTenantId = useMemo(() => {
    if (!summary) return ''
    if (isIndustryScope) return ''
    const ids = summary.governmentAgencyAdminTenantIds ?? []
    return ids[0] ?? ''
  }, [summary, isIndustryScope])

  const [tenantId, setTenantId] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [customerStatusFilter, setCustomerStatusFilter] = useState('')
  const [businessTypeFilter, setBusinessTypeFilter] = useState('')
  const [ownerUserFilter, setOwnerUserFilter] = useState('')
  const [rows, setRows] = useState<GovSupportProfile[]>([])
  const [summaryData, setSummaryData] = useState<GovAdminCustomerSummary | null>(null)
  const [statusOptions, setStatusOptions] = useState<GovCustomerStatusOption[]>([])
  const [tenantOptions, setTenantOptions] = useState<Array<{ id: string; name: string }>>([])
  const [ownerOptions, setOwnerOptions] = useState<Array<{ id: string; label: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (defaultTenantId && !tenantId) {
      setTenantId(defaultTenantId)
    }
  }, [defaultTenantId, tenantId])

  const effectiveTenantId = tenantId || defaultTenantId

  const listQuery = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,
      customerStatusOptionId: customerStatusFilter.trim() || undefined,
      businessType: businessTypeFilter.trim() || undefined,
      ownerUserId: ownerUserFilter.trim() || undefined,
      tenantId: effectiveTenantId.trim() || undefined,
    }),
    [
      debouncedSearch,
      customerStatusFilter,
      businessTypeFilter,
      ownerUserFilter,
      effectiveTenantId,
    ],
  )

  const businessTypeOptions = useMemo(
    () => collectGovernmentBusinessTypeOptions(rows),
    [rows],
  )

  const loadTenantOptions = useCallback(async () => {
    if (!token || !isIndustryScope) return
    try {
      const agencies = await fetchGovAgencies(token)
      const options = agencies.map((row) => ({ id: row.id, name: row.name }))
      setTenantOptions(options)
      if (options.length > 0 && !tenantId) {
        setTenantId(options[0].id)
      }
    } catch {
      setTenantOptions([])
    }
  }, [token, isIndustryScope, tenantId])

  const loadOwnerOptions = useCallback(async () => {
    if (!token || !effectiveTenantId) {
      setOwnerOptions([])
      return
    }
    try {
      const users = await fetchGovernmentAdminUsers(token, {
        role: 'government_user',
        tenantId: effectiveTenantId,
      })
      setOwnerOptions(
        users.map((row) => ({
          id: row.id,
          label: row.displayName?.trim() || row.username?.trim() || row.id,
        })),
      )
    } catch {
      setOwnerOptions([])
    }
  }, [token, effectiveTenantId])

  const loadStatusOptions = useCallback(async () => {
    if (!token || !effectiveTenantId) {
      setStatusOptions([])
      return
    }
    try {
      setStatusOptions(await fetchGovCustomerStatusOptions(token, effectiveTenantId))
    } catch {
      setStatusOptions([])
    }
  }, [token, effectiveTenantId])

  const load = useCallback(async () => {
    if (!token || !allowed) {
      setLoading(false)
      return
    }
    if (!effectiveTenantId) {
      setRows([])
      setSummaryData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await fetchGovAdminCustomers(token, listQuery)
      setRows(result.rows)
      setSummaryData(result.summary)
    } catch (e) {
      setError(mapGovernmentAdminApiError(e, '고객 목록을 불러오지 못했습니다.'))
      setRows([])
      setSummaryData(null)
    } finally {
      setLoading(false)
    }
  }, [token, allowed, effectiveTenantId, listQuery])

  useEffect(() => {
    void loadTenantOptions()
  }, [loadTenantOptions])

  useEffect(() => {
    void loadOwnerOptions()
    void loadStatusOptions()
  }, [loadOwnerOptions, loadStatusOptions])

  useEffect(() => {
    void load()
  }, [load])

  const onStatusChange = useCallback(
    async (profileId: string, optionId: string | null) => {
      if (!token) return
      setFeedback(null)
      try {
        const next = await patchGovProfileCustomerStatus(token, profileId, optionId)
        setRows((prev) => prev.map((row) => (row.id === next.id ? next : row)))
        setFeedback('고객상태를 저장했습니다.')
        await load()
      } catch (e) {
        setError(mapGovernmentAdminApiError(e, '고객상태 저장에 실패했습니다.'))
      }
    },
    [token, load],
  )

  return {
    allowed,
    accessLoading,
    isIndustryScope,
    tenantId: effectiveTenantId,
    tenantOptions,
    search,
    customerStatusFilter,
    businessTypeFilter,
    ownerUserFilter,
    rows,
    summary: summaryData,
    statusOptions,
    businessTypeOptions,
    ownerOptions,
    loading,
    error,
    feedback,
    setTenantId,
    setSearch,
    setCustomerStatusFilter,
    setBusinessTypeFilter,
    setOwnerUserFilter,
    onStatusChange,
    reload: load,
  }
}
