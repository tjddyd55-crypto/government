/**
 * SMS 인증번호 debugCode API 노출 여부 (develop·테스트 채널 전용).
 * @param {boolean} runningInProduction
 */
import { isAligoTestModeOn } from './smsDeliveryMode.js'
export function isGovernmentRailwayDevelop() {
  const isGovApp = String(process.env.APP_PRODUCT ?? '').trim() === 'government'
  const railwayEnv = String(process.env.RAILWAY_ENVIRONMENT ?? '').trim().toLowerCase()
  return isGovApp && railwayEnv === 'develop'
}

export function exposeSmsDebugCode(runningInProduction) {
  const isGovApp = String(process.env.APP_PRODUCT ?? '').trim() === 'government'
  const railwayEnv = String(process.env.RAILWAY_ENVIRONMENT ?? '').trim().toLowerCase()
  if (isGovApp && railwayEnv === 'develop' && isAligoTestModeOn()) {
    return true
  }
  return (
    !runningInProduction &&
    String(process.env.INSURANCE_SMS_DEBUG_RESPONSE_CODE ?? '').trim() === 'true'
  )
}
