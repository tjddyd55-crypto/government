import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('government signature send button hover tokens', () => {
  const css = readFileSync(
    resolve(__dirname, './government-signature-send-page.css'),
    'utf8',
  )
  const pcTheme = readFileSync(
    resolve(__dirname, '../government-user-pc-theme.css'),
    'utf8',
  )

  it('발송 페이지에서 다크 btn-hover 토큰을 밝은 soft로 덮는다', () => {
    expect(css).toContain('--btn-hover-bg: var(--gov-workspace-primary-soft')
    expect(css).toContain('--secondary-hover-bg: var(--gov-workspace-primary-soft')
    expect(css).toMatch(/\.button--secondary:hover:not\(:disabled\)/)
    expect(css).not.toMatch(/--btn-hover-bg:\s*#111827/)
    expect(css).not.toMatch(/--btn-hover-bg:\s*#0f172a/)
  })

  it('이용자 PC 테마가 전역 다크 hover 잔재를 덮는다', () => {
    expect(pcTheme).toContain('--btn-hover-bg: var(--gov-workspace-primary-soft)')
    expect(pcTheme).toContain('--secondary-hover-bg: var(--gov-workspace-primary-soft)')
    expect(pcTheme).toMatch(/\.button--secondary:hover:not\(:disabled\)/)
  })
})
