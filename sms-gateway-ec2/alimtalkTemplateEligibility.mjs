/**
 * Aligo 카카오 알림톡 템플릿 발송 가능 여부.
 *
 * 관리자 화면(승인완료/정상)과 공식 list 예시(APR+R)를 반영한 규칙:
 * - inspStatus=APR + status=A → 허용
 * - inspStatus=APR + status=R → 허용
 * - status=S → 차단
 * - inspStatus=REG|REQ|REJ → 차단
 * - 템플릿 미조회 → 차단
 */

/**
 * @param {{
 *   found?: boolean,
 *   inspStatus?: string | null,
 *   status?: string | null,
 * }} p
 * @returns {{
 *   ok: boolean,
 *   reason: string | null,
 *   inspStatus: string | null,
 *   status: string | null,
 * }}
 */
export function evaluateAlimtalkTemplateSendEligibility(p) {
  const found = Boolean(p?.found)
  const inspStatus = p?.inspStatus != null ? String(p.inspStatus).trim().toUpperCase() : null
  const status = p?.status != null ? String(p.status).trim().toUpperCase() : null

  if (!found) {
    return { ok: false, reason: 'template_not_found', inspStatus, status }
  }
  if (status === 'S') {
    return { ok: false, reason: 'template_stopped', inspStatus, status }
  }
  if (inspStatus === 'REG' || inspStatus === 'REQ' || inspStatus === 'REJ') {
    return { ok: false, reason: 'template_not_approved', inspStatus, status }
  }
  if (inspStatus === 'APR' && (status === 'A' || status === 'R')) {
    return { ok: true, reason: null, inspStatus, status }
  }
  if (inspStatus !== 'APR') {
    return { ok: false, reason: 'template_insp_not_apr', inspStatus, status }
  }
  return { ok: false, reason: 'template_status_not_sendable', inspStatus, status }
}
