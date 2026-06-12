import { describe, expect, it } from 'vitest'
import {
  GOVERNMENT_PROGRESS_STATUS_VALUES,
  getGovernmentProgressStatusLabel,
  normalizeGovernmentProgressStatus,
} from './governmentProgressStatus'

describe('normalizeGovernmentProgressStatus', () => {
  it('returns canonical values unchanged', () => {
    for (const value of GOVERNMENT_PROGRESS_STATUS_VALUES) {
      expect(normalizeGovernmentProgressStatus(value)).toBe(value)
    }
  })

  it('maps legacy insurance-style statuses', () => {
    expect(normalizeGovernmentProgressStatus('상담 접수')).toBe('서류준비중')
    expect(normalizeGovernmentProgressStatus('심사 중')).toBe('심사중')
    expect(normalizeGovernmentProgressStatus('보완 요청')).toBe('서류준비중')
    expect(normalizeGovernmentProgressStatus('승인')).toBe('최종승인')
  })

  it('labels normalized values for display', () => {
    expect(getGovernmentProgressStatusLabel('심사 중')).toBe('심사중')
    expect(getGovernmentProgressStatusLabel('')).toBe('서류준비중')
  })
})
