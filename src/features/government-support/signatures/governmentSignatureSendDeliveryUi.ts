import type { GovernmentSignatureCustomerNotifyMode } from './governmentSignatureAlimtalkTypes'

export const GOV_SIGNATURE_DRY_RUN_INFO_MESSAGE =
  '현재 테스트 모드입니다. 전자서명 요청과 발송 기록은 생성되지만 실제 알림톡은 전송되지 않습니다.'

export function deliveryOptionClassName(selected: boolean): string {
  return [
    'gov-signature-send-delivery__option',
    selected ? 'gov-signature-send-delivery__option--selected' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function shouldShowAlimtalkDryRunInfo(input: {
  showDryRunInfo?: boolean
  notifyMode: GovernmentSignatureCustomerNotifyMode
}): boolean {
  return Boolean(input.showDryRunInfo) && input.notifyMode === 'kakao_alimtalk'
}
