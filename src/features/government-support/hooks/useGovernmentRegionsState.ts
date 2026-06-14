import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchGovProfiles } from '../api/governmentProfilesApi'
import type { GovSupportProfile } from '../types/governmentProfile.types'
import {
  collectGovernmentRegionFilterOptions,
  computeGovernmentRegionSummary,
  filterGovernmentProfilesByRegion,
  getGovernmentProfileAddress,
  groupGovernmentProfilesByRegion,
  parseGovernmentRegionFromAddress,
  type GovernmentRegionFilters,
  type GovernmentRegionGroup,
  type GovernmentRegionSortMode,
} from '../utils/governmentAddressRegionUtils'

export const DEFAULT_GOVERNMENT_REGION_FILTERS: GovernmentRegionFilters = {
  searchQuery: '',
  sido: '',
  sigungu: '',
  eupmyeondong: '',
  progressStatus: '',
  docStatus: '',
  sort: 'region',
}

export type GovernmentRegionsViewProps = {
  loading: boolean
  error: string | null
  profiles: GovSupportProfile[]
  filteredProfiles: GovSupportProfile[]
  groups: GovernmentRegionGroup[]
  summary: ReturnType<typeof computeGovernmentRegionSummary>
  filters: GovernmentRegionFilters
  selectedGroupKey: string | null
  filterOptions: ReturnType<typeof collectGovernmentRegionFilterOptions>
  sigunguOptions: string[]
  eupmyeondongOptions: string[]
  visibleProfiles: GovSupportProfile[]
  onSetSearchQuery: (value: string) => void
  onSetSido: (value: string) => void
  onSetSigungu: (value: string) => void
  onSetEupmyeondong: (value: string) => void
  onSetProgressStatus: (value: string) => void
  onSetDocStatus: (value: string) => void
  onSetSort: (value: GovernmentRegionSortMode) => void
  onSelectGroup: (groupKey: string | null) => void
  onResetFilters: () => void
  reload: () => void
}

export function useGovernmentRegionsState(token: string | null | undefined): GovernmentRegionsViewProps {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<GovSupportProfile[]>([])
  const [filters, setFilters] = useState<GovernmentRegionFilters>(DEFAULT_GOVERNMENT_REGION_FILTERS)
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!token?.trim()) {
      setProfiles([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchGovProfiles(token)
      setProfiles(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : '사업장 목록을 불러오지 못했습니다.')
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void reload()
  }, [reload])

  const filteredProfiles = useMemo(
    () => filterGovernmentProfilesByRegion(profiles, filters),
    [profiles, filters],
  )

  const groups = useMemo(() => groupGovernmentProfilesByRegion(filteredProfiles), [filteredProfiles])

  useEffect(() => {
    if (groups.length === 0) {
      setSelectedGroupKey(null)
      return
    }
    if (!selectedGroupKey || !groups.some((group) => group.key === selectedGroupKey)) {
      setSelectedGroupKey(groups[0]?.key ?? null)
    }
  }, [groups, selectedGroupKey])

  const filterOptions = useMemo(() => collectGovernmentRegionFilterOptions(profiles), [profiles])

  const sigunguOptions = useMemo(() => {
    if (!filters.sido) return []
    return [...(filterOptions.sigunguBySido.get(filters.sido) ?? [])].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [filterOptions.sigunguBySido, filters.sido])

  const eupmyeondongOptions = useMemo(() => {
    if (!filters.sido || !filters.sigungu) return []
    const key = `${filters.sido}|${filters.sigungu}`
    return [...(filterOptions.eupBySigungu.get(key) ?? [])].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [filterOptions.eupBySigungu, filters.sido, filters.sigungu])

  const visibleProfiles = useMemo(() => {
    if (!selectedGroupKey) return filteredProfiles
    return filteredProfiles.filter((profile) => {
      const parsed = parseGovernmentRegionFromAddress(getGovernmentProfileAddress(profile))
      return parsed.groupKey === selectedGroupKey
    })
  }, [filteredProfiles, selectedGroupKey])

  const summary = useMemo(
    () => computeGovernmentRegionSummary(profiles, visibleProfiles.length),
    [profiles, visibleProfiles.length],
  )

  const onSetSearchQuery = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: value }))
  }, [])

  const onSetSido = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, sido: value, sigungu: '', eupmyeondong: '' }))
  }, [])

  const onSetSigungu = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, sigungu: value, eupmyeondong: '' }))
  }, [])

  const onSetEupmyeondong = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, eupmyeondong: value }))
  }, [])

  const onSetProgressStatus = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, progressStatus: value }))
  }, [])

  const onSetDocStatus = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, docStatus: value }))
  }, [])

  const onSetSort = useCallback((value: GovernmentRegionSortMode) => {
    setFilters((prev) => ({ ...prev, sort: value }))
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_GOVERNMENT_REGION_FILTERS)
  }, [])

  return {
    loading,
    error,
    profiles,
    filteredProfiles,
    groups,
    summary,
    filters,
    selectedGroupKey,
    filterOptions,
    sigunguOptions,
    eupmyeondongOptions,
    visibleProfiles,
    onSetSearchQuery,
    onSetSido,
    onSetSigungu,
    onSetEupmyeondong,
    onSetProgressStatus,
    onSetDocStatus,
    onSetSort,
    onSelectGroup: setSelectedGroupKey,
    onResetFilters,
    reload,
  }
}
