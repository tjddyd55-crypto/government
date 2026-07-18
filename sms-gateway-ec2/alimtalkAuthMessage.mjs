/**
 * 인증번호 알림톡(UJ_6183) 본문 — 버튼 없음.
 * 승인 template/list 변수명을 varMap 으로 받아 치환한다.
 */

/**
 * @param {{
 *   messageTemplate: string,
 *   varMap: { verificationCode?: string, expiresInMinutes?: string },
 *   messageVariables: { verificationCode?: string, expiresInMinutes?: string },
 * }} p
 */
export function buildAuthAlimtalkMessageBody(p) {
  const varCode = String(p.varMap?.verificationCode ?? '인증번호').trim() || '인증번호'
  const varExpires = String(p.varMap?.expiresInMinutes ?? '유효시간').trim() || '유효시간'
  const code = String(p.messageVariables?.verificationCode ?? '').trim()
  const expires = String(p.messageVariables?.expiresInMinutes ?? '3').trim() || '3'
  let body = String(p.messageTemplate ?? `인증번호는 #{${varCode}} 입니다.\n유효시간: #{${varExpires}}분`)
  body = body.split(`#{${varCode}}`).join(code)
  body = body.split(`#{${varExpires}}`).join(expires)
  return body
}

export const GOVERNMENT_AUTH_ALIMTALK_SUBJECT = '인증번호'
export const GOVERNMENT_AUTH_ALIMTALK_DEFAULT_TEMPLATE = 'UJ_6183'
