import type { ReactNode } from 'react'
import { resolveGovStatusPillTone, type GovStatusPillTone } from '../lib/governmentStatusPillTone'

export type GovernmentStatusPillProps = {
  children: ReactNode
  tone?: GovStatusPillTone
  /** 라벨 힌트로 tone 자동 추론 */
  label?: string
  className?: string
}

export default function GovernmentStatusPill({
  children,
  tone,
  label,
  className = '',
}: GovernmentStatusPillProps) {
  const text = String(children ?? '').trim()
  if (!text || text === '—') {
    return <span className={`gov-status-pill gov-status-pill--empty ${className}`.trim()}>—</span>
  }

  const resolvedTone = tone ?? resolveGovStatusPillTone(label, text)
  return (
    <span className={`gov-status-pill gov-status-pill--${resolvedTone} ${className}`.trim()}>{text}</span>
  )
}
