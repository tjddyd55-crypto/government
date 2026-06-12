import {
  getGovernmentProgressStatusLabel,
  normalizeGovernmentProgressStatus,
  type GovernmentProgressStatus,
} from '../constants/governmentProgressStatus'
import type { GovSupportProfile } from '../types/governmentProfile.types'

export type GovernmentProgressStatusTone = 'blue' | 'amber' | 'green' | 'red' | 'neutral'

export type GovernmentProgressSummaryBadge = {
  label: string
  tone: GovernmentProgressStatusTone
}

export type GovernmentProgressSummaryRow = {
  label: string
  value: string
  valueTone?: GovernmentProgressStatusTone
}

export type GovernmentProfileProgressSummaryModel = {
  statusLabel: string
  statusTone: GovernmentProgressStatusTone
  primaryLine: string
  secondaryLine: string
  badges: GovernmentProgressSummaryBadge[]
  rows: GovernmentProgressSummaryRow[]
  hasAnySignal: boolean
}


function toneForCanonicalStatus(status: GovernmentProgressStatus): GovernmentProgressStatusTone {
  switch (status) {
    case '서류준비중':
    case '접수대기':
      return 'neutral'
    case '서류발급 완료':
    case '접수중':
    case '심사중':
      return 'amber'
    case '최종승인':
      return 'green'
    default:
      return 'neutral'
  }
}

function pushBadgeUnique(out: GovernmentProgressSummaryBadge[], label: string, tone: GovernmentProgressStatusTone) {
  if (!label.trim()) return
  if (out.some((b) => b.label === label)) return
  out.push({ label, tone })
}

/**
 * 보험 `buildGovernmentCustomerStatusSummary` / `GovernmentDetailStatusSummaryCard` 대응.
 * 정부 CRM profile 필드에서 요약을 조립한다.
 */
export function buildGovernmentProfileProgressSummary(
  profile: GovSupportProfile | null | undefined,
): GovernmentProfileProgressSummaryModel {
  const p = profile
  const statusRaw = String(p?.progressStatus ?? '').trim()
  const statusLabel = statusRaw ? getGovernmentProgressStatusLabel(statusRaw) : '미정'
  const canonicalStatus = normalizeGovernmentProgressStatus(statusRaw)
  const statusTone = toneForCanonicalStatus(canonicalStatus)

  const badges: GovernmentProgressSummaryBadge[] = []
  if (statusRaw) {
    pushBadgeUnique(badges, statusLabel, statusTone)
  }

  const primaryLine =
    [p?.productName, p?.businessName].filter(Boolean).join(' · ') ||
    statusLabel ||
    '진행상황'

  const secondaryParts = [
    p?.agencyOrg ? `기관 ${p.agencyOrg}` : '',
    p?.scheduleAt ? `일정 ${p.scheduleAt}` : '',
    p?.region ? `지역 ${p.region}` : '',
    p?.availableProduct ? `가능상품 ${p.availableProduct}` : '',
  ].filter(Boolean)

  const rows: GovernmentProgressSummaryRow[] = []
  const pushRow = (label: string, value: string, valueTone?: GovernmentProgressStatusTone) => {
    const v = value.trim()
    if (!v) return
    rows.push({ label, value: v, valueTone })
  }

  pushRow('접수상태', statusLabel, statusTone)
  pushRow('접수상품명', String(p?.productName ?? ''))
  pushRow('가능상품', String(p?.availableProduct ?? ''))
  pushRow('접수일정', String(p?.scheduleAt ?? ''))
  pushRow('진행기관', String(p?.agencyOrg ?? ''))
  pushRow('지역', String(p?.region ?? ''))
  pushRow('사업장', String(p?.businessName ?? ''))

  const hasAnySignal = badges.length > 0 || rows.length > 0

  return {
    statusLabel,
    statusTone,
    primaryLine,
    secondaryLine: secondaryParts.join(' · '),
    badges,
    rows,
    hasAnySignal,
  }
}

export function progressStatusBadgeTone(status: string): GovernmentProgressStatusTone {
  return toneForCanonicalStatus(normalizeGovernmentProgressStatus(status))
}
