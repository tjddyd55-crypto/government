import { useEffect, useMemo, useState } from 'react'
import { fetchGovAgencies } from '../api/governmentProfilesApi'
import type { GovernmentAccessSummary } from '../api/governmentSupportApi'
import { canManageGovernmentUsers } from '../lib/governmentAccess'
import { resolveOperationalScopePayload } from '../lib/governmentOperationalScope'
import type { GovAgencyRow } from '../types/governmentProfile.types'

export type GovernmentSignatureScopeForm = {
  scopeType: string
  tenantId: string
}

export type GovernmentSignatureScopePayload = {
  scopeType: 'global' | 'agency'
  tenantId?: string
}

export function useGovernmentSignatureScopeFields(token: string | null | undefined, summary: GovernmentAccessSummary | null) {
  const canPickScope = Boolean(summary?.isSuperAdmin || summary?.isGovernmentIndustryAdmin)
  const defaultTenantId =
    summary?.governmentAgencyAdminTenantIds[0] ?? summary?.governmentStaffTenantIds[0] ?? ''

  const [agencies, setAgencies] = useState<GovAgencyRow[]>([])
  const [scopeType, setScopeType] = useState<'global' | 'agency'>(canPickScope ? 'global' : 'agency')
  const [tenantId, setTenantId] = useState(defaultTenantId)

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

  useEffect(() => {
    if (!canPickScope) {
      setScopeType('agency')
      setTenantId(defaultTenantId)
    }
  }, [canPickScope, defaultTenantId])

  const agencyOptions = useMemo(() => {
    const base = agencies.map((agency) => ({
      value: agency.id,
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
        ]
        return ids.includes(option.value)
      })
    }
    return base
  }, [agencies, canPickScope, summary])

  const resolveScopePayload = (): GovernmentSignatureScopePayload => {
    return resolveOperationalScopePayload(
      { scopeType, tenantId },
      { canPickScope, defaultTenantId },
    )
  }

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
