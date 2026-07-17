/**
 * 승인 템플릿 UJ_4754 본문 (변수 치환).
 * 본문에 없는 필드(문서명·서명기한·서명URL 등)를 추가하지 않는다.
 * 전자서명토큰은 버튼 URL에만 사용한다.
 */

export const GOVERNMENT_ALIMTALK_APPROVED_TEMPLATE_CODE = 'UJ_4754'

/** Aligo subject_1 — 승인 템플릿명(templtName)과 동일하게 유지 */
export const GOVERNMENT_ALIMTALK_SUBJECT = '전자서명'

/**
 * @param {{
 *   customerName: string,
 *   managerName: string,
 *   managerPhone: string,
 * }} vars
 */
export function buildGovernmentAlimtalkApprovedMessage(vars) {
  const customerName = String(vars.customerName ?? '').trim()
  const managerName = String(vars.managerName ?? '').trim()
  const managerPhone = String(vars.managerPhone ?? '').trim()
  return [
    `${customerName}님, 전자서명을 요청드립니다.`,
    '',
    '아래 버튼을 눌러 문서 내용을 확인하신 후 전자서명을 완료해 주세요.',
    '',
    `요청 담당자: ${managerName}`,
    `문의 연락처: ${managerPhone}`,
    '',
    '본 메시지는 요청하신 업무 처리를 위해 발송되었습니다.',
  ].join('\n')
}

/**
 * @param {Record<string, string>} messageVariables
 */
export function resolveAlimtalkMessageVariables(messageVariables) {
  const v = messageVariables && typeof messageVariables === 'object' ? messageVariables : {}
  return {
    customerName: String(v.customerName ?? '').trim(),
    managerName: String(v.managerName ?? '').trim(),
    managerPhone: String(v.managerPhone ?? '').trim(),
    signToken: String(v.signToken ?? '').trim(),
  }
}
