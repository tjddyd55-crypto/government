/**
 * API fetch 공통 헤더 — FormData 업로드 시 Content-Type 을 제거해 브라우저가 boundary 를 설정한다.
 * @param {{ token?: string | null, headers?: HeadersInit, body?: BodyInit | null }} options
 * @returns {Record<string, string>}
 */
export function buildApiRequestHeaders(options) {
  const bearer =
    typeof options.token === 'string' && options.token.trim() ? `Bearer ${options.token.trim()}` : ''
  const merged = {}
  if (bearer) {
    merged.Authorization = bearer
  }
  if (options.headers) {
    const headerBag = new Headers(options.headers)
    headerBag.forEach((value, key) => {
      merged[key] = value
    })
  }
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (isFormData) {
    delete merged['Content-Type']
    delete merged['content-type']
  } else if (!merged['Content-Type'] && !merged['content-type']) {
    merged['Content-Type'] = 'application/json'
  }
  return merged
}
