import type { GovSupportProfile } from '../types/governmentProfile.types'

export const GOVERNMENT_REGION_NO_ADDRESS_KEY = '__no_address__'
export const GOVERNMENT_REGION_UNCLASSIFIED_KEY = '__unclassified__'

export type GovernmentParsedRegion = {
  sido: string
  sigungu: string
  eupmyeondong: string
  rawAddress: string
  hasAddress: boolean
  groupKey: string
  groupLabel: string
}

export type GovernmentRegionGroup = {
  key: string
  label: string
  sido: string
  sigungu: string
  eupmyeondong: string
  count: number
  isUnclassified: boolean
}

export type GovernmentRegionSortMode =
  | 'region'
  | 'createdAtDesc'
  | 'createdAtAsc'
  | 'businessName'
  | 'status'

export type GovernmentRegionFilters = {
  searchQuery: string
  sido: string
  sigungu: string
  eupmyeondong: string
  progressStatus: string
  docStatus: string
  sort: GovernmentRegionSortMode
}

export const GOVERNMENT_REGION_SORT_OPTIONS: { value: GovernmentRegionSortMode; label: string }[] = [
  { value: 'region', label: '지역순' },
  { value: 'createdAtDesc', label: '등록일 최신순' },
  { value: 'createdAtAsc', label: '등록일 오래된순' },
  { value: 'businessName', label: '사업장명순' },
  { value: 'status', label: '상태순' },
]

const SIDO_CANONICAL = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원특별자치도',
  '강원도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라북도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
] as const

const SIDO_ALIAS_TO_CANONICAL: Record<string, string> = {
  서울: '서울특별시',
  서울특별시: '서울특별시',
  부산: '부산광역시',
  부산광역시: '부산광역시',
  대구: '대구광역시',
  대구광역시: '대구광역시',
  인천: '인천광역시',
  인천광역시: '인천광역시',
  광주: '광주광역시',
  광주광역시: '광주광역시',
  대전: '대전광역시',
  대전광역시: '대전광역시',
  울산: '울산광역시',
  울산광역시: '울산광역시',
  세종: '세종특별자치시',
  세종특별자치시: '세종특별자치시',
  경기: '경기도',
  경기도: '경기도',
  강원: '강원특별자치도',
  강원도: '강원특별자치도',
  강원특별자치도: '강원특별자치도',
  충북: '충청북도',
  충청북도: '충청북도',
  충남: '충청남도',
  충청남도: '충청남도',
  전북: '전북특별자치도',
  전라북도: '전북특별자치도',
  전북특별자치도: '전북특별자치도',
  전남: '전라남도',
  전라남도: '전라남도',
  경북: '경상북도',
  경상북도: '경상북도',
  경남: '경상남도',
  경상남도: '경상남도',
  제주: '제주특별자치도',
  제주특별자치도: '제주특별자치도',
}

const METRO_SIDO = new Set([
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
])

const SIDO_ALIASES_SORTED = Object.keys(SIDO_ALIAS_TO_CANONICAL).sort((a, b) => b.length - a.length)

export function normalizeGovernmentAddress(address: string): string {
  return String(address ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getGovernmentProfileAddress(profile: GovSupportProfile): string {
  const business = normalizeGovernmentAddress(profile.businessAddress)
  if (business) return business
  return normalizeGovernmentAddress(profile.homeAddress)
}

function stripPostalPrefix(address: string): string {
  return address.replace(/^\(\d{5}\)\s*/, '').trim()
}

function canonicalizeSido(token: string): string {
  const trimmed = token.trim()
  return SIDO_ALIAS_TO_CANONICAL[trimmed] ?? trimmed
}

function isAdminUnitToken(token: string): boolean {
  return /(?:시|군|구)$/.test(token)
}

function buildGroupLabel(sido: string, sigungu: string, eupmyeondong: string): string {
  const parts = [sido, sigungu, eupmyeondong].filter(Boolean)
  return parts.join(' ').trim()
}

function buildGroupKey(sido: string, sigungu: string, eupmyeondong: string): string {
  return [sido, sigungu, eupmyeondong].filter(Boolean).join('|') || GOVERNMENT_REGION_UNCLASSIFIED_KEY
}

function parseNoAddress(): GovernmentParsedRegion {
  return {
    sido: '',
    sigungu: '',
    eupmyeondong: '',
    rawAddress: '',
    hasAddress: false,
    groupKey: GOVERNMENT_REGION_NO_ADDRESS_KEY,
    groupLabel: '주소 없음',
  }
}

function parseUnclassified(rawAddress: string): GovernmentParsedRegion {
  return {
    sido: '',
    sigungu: '',
    eupmyeondong: '',
    rawAddress,
    hasAddress: true,
    groupKey: GOVERNMENT_REGION_UNCLASSIFIED_KEY,
    groupLabel: '미분류',
  }
}

export function parseGovernmentRegionFromAddress(rawInput: string): GovernmentParsedRegion {
  const rawAddress = normalizeGovernmentAddress(rawInput)
  if (!rawAddress) {
    return parseNoAddress()
  }

  let rest = stripPostalPrefix(rawAddress)
  let sido = ''

  for (const alias of SIDO_ALIASES_SORTED) {
    if (rest === alias || rest.startsWith(`${alias} `)) {
      sido = canonicalizeSido(alias)
      rest = rest.slice(alias.length).trim()
      break
    }
  }

  if (!sido) {
    const firstToken = rest.split(/\s+/)[0] ?? ''
    if (SIDO_ALIAS_TO_CANONICAL[firstToken]) {
      sido = canonicalizeSido(firstToken)
      rest = rest.slice(firstToken.length).trim()
    }
  }

  if (!sido) {
    return parseUnclassified(rawAddress)
  }

  const tokens = rest.split(/\s+/).filter(Boolean)
  let sigungu = ''
  let eupmyeondong = ''
  const remainder: string[] = []

  if (METRO_SIDO.has(sido)) {
    const guToken = tokens.find((token) => /구$/.test(token))
    if (guToken) {
      sigungu = guToken
    } else if (tokens[0] && isAdminUnitToken(tokens[0])) {
      sigungu = tokens[0]
    } else {
      remainder.push(...tokens)
    }
  } else if (sido === '세종특별자치시') {
    const guToken = tokens.find((token) => /(?:구|읍|면|동)$/.test(token))
    if (guToken) {
      sigungu = guToken
    }
  } else {
    const cityToken = tokens.find((token) => /(?:시|군)$/.test(token))
    if (cityToken) {
      sigungu = cityToken
      const afterCity = tokens.slice(tokens.indexOf(cityToken) + 1)
      const districtToken = afterCity.find((token) => /(?:구|읍|면|동)$/.test(token))
      if (districtToken) {
        eupmyeondong = districtToken
      } else {
        remainder.push(...afterCity)
      }
    } else {
      const districtToken = tokens.find((token) => /(?:구|군)$/.test(token))
      if (districtToken) {
        sigungu = districtToken
      } else {
        remainder.push(...tokens)
      }
    }
  }

  if (!sigungu && tokens.length > 0) {
    const firstAdmin = tokens.find((token) => isAdminUnitToken(token))
    if (firstAdmin) {
      sigungu = firstAdmin
    }
  }

  const groupLabel = buildGroupLabel(sido, sigungu, eupmyeondong)
  if (!groupLabel) {
    return parseUnclassified(rawAddress)
  }

  return {
    sido,
    sigungu,
    eupmyeondong,
    rawAddress,
    hasAddress: true,
    groupKey: buildGroupKey(sido, sigungu, eupmyeondong),
    groupLabel,
  }
}

export function getGovernmentRegionLabel(region: Pick<GovernmentParsedRegion, 'groupLabel'>): string {
  return region.groupLabel.trim() || '미분류'
}

export function profileMatchesRegionSearch(profile: GovSupportProfile, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const address = getGovernmentProfileAddress(profile)
  const parsed = parseGovernmentRegionFromAddress(address)
  const haystack = [
    profile.businessName,
    profile.customerName,
    profile.phone,
    profile.businessNumber,
    profile.progressStatus,
    profile.docStatus,
    profile.edocStatus,
    address,
    parsed.groupLabel,
    parsed.sido,
    parsed.sigungu,
    parsed.eupmyeondong,
  ]
    .map((value) => String(value ?? '').toLowerCase())
    .join(' ')

  return haystack.includes(q) || haystack.split(/\s+/).some((token) => token.includes(q))
}

export function profileMatchesMasansSearch(profile: GovSupportProfile, query: string): boolean {
  const q = query.trim()
  if (!q || !q.includes('마산')) return profileMatchesRegionSearch(profile, query)

  const address = getGovernmentProfileAddress(profile)
  const parsed = parseGovernmentRegionFromAddress(address)
  const combined = [
    address,
    parsed.groupLabel,
    parsed.sigungu,
    parsed.eupmyeondong,
    profile.businessName,
    profile.customerName,
  ]
    .join(' ')

  const otherQuery = q.replace(/마산/g, '').trim()
  const masanMatched = /마산/.test(combined)
  if (!otherQuery) {
    return masanMatched
  }
  return masanMatched && profileMatchesRegionSearch(profile, otherQuery)
}

function compareProfilesBySort(a: GovSupportProfile, b: GovSupportProfile, sort: GovernmentRegionSortMode): number {
  if (sort === 'createdAtDesc' || sort === 'createdAtAsc') {
    const aTime = Date.parse(String(a.createdAt ?? '')) || 0
    const bTime = Date.parse(String(b.createdAt ?? '')) || 0
    return sort === 'createdAtDesc' ? bTime - aTime : aTime - bTime
  }

  if (sort === 'businessName') {
    const aName = (a.businessName || a.customerName || '').localeCompare(b.businessName || b.customerName || '', 'ko')
    return aName
  }

  if (sort === 'status') {
    const statusCompare = String(a.progressStatus ?? '').localeCompare(String(b.progressStatus ?? ''), 'ko')
    if (statusCompare !== 0) return statusCompare
    return String(a.docStatus ?? '').localeCompare(String(b.docStatus ?? ''), 'ko')
  }

  const aRegion = parseGovernmentRegionFromAddress(getGovernmentProfileAddress(a))
  const bRegion = parseGovernmentRegionFromAddress(getGovernmentProfileAddress(b))
  const regionCompare =
    aRegion.groupLabel.localeCompare(bRegion.groupLabel, 'ko') ||
    aRegion.sido.localeCompare(bRegion.sido, 'ko') ||
    aRegion.sigungu.localeCompare(bRegion.sigungu, 'ko') ||
    aRegion.eupmyeondong.localeCompare(bRegion.eupmyeondong, 'ko')
  if (regionCompare !== 0) return regionCompare
  return (a.businessName || a.customerName || '').localeCompare(b.businessName || b.customerName || '', 'ko')
}

export function filterGovernmentProfilesByRegion(
  profiles: GovSupportProfile[],
  filters: GovernmentRegionFilters,
): GovSupportProfile[] {
  const filtered = profiles.filter((profile) => {
    const address = getGovernmentProfileAddress(profile)
    const parsed = parseGovernmentRegionFromAddress(address)

    if (filters.sido && parsed.sido !== filters.sido) return false
    if (filters.sigungu && parsed.sigungu !== filters.sigungu) return false
    if (filters.eupmyeondong && parsed.eupmyeondong !== filters.eupmyeondong) return false
    if (filters.progressStatus && String(profile.progressStatus ?? '').trim() !== filters.progressStatus) {
      return false
    }
    if (filters.docStatus && String(profile.docStatus ?? '').trim() !== filters.docStatus) {
      return false
    }
    if (!profileMatchesMasansSearch(profile, filters.searchQuery)) return false
    return true
  })

  return [...filtered].sort((a, b) => compareProfilesBySort(a, b, filters.sort))
}

export function groupGovernmentProfilesByRegion(profiles: GovSupportProfile[]): GovernmentRegionGroup[] {
  const map = new Map<string, GovernmentRegionGroup>()

  for (const profile of profiles) {
    const parsed = parseGovernmentRegionFromAddress(getGovernmentProfileAddress(profile))
    const existing = map.get(parsed.groupKey)
    if (existing) {
      existing.count += 1
      continue
    }
    map.set(parsed.groupKey, {
      key: parsed.groupKey,
      label: parsed.groupLabel,
      sido: parsed.sido,
      sigungu: parsed.sigungu,
      eupmyeondong: parsed.eupmyeondong,
      count: 1,
      isUnclassified:
        parsed.groupKey === GOVERNMENT_REGION_NO_ADDRESS_KEY ||
        parsed.groupKey === GOVERNMENT_REGION_UNCLASSIFIED_KEY,
    })
  }

  return [...map.values()].sort((a, b) => {
    if (a.key === GOVERNMENT_REGION_NO_ADDRESS_KEY) return 1
    if (b.key === GOVERNMENT_REGION_NO_ADDRESS_KEY) return -1
    if (a.key === GOVERNMENT_REGION_UNCLASSIFIED_KEY) return 1
    if (b.key === GOVERNMENT_REGION_UNCLASSIFIED_KEY) return -1
    return a.label.localeCompare(b.label, 'ko')
  })
}

export function collectGovernmentRegionFilterOptions(profiles: GovSupportProfile[]) {
  const sidoSet = new Set<string>()
  const sigunguBySido = new Map<string, Set<string>>()
  const eupBySigungu = new Map<string, Set<string>>()
  const progressStatusSet = new Set<string>()
  const docStatusSet = new Set<string>()

  for (const profile of profiles) {
    const parsed = parseGovernmentRegionFromAddress(getGovernmentProfileAddress(profile))
    if (parsed.sido) {
      sidoSet.add(parsed.sido)
      const sigunguKey = parsed.sido
      if (!sigunguBySido.has(sigunguKey)) sigunguBySido.set(sigunguKey, new Set())
      if (parsed.sigungu) {
        sigunguBySido.get(sigunguKey)?.add(parsed.sigungu)
        const eupKey = `${parsed.sido}|${parsed.sigungu}`
        if (!eupBySigungu.has(eupKey)) eupBySigungu.set(eupKey, new Set())
        if (parsed.eupmyeondong) {
          eupBySigungu.get(eupKey)?.add(parsed.eupmyeondong)
        }
      }
    }

    const progressStatus = String(profile.progressStatus ?? '').trim()
    if (progressStatus) progressStatusSet.add(progressStatus)
    const docStatus = String(profile.docStatus ?? '').trim()
    if (docStatus) docStatusSet.add(docStatus)
  }

  return {
    sidos: [...sidoSet].sort((a, b) => a.localeCompare(b, 'ko')),
    sigunguBySido,
    eupBySigungu,
    progressStatuses: [...progressStatusSet].sort((a, b) => a.localeCompare(b, 'ko')),
    docStatuses: [...docStatusSet].sort((a, b) => a.localeCompare(b, 'ko')),
    allSidos: [...SIDO_CANONICAL],
  }
}

export function computeGovernmentRegionSummary(profiles: GovSupportProfile[], filteredCount: number) {
  let withAddress = 0
  let withoutAddress = 0

  for (const profile of profiles) {
    const address = getGovernmentProfileAddress(profile)
    if (address) withAddress += 1
    else withoutAddress += 1
  }

  return {
    total: profiles.length,
    withAddress,
    withoutAddress,
    selectedRegionCount: filteredCount,
  }
}
