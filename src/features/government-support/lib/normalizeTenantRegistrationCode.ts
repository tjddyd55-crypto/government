/** 가입 코드 정규화 — 서버 normalizeTenantRegistrationCodeRaw 와 동일 규칙 */
export function normalizeTenantRegistrationCode(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}
