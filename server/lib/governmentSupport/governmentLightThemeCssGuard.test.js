import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function readCss(rel) {
  return readFileSync(resolve(repoRoot, rel), 'utf8')
}

test('government light theme SSOT defines loading/input/disabled tokens', () => {
  const css = readCss('src/features/government-support/government-ui-theme.css')
  for (const token of [
    '--government-bg-page',
    '--government-input-bg',
    '--government-loading-bg',
    '--government-disabled-bg',
    '--government-hover-bg',
    '--dashboard-empty-bg',
  ]) {
    assert.ok(css.includes(token), `missing ${token}`)
  }
  assert.match(css, /\.dashboard-empty/)
  assert.match(css, /color-scheme:\s*light/)
})

test('government workspace overrides insurance recent dark surface', () => {
  const css = readCss('src/features/government-support/government-support.css')
  assert.match(css, /\.government-profile-workspace\s+\.customer-workspace-recent\b/)
  assert.ok(css.includes('.customer-workspace-recent__empty'))
  const recentBlock =
    css.match(
      /\.government-profile-workspace\s+\.customer-workspace-home__intro,\s*\n\.government-profile-workspace\s+\.customer-workspace-recent\s*\{[^}]+\}/,
    )?.[0] ?? ''
  assert.ok(recentBlock.length > 0, 'recent block not found')
  assert.ok(!recentBlock.includes('#1e2633'))
  assert.ok(recentBlock.includes('--government-bg-surface'))
})

test('public signature OTP input uses high-specificity light chain', () => {
  const css = readCss(
    'src/features/government-support/publicSignature/government-signature-public.css',
  )
  assert.match(
    css,
    /\.government-public-signature-page\s+input:not\(\[type='checkbox'\]\):not\(\[type='radio'\]\):not\(\[type='range'\]\)/,
  )
  assert.ok(css.includes('--government-input-bg'))
  assert.ok(css.includes(':-webkit-autofill'))
  assert.match(css, /color-scheme:\s*light/)
})
