/**
 * 알림톡 relay 인증 (기존 /send-sms 와 독립).
 * @param {import('express').Request} req
 * @param {string} expectedToken
 */
export function verifyAlimtalkRelayAuth(req, expectedToken) {
  if (!expectedToken) {
    return { ok: false, status: 503, error: 'relay_auth_not_configured' }
  }
  const authHeader = String(req.headers.authorization ?? '').trim()
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const headerToken = String(req.headers['x-alimtalk-relay-token'] ?? '').trim()
  const provided = bearer || headerToken
  if (!provided || provided !== expectedToken) {
    return { ok: false, status: 401, error: 'relay_auth_error' }
  }
  return { ok: true }
}
