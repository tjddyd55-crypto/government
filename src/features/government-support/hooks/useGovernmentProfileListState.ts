import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchGovCustomerStatusOptions } from '../api/governmentCustomerStatusApi'
import { patchGovProfileCustomerStatus } from '../api/governmentProfilesApi'
import type { GovCustomerStatusOption, GovProfileListQuery } from '../types/governmentProfile.types'

export type GovernmentProfileListFilters = {
  search: string
  customerStatusOptionId: string
  businessType: string
}

const EMPTY_FILTERS: GovernmentProfileListFilters = {
  search: '',
  customerStatusOptionId: '',
  businessType: '',
}

/**
 * 고객 목록 검색·필터·고객상태 옵션 (PC/Mobile 공유).
 */
export function useGovernmentProfileListState(token: string | null, tenantId: string | null) {
  const [filters, setFilters] = useState<GovernmentProfileListFilters>(EMPTY_FILTERS)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusOptions, setStatusOptions] = useState<GovCustomerStatusOption[]>([])
  const [statusOptionsLoading, setStatusOptionsLoading] = useState(false)

  const listQuery = useMemo<GovProfileListQuery>(
    () => ({
      q: debouncedSearch.trim() || undefined,
      customerStatusOptionId: filters.customerStatusOptionId.trim() || undefined,
      businessType: filters.businessType.trim() || undefined,
    }),
    [debouncedSearch, filters.customerStatusOptionId, filters.businessType],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search), 300)
    return () => window.clearTimeout(timer)
  }, [filters.search])

  const loadStatusOptions = useCallback(async () => {
    if (!token || !tenantId) {
      setStatusOptions([])
      return
    }
    setStatusOptionsLoading(true)
    try {
      const rows = await fetchGovCustomerStatusOptions(token, tenantId)
      setStatusOptions(rows)
    } catch {
      setStatusOptions([])
    } finally {
      setStatusOptionsLoading(false)
    }
  }, [token, tenantId])

  useEffect(() => {
    void loadStatusOptions()
  }, [loadStatusOptions])

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }))
  }, [])

  const setCustomerStatusFilter = useCallback((customerStatusOptionId: string) => {
    setFilters((prev) => ({ ...prev, customerStatusOptionId }))
  }, [])

  const setBusinessTypeFilter = useCallback((businessType: string) => {
    setFilters((prev) => ({ ...prev, businessType }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
  }, [])

  const updateCustomerStatus = useCallback(
    async (profileId: string, customerStatusOptionId: string | null) => {
      if (!token) return null
      return patchGovProfileCustomerStatus(token, profileId, customerStatusOptionId)
    },
    [token],
  )

  return {
    filters,
    listQuery,
    statusOptions,
    statusOptionsLoading,
    setSearch,
    setCustomerStatusFilter,
    setBusinessTypeFilter,
    resetFilters,
    updateCustomerStatus,
    reloadStatusOptions: loadStatusOptions,
  }
}
