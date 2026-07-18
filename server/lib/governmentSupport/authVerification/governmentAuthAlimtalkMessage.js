/**
 * UJ_6183 본문 변수 치환 (승인 템플릿과 동일한 자리표시자 사용).
 * 인증번호 평문은 로그에 남기지 말 것.
 */

/**
 * @param {{
 *   messageTemplate: string,
 *   varCode: string,
 *   varExpires: string,
 *   code: string,
 *   expiresInMinutes: number,
 * }} p
 */
export function buildGovernmentAuthAlimtalkMessage(p) {
  const code = String(p.code ?? '').trim()
  const minutes = Number(p.expiresInMinutes)
  const expiresLabel = Number.isFinite(minutes) && minutes > 0 ? String(Math.floor(minutes)) : '3'
  const varCode = String(p.varCode ?? '인증번호').trim() || '인증번호'
  const varExpires = String(p.varExpires ?? '유효시간').trim() || '유효시간'
  let body = String(p.messageTemplate ?? '')
  body = body.split(`#{${varCode}}`).join(code)
  body = body.split(`#{${varExpires}}`).join(expiresLabel)
  return body
}

/**
 * EC2 relay / Aligo 에 넘길 내부 변수 (한글 키는 EC2 에서 승인명으로 매핑).
 * @param {{ code: string, expiresInMinutes: number }} p
 */
export function buildGovernmentAuthAlimtalkMessageVariables(p) {
  return {
    verificationCode: String(p.code ?? '').trim(),
    expiresInMinutes: String(
      Number.isFinite(Number(p.expiresInMinutes)) ? Math.floor(Number(p.expiresInMinutes)) : 3,
    ),
  }
}
