/**
 * 프로필 하위 리소스 접근 시 owner_user_id 기준 검증용 조회.
 * @module governmentProfileAccessHelpers
 */

/**
 * @param {import('pg').Pool | { query: Function }} pool
 * @param {string} profileId
 */
export async function loadGovernmentProfileAccessRow(pool, profileId) {
  const r = await pool.query(
    `SELECT tenant_id, owner_user_id FROM gov_support_profiles WHERE id = $1::bigint LIMIT 1`,
    [profileId],
  )
  return r.rows[0] ?? null
}

/**
 * @param {import('pg').Pool | { query: Function }} pool
 * @param {string} priorLoanId
 */
export async function loadProfileAccessRowByPriorLoanId(pool, priorLoanId) {
  const r = await pool.query(
    `
    SELECT p.tenant_id, p.owner_user_id
    FROM gov_support_prior_loans l
    INNER JOIN gov_support_profiles p ON p.id = l.profile_id
    WHERE l.id = $1::bigint
    LIMIT 1
    `,
    [priorLoanId],
  )
  return r.rows[0] ?? null
}

/**
 * @param {import('pg').Pool | { query: Function }} pool
 * @param {string} caseId
 */
export async function loadProfileAccessRowByApplicationCaseId(pool, caseId) {
  const r = await pool.query(
    `
    SELECT p.tenant_id, p.owner_user_id
    FROM gov_support_application_cases c
    INNER JOIN gov_support_profiles p ON p.id = c.profile_id
    WHERE c.id = $1::bigint
    LIMIT 1
    `,
    [caseId],
  )
  return r.rows[0] ?? null
}

/**
 * @param {import('pg').Pool | { query: Function }} pool
 * @param {string} docId
 */
export async function loadProfileAccessRowByDocumentId(pool, docId) {
  const r = await pool.query(
    `
    SELECT p.tenant_id, p.owner_user_id
    FROM gov_support_document_items d
    INNER JOIN gov_support_profiles p ON p.id = d.profile_id
    WHERE d.id = $1::bigint
    LIMIT 1
    `,
    [docId],
  )
  return r.rows[0] ?? null
}
