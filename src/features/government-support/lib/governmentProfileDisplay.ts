/** 사업장/신청 목록·expanded 카드 표시용 (민감정보 마스킹) */

import { getGovernmentProgressStatusLabel } from '../constants/governmentProgressStatus'
import type { GovSupportProfile } from '../types/governmentProfile.types'

export const GOV_PROFILE_EXPAND_EMPTY_VALUE = '—'

export type GovProfileExpandRow = {
  label: string
  value: string
  isEmpty: boolean
}

export function maskBusinessNumber(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length < 7) {
    return raw.trim() || GOV_PROFILE_EXPAND_EMPTY_VALUE
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}**-${digits.slice(7)}`
  }
  return `${digits.slice(0, 3)}-**-${digits.slice(-4)}`
}

export function formatGovProfileDateTime(value: string | undefined | null): string {
  const raw = String(value ?? '').trim()
  if (!raw) return GOV_PROFILE_EXPAND_EMPTY_VALUE
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function displayGovField(value: string | undefined | null): string {
  const trimmed = String(value ?? '').trim()
  return trimmed || GOV_PROFILE_EXPAND_EMPTY_VALUE
}

function expandRow(label: string, raw: string | null | undefined): GovProfileExpandRow {
  const trimmed = String(raw ?? '').trim()
  const display = trimmed || GOV_PROFILE_EXPAND_EMPTY_VALUE
  return {
    label,
    value: display,
    isEmpty: !trimmed,
  }
}

function expandDateRow(label: string, raw: string | null | undefined): GovProfileExpandRow {
  const trimmed = String(raw ?? '').trim()
  return {
    label,
    value: trimmed ? formatGovProfileDateTime(raw) : GOV_PROFILE_EXPAND_EMPTY_VALUE,
    isEmpty: !trimmed,
  }
}

/** 좌측 카드 펼침 패널 — 값이 없어도 모든 row를 반환한다 */
export function buildGovernmentProfileListExpandRows(profile: GovSupportProfile): GovProfileExpandRow[] {
  const businessTypeCategory = [profile.businessType, profile.businessCategory]
    .filter((v) => String(v ?? '').trim())
    .join(' · ')

  const businessNumberRaw = String(profile.businessNumber ?? '').trim()
  const businessNumberValue = businessNumberRaw
    ? maskBusinessNumber(profile.businessNumber)
    : GOV_PROFILE_EXPAND_EMPTY_VALUE

  return [
    expandRow('사업장/신청명', profile.businessName || profile.customerName),
    expandRow('담당자', profile.customerName),
    expandRow('연락처', profile.phone),
    expandRow('상담 상태', profile.docStatus),
    expandRow(
      '신청 상태',
      profile.progressStatus?.trim()
        ? getGovernmentProgressStatusLabel(profile.progressStatus)
        : '',
    ),
    expandRow('서류 상태', profile.edocStatus),
    expandRow('주소', profile.businessAddress || profile.homeAddress),
    expandRow('개업일', profile.businessOpenedAt),
    {
      label: '사업자등록번호',
      value: businessNumberValue,
      isEmpty: !businessNumberRaw,
    },
    expandRow('업태/종목', businessTypeCategory),
    expandRow('필요자금', profile.requiredFunds),
    expandRow('수임료', profile.fee),
    expandRow('특이사항', profile.specialNote || profile.note),
    expandDateRow('등록일', profile.createdAt),
    expandDateRow('수정일', profile.updatedAt),
  ]
}
