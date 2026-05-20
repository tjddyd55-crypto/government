/** 정부지원 전자서명 OTP 설정 — 보험 contract OTP env 재사용 (독립 DB·라우트). */
export {
  getContractOtpExpiresSeconds as getGovernmentSignatureOtpExpiresSeconds,
  getContractOtpMaxAttempts as getGovernmentSignatureOtpMaxAttempts,
  getContractOtpMaxSendsPerSession as getGovernmentSignatureOtpMaxSendsPerSession,
  getContractOtpPepper as getGovernmentSignatureOtpPepper,
  getContractOtpResendCooldownSeconds as getGovernmentSignatureOtpResendCooldownSeconds,
  isRunningInProduction,
} from './contractOtpConfig.js'
