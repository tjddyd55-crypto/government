import { describe, expect, it } from 'vitest'
import {
  deliveryOptionClassName,
  shouldShowAlimtalkDryRunInfo,
} from './governmentSignatureSendDeliveryUi'

describe('governmentSignatureSendDeliveryUi', () => {
  it('선택/비선택 class 구분', () => {
    expect(deliveryOptionClassName(false)).toBe('gov-signature-send-delivery__option')
    expect(deliveryOptionClassName(true)).toContain('gov-signature-send-delivery__option--selected')
  })

  it('dry-run info는 카카오 선택 + 플래그일 때만 표시', () => {
    expect(
      shouldShowAlimtalkDryRunInfo({ showDryRunInfo: true, notifyMode: 'kakao_alimtalk' }),
    ).toBe(true)
    expect(
      shouldShowAlimtalkDryRunInfo({ showDryRunInfo: true, notifyMode: 'link_only' }),
    ).toBe(false)
    expect(
      shouldShowAlimtalkDryRunInfo({ showDryRunInfo: false, notifyMode: 'kakao_alimtalk' }),
    ).toBe(false)
    expect(
      shouldShowAlimtalkDryRunInfo({ showDryRunInfo: undefined, notifyMode: 'kakao_alimtalk' }),
    ).toBe(false)
  })
})
