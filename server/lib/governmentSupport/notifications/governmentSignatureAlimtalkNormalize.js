/**
 * EC2 relay 응답 → CRM notification status 정규화 (dry-run ≠ sent).
 *
 * SSOT:
 * - EC2 dry-run은 status=skipped + dryRun=true 를 반환해야 한다.
 * - CRM은 dryRun=true(또는 providerCode=DRY_RUN) 이면서 status=sent 가 와도 skipped 로 방어 정규화한다.
 */

/**
 * @param {{
 *   ok?: boolean,
 *   status?: string | null,
 *   dryRun?: boolean,
 *   providerCode?: string | null,
 *   errorCategory?: string | null,
 * } | null | undefined} relayResult
 * @param {{ dryRun?: boolean } | null | undefined} [config]
 */
export function normalizeGovernmentAlimtalkRelayOutcome(relayResult, config) {
  const dryRun =
    Boolean(relayResult?.dryRun) ||
    Boolean(config?.dryRun) ||
    String(relayResult?.providerCode ?? '').trim() === 'DRY_RUN'

  if (!relayResult?.ok) {
    return {
      ok: false,
      status: /** @type {'failed'} */ ('failed'),
      dryRun,
      recordSentAt: false,
      errorCategory: relayResult?.errorCategory ?? 'unknown',
    }
  }

  if (dryRun) {
    return {
      ok: true,
      status: /** @type {'skipped'} */ ('skipped'),
      dryRun: true,
      recordSentAt: false,
      errorCategory: null,
    }
  }

  if (relayResult.status === 'skipped') {
    return {
      ok: true,
      status: /** @type {'skipped'} */ ('skipped'),
      dryRun: false,
      recordSentAt: false,
      errorCategory: relayResult.errorCategory ?? null,
    }
  }

  if (relayResult.status === 'sent') {
    return {
      ok: true,
      status: /** @type {'sent'} */ ('sent'),
      dryRun: false,
      recordSentAt: true,
      errorCategory: null,
    }
  }

  return {
    ok: false,
    status: /** @type {'failed'} */ ('failed'),
    dryRun: false,
    recordSentAt: false,
    errorCategory: relayResult.errorCategory ?? 'unknown',
  }
}
