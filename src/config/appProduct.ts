/** Vite define — vite.config.ts `__APP_PRODUCT__` 와 동기화 */
declare const __APP_PRODUCT__: string

export type AppProduct = 'insurance' | 'government' | ''

export function resolveAppProduct(): AppProduct {
  const raw = typeof __APP_PRODUCT__ === 'string' ? __APP_PRODUCT__.trim() : ''
  if (raw === 'government') {
    return 'government'
  }
  if (raw === 'insurance') {
    return 'insurance'
  }
  return ''
}

export function isGovernmentProductApp(): boolean {
  return resolveAppProduct() === 'government'
}
