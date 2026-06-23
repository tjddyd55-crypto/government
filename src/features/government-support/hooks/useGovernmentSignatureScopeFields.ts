import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchGovAgencies } from '../api/governmentProfilesApi'
import type { GovernmentAccessSummary } from '../api/governmentSupportApi'
import { canManageGovernmentUsers } from '../lib/governmentAccess'
import { resolveOperationalScopePayload } from '../lib/governmentOperationalScope'
import type { GovAgencyRow } from '../types/governmentProfile.types'

export type GovernmentSignatureScopeForm = {
  scopeType: 'global' | 'agency'
  tenantId: string
}

export type GovernmentSignatureScopePayload = {
  scopeType: 'global' | 'agency'
  tenantId?: string
}

function normalizeTenantId(value: string | number | null | undefined): string {
  return String(value ?? '').trim()
}

function pickTenantIdForAgencyScope(
  currentTenantId: string,
  optionValues: string[],
  fallbackTenantId: string,
): string {
  const current = normalizeTenantId(currentTenantId)
  if (current && optionValues.includes(current)) {
    return current
  }
  const fallback = normalizeTenantId(fallbackTenantId)
  if (fallback && optionValues.includes(fallback)) {
    return fallback
  }
  return optionValues[0] ?? ''
}

export function useGovernmentSignatureScopeFields(token: string | null | undefined, summary: GovernmentAccessSummary | null) {
  const canPickScope = Boolean(summary?.isSuperAdmin || summary?.isGovernmentIndustryAdmin)
  const defaultTenantId = normalizeTenantId(
    summary?.governmentAgencyAdminTenantIds?.[0] ?? summary?.governmentStaffTenantIds?.[0] ?? '',
  )

  const [agencies, setAgencies] = useState<GovAgencyRow[]>([])
  const [scopeType, setScopeTypeRaw] = useState<'global' | 'agency'>(canPickScope ? 'global' : 'agency')
  const [tenantId, setTenantIdRaw] = useState(defaultTenantId)

  useEffect(() => {
    if (!canPickScope || !token?.trim()) {
      setAgencies([])
      return
    }
    let cancelled = false
    void fetchGovAgencies(token)
      .then((rows) => {
        if (!cancelled) {
          setAgencies(rows)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAgencies([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [canPickScope, token])

  const agencyOptions = useMemo(() => {
    const base = agencies.map((agency) => ({
      value: normalizeTenantId(agency.id),
      label: `${agency.name} (${agency.agencyCode})`,
    }))
    if (canPickScope) {
      return base
    }
    if (canManageGovernmentUsers(summary) || (summary?.governmentStaffTenantIds?.length ?? 0) > 0) {
      return base.filter((option) => {
        const ids = [
          ...(summary?.governmentAgencyAdminTenantIds ?? []),
          ...(summary?.governmentStaffTenantIds ?? []),
        ].map((id) => normalizeTenantId(id))
        return ids.includes(option.value)
      })
    }
    return base
  }, [agencies, canPickScope, summary])

  const optionValues = useMemo(() => agencyOptions.map((option) => option.value), [agencyOptions])

  useEffect(() => {
    if (!canPickScope) {
      setScopeTypeRaw('agency')
      setTenantIdRaw((prev) => pickTenantIdForAgencyScope(prev, optionValues, defaultTenantId))
      return
    }
    if (scopeType === 'agency') {
      setTenantIdRaw((prev) => pickTenantIdForAgencyScope(prev, optionValues, ''))
    }
  }, [canPickScope, defaultTenantId, optionValues, scopeType])

  const setScopeType = useCallback(
    (next: 'global' | 'agency') => {
      setScopeTypeRaw(next)
      if (next === 'global') {
        setTenantIdRaw('')
        return
      }
      setTenantIdRaw((prev) => pickTenantIdForAgencyScope(prev, optionValues, defaultTenantId))
    },
    [defaultTenantId, optionValues],
  )

  const setTenantId = useCallback((next: string) => {
    setTenantIdRaw(normalizeTenantId(next))
  }, [])

  const resolveScopePayload = useCallback((): GovernmentSignatureScopePayload => {
    return resolveOperationalScopePayload(
      { scopeType, tenantId },
      { canPickScope, defaultTenantId },
    )
  }, [canPickScope, defaultTenantId, scopeType, tenantId])

  return {
    canPickScope,
    scopeType,
    tenantId,
    agencyOptions,
    setScopeType,
    setTenantId,
    resolveScopePayload,
  }
}
