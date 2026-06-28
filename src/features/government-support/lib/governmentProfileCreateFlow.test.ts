import { describe, expect, it } from 'vitest'
import {
  GOVERNMENT_PROFILE_CREATE_SEGMENT,
  isGovernmentProfileCreateSegment,
  isPersistedGovProfileListItem,
} from './governmentProfileCreateFlow'

describe('governmentProfileCreateFlow', () => {
  it('detects create-route segment', () => {
    expect(isGovernmentProfileCreateSegment('new')).toBe(true)
    expect(isGovernmentProfileCreateSegment('NEW')).toBe(true)
    expect(isGovernmentProfileCreateSegment('abc-123')).toBe(false)
  })

  it('excludes create segment from persisted list items', () => {
    expect(isPersistedGovProfileListItem(GOVERNMENT_PROFILE_CREATE_SEGMENT)).toBe(false)
    expect(isPersistedGovProfileListItem('profile-1')).toBe(true)
    expect(isPersistedGovProfileListItem('')).toBe(false)
  })
})
