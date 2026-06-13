export function labelForOperationalScope(row: {
  scopeType: string
  tenantName?: string | null
}): string {
  if (row.scopeType === 'global') return '전체'
  if (row.tenantName?.trim()) return row.tenantName
  return '대행사'
}

export function resolveOperationalScopePayload(
  form: { scopeType: string; tenantId: string },
  options: { canPickScope: boolean; defaultTenantId: string },
): { scopeType: 'global' | 'agency'; tenantId?: string } {
  if (options.canPickScope) {
    if (form.scopeType === 'global') {
      return { scopeType: 'global' }
    }
    const tenantId = form.tenantId.trim()
    if (!tenantId) {
      throw new Error('대행사를 선택해 주세요.')
    }
    return { scopeType: 'agency', tenantId }
  }
  const tenantId = form.tenantId.trim() || options.defaultTenantId
  if (!tenantId) {
    throw new Error('대행사 정보가 없습니다.')
  }
  return { scopeType: 'agency', tenantId }
}
