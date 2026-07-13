/**
 * EC2 알림톡 relay HTTP 클라이언트 (기존 smsService 와 분리).
 */

/**
 * @param {{
 *   relayUrl: string,
 *   relayAuthToken: string,
 *   relayTimeoutMs: number,
 *   payload: Record<string, unknown>,
 * }} p
 */
export async function postGovernmentSignatureAlimtalkRelay(p) {
  const { relayUrl, relayAuthToken, relayTimeoutMs, payload } = p
  if (!relayUrl) {
    return {
      ok: false,
      status: 'failed',
      errorCategory: 'network_error',
      providerMessage: 'relay URL not configured',
      retryable: false,
    }
  }
  if (!relayAuthToken) {
    return {
      ok: false,
      status: 'failed',
      errorCategory: 'relay_auth_error',
      providerMessage: 'relay auth token not configured',
      retryable: false,
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), relayTimeoutMs)
  const requestedAt = new Date().toISOString()

  try {
    const res = await fetch(relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${relayAuthToken}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timer)
    const text = await res.text()
    let data = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { providerMessage: text.slice(0, 500) }
    }

    if (res.status === 401 || data?.errorCategory === 'relay_auth_error') {
      return {
        ok: false,
        status: 'failed',
        errorCategory: 'relay_auth_error',
        providerMessage: String(data?.providerMessage ?? 'relay auth failed'),
        retryable: false,
        requestedAt,
        failedAt: new Date().toISOString(),
        raw: data,
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        status: 'failed',
        errorCategory: String(data?.errorCategory ?? 'provider_rejected'),
        providerMessage: String(data?.providerMessage ?? `relay HTTP ${res.status}`),
        providerCode: data?.providerCode != null ? String(data.providerCode) : null,
        retryable: Boolean(data?.retryable),
        requestedAt,
        failedAt: new Date().toISOString(),
        raw: data,
      }
    }

    return {
      ok: Boolean(data?.ok),
      status: data?.status === 'sent' ? 'sent' : data?.status === 'skipped' ? 'skipped' : 'failed',
      provider: 'aligo',
      channel: 'kakao_alimtalk',
      providerMessageId: data?.providerMessageId != null ? String(data.providerMessageId) : null,
      providerCode: data?.providerCode != null ? String(data.providerCode) : null,
      providerMessage: data?.providerMessage != null ? String(data.providerMessage) : null,
      errorCategory: data?.errorCategory != null ? String(data.errorCategory) : null,
      retryable: Boolean(data?.retryable),
      dryRun: Boolean(data?.dryRun),
      requestedAt: data?.requestedAt ?? requestedAt,
      sentAt: data?.sentAt ?? null,
      failedAt: data?.failedAt ?? null,
      raw: data,
    }
  } catch (err) {
    clearTimeout(timer)
    const isTimeout = err?.name === 'AbortError'
    return {
      ok: false,
      status: 'failed',
      errorCategory: isTimeout ? 'provider_timeout' : 'network_error',
      providerMessage: isTimeout ? 'relay timeout' : 'relay network error',
      retryable: true,
      requestedAt,
      failedAt: new Date().toISOString(),
    }
  }
}
