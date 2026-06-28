/** URL path segment for in-progress profile creation (not a persisted profile id). */
export const GOVERNMENT_PROFILE_CREATE_SEGMENT = 'new'

export function isGovernmentProfileCreateSegment(id: string | null | undefined): boolean {
  return String(id ?? '').trim().toLowerCase() === GOVERNMENT_PROFILE_CREATE_SEGMENT
}

/** Saved profiles only — excludes in-progress create route segment. */
export function isPersistedGovProfileListItem(id: string | null | undefined): boolean {
  const normalized = String(id ?? '').trim()
  return normalized !== '' && !isGovernmentProfileCreateSegment(normalized)
}
