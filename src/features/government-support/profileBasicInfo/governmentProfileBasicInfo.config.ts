import type { GovSupportProfile } from '../types/governmentProfile.types'

export type GovProfileBasicInfoFieldKey = keyof Pick<
  GovSupportProfile,
  | 'customerName'
  | 'phone'
  | 'carrier'
  | 'homeAddress'
  | 'homeType'
  | 'creditScore1'
  | 'creditScore2'
  | 'specialNote'
  | 'businessName'
  | 'businessOpenedAt'
  | 'businessNumber'
  | 'businessAddress'
  | 'businessCategory'
  | 'businessType'
  | 'businessForm'
  | 'businessPhone'
  | 'vatReport'
  | 'incomeCert'
  | 'annualIncome'
  | 'taxArrears'
  | 'progressStatus'
  | 'note'
>

export type GovProfileBasicInfoFieldDef = {
  key: GovProfileBasicInfoFieldKey
  label: string
  wide?: boolean
  textarea?: boolean
}

export type GovProfileBasicInfoSection = {
  id: string
  title: string
  fields: GovProfileBasicInfoFieldDef[]
}

/** 보험 government 템플릿 gov-customer + gov-business 탭 fieldKeys → gov_support_profiles 컬럼 */
export const GOVERNMENT_PROFILE_BASIC_INFO_SECTIONS: GovProfileBasicInfoSection[] = [
  {
    id: 'customer',
    title: '기본 정보',
    fields: [
      { key: 'customerName', label: '성함' },
      { key: 'phone', label: '연락처' },
      { key: 'carrier', label: '통신사' },
      { key: 'homeAddress', label: '자택주소', wide: true, textarea: true },
      { key: 'homeType', label: '자택형태' },
      { key: 'creditScore1', label: '신용점수 KCB' },
      { key: 'creditScore2', label: '신용점수 NICE' },
      { key: 'specialNote', label: '특이사항', wide: true, textarea: true },
    ],
  },
  {
    id: 'business',
    title: '사업자 정보',
    fields: [
      { key: 'businessName', label: '사업장명칭' },
      { key: 'businessOpenedAt', label: '개업년월일' },
      { key: 'businessNumber', label: '사업자등록번호' },
      { key: 'businessAddress', label: '사업장 소재지', wide: true, textarea: true },
      { key: 'businessCategory', label: '사업자 종목' },
      { key: 'businessType', label: '업태' },
      { key: 'businessForm', label: '사업장 형태' },
      { key: 'businessPhone', label: '사업장 번호' },
      { key: 'vatReport', label: '부가세 신고 유/무' },
      { key: 'incomeCert', label: '소득금액증명원 발급 여부' },
      { key: 'annualIncome', label: '연소득' },
      { key: 'taxArrears', label: '세금 체납 여부' },
      { key: 'progressStatus', label: '진행 상태' },
      { key: 'note', label: '비고', wide: true, textarea: true },
    ],
  },
]

export function readGovProfileBasicInfoValue(profile: GovSupportProfile, key: GovProfileBasicInfoFieldKey): string {
  const raw = profile[key]
  return raw != null ? String(raw) : ''
}
