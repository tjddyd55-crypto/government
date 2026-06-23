import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchGovAdminCustomers } from '../api/governmentAdminCustomersApi'
import { fetchGovCustomerStatusOptions } from '../api/governmentCustomerStatusApi'
import { fetchGovernmentAdminUsers } from '../api/governmentAdminUsersApi'
import { fetchGovAgencies } from '../api/governmentProfilesApi'
import { useGovernmentAccessShared } from '../context/GovernmentAccessContext'
import { canListGovernmentAdminCustomers } from '../lib/governmentAccess'
import type { GovCustomerStatusOption, GovProfileListQuery } from '../types/governmentProfile.types'

export type GovernmentAgencyAdminListFilters = {
  search: string
  customerStatusOptionId: string
  businessType: string
  ownerUserId: string
  tenantId: string
}

const EMPTY_FILTERS: Omit<GovernmentAgencyAdminListFilters, 'tenantId'> & { tenantId: string } = {
  search: '',
  customerStatusOptionId: '',
  businessType: '',
  ownerUserId: '',
  tenantId: '',
}

/**
 * 대행사·업종 관리자 고객 목록 필터 (workspace admin 모드).
 */
export function useGovernmentAgencyAdminListState(token: string | null | undefined) {
  const { summary, loading: accessLoading } = useGovernmentAccessShared(token)
  const allowed = canListGovernmentAdminCustomers(summary)
  const isIndustryScope =
    summary?.isSuperAdmin === true || summary?.isGovernmentIndustryAdmin === true

  const defaultTenantId = useMemo(() => {
    if (!summary) return ''
    if (isIndustryScope) return ''
    const ids = summary.governmentAgencyAdminTenantIds ?? []
    return ids[0] ?? ''
  }, [summary, isIndustryScope])

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusOptions, setStatusOptions] = useState<GovCustomerStatusOption[]>([])
  const [tenantOptions, setTenantOptions] = useState<Array<{ id: string; name: string }>>([])
  const [ownerOptions, setOwnerOptions] = useState<Array<{ id: string; label: string }>>([])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search), 300)
    return () => window.clearTimeout(timer)
  }, [filters.search])

  useEffect(() => {
    if (defaultTenantId && !filters.tenantId) {
      setFilters((prev) => ({ ...prev, tenantId: defaultTenantId }))
    }
  }, [defaultTenantId, filters.tenantId])

  const effectiveTenantId = filters.tenantId || defaultTenantId

  const listQuery = useMemo<GovProfileListQuery>(
    () => ({
      q: debouncedSearch.trim() || undefined,
      customerStatusOptionId: filters.customerStatusOptionId.trim() || undefined,
      businessType: filters.businessType.trim() || undefined,
      ownerUserId: filters.ownerUserId.trim() || undefined,
      tenantId: effectiveTenantId.trim() || undefined,
    }),
    [
      debouncedSearch,
      filters.customerStatusOptionId,
      filters.businessType,
      filters.ownerUserId,
      effectiveTenantId,
    ],
  )

  const loadTenantOptions = useCallback(async () => {
    if (!token || !isIndustryScope) return
    try {
      const agencies = await fetchGovAgencies(token)
      setTenantOptions(agencies.map((row) => ({ id: row.id, name: row.name })))
    } catch {
      setTenantOptions([])
    }
  }, [token, isIndustryScope])

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

  useEffect(() => {
    void loadTenantOptions()
  }, [loadTenantOptions])

  useEffect(() => {
    void loadOwnerOptions()
    void loadStatusOptions()
  }, [loadOwnerOptions, loadStatusOptions])

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }))
  }, [])

  const setCustomerStatusFilter = useCallback((customerStatusOptionId: string) => {
    setFilters((prev) => ({ ...prev, customerStatusOptionId }))
  }, [])

  const setBusinessTypeFilter = useCallback((businessType: string) => {
    setFilters((prev) => ({ ...prev, businessType }))
  }, [])

  const setOwnerUserFilter = useCallback((ownerUserId: string) => {
    setFilters((prev) => ({ ...prev, ownerUserId }))
  }, [])

  const setTenantId = useCallback((tenantId: string) => {
    setFilters((prev) => ({ ...prev, tenantId, ownerUserId: '' }))
  }, [])

  const loadProfiles = useCallback(
    async (authToken: string, query?: GovProfileListQuery) => {
      const result = await fetchGovAdminCustomers(authToken, query)
      return result.rows
    },
    [],
  )

  return {
    allowed,
    accessLoading,
    isIndustryScope,
    filters,
    listQuery,
    effectiveTenantId,
    statusOptions,
    tenantOptions,
    ownerOptions,
    setSearch,
    setCustomerStatusFilter,
    setBusinessTypeFilter,
    setOwnerUserFilter,
    setTenantId,
    loadProfiles,
    reloadStatusOptions: loadStatusOptions,
  }
}
