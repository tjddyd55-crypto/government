import type { StorageFolderRow } from '../../storage/api/storageApi'
import type { GovProfileFileCategory } from '../types/governmentProfile.types'
import { GOVERNMENT_PROFILE_FILE_NAME_MAX } from '../constants/governmentProfileFiles.config'

const COLLAPSED_PROFILES_KEY = 'gov-profile-workspace-collapsed-profile-ids'

/** path·API·state 간 profile id 비교용 (타입/공백 불일치 방지) */
export function normalizeGovProfileId(id: string | number | null | undefined): string {
  return String(id ?? '').trim()
}

export function isSameGovProfileId(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
): boolean {
  const left = normalizeGovProfileId(a)
  const right = normalizeGovProfileId(b)
  return left !== '' && left === right
}

export type GovMergedDocumentCategory = {
  name: string
  folderId: number
  sortOrder: number
  serverCategoryId: string | null
}

function normalizeCategoryName(raw: string): string {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, GOVERNMENT_PROFILE_FILE_NAME_MAX)
}

function categoryKey(name: string): string {
  return normalizeCategoryName(name).toLowerCase()
}

export function govCategoryToFolderId(categoryName: string): number {
  const normalized = categoryKey(categoryName)
  if (!normalized) return -1
  let hash = 0
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0
  }
  return hash === 0 ? -1 : -Math.abs(hash) - 1
}

export function mergeProfileDocumentCategoryViews(
  serverRows: GovProfileFileCategory[],
  fileCategoryNames: string[],
): GovMergedDocumentCategory[] {
  const map = new Map<string, GovMergedDocumentCategory>()

  for (const row of serverRows) {
    const name = normalizeCategoryName(row.name)
    const key = categoryKey(name)
    if (!name || map.has(key)) continue
    map.set(key, {
      name,
      folderId: govCategoryToFolderId(name),
      sortOrder: Number.isFinite(row.sortOrder) ? row.sortOrder : 0,
      serverCategoryId: row.id,
    })
  }

  for (const raw of fileCategoryNames) {
    const name = normalizeCategoryName(raw)
    const key = categoryKey(name)
    if (!name || map.has(key)) continue
    map.set(key, {
      name,
      folderId: govCategoryToFolderId(name),
      sortOrder: 100000,
      serverCategoryId: null,
    })
  }

  return [...map.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ko'),
  )
}

export function buildGovCategoryFolders(categories: GovMergedDocumentCategory[]): StorageFolderRow[] {
  return categories.map((category) => ({
    id: category.folderId,
    name: category.name,
    createdAt: '',
  }))
}

function readCollapsedProfileIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.sessionStorage.getItem(COLLAPSED_PROFILES_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.map((id) => String(id)))
  } catch {
    return new Set()
  }
}

function writeCollapsedProfileIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(COLLAPSED_PROFILES_KEY, JSON.stringify([...ids]))
}

export function isGovProfileCardCollapsed(profileId: string): boolean {
  const id = String(profileId ?? '').trim()
  if (!id) return false
  return readCollapsedProfileIds().has(id)
}

export function setGovProfileCardCollapsed(profileId: string, collapsed: boolean): void {
  const id = String(profileId ?? '').trim()
  if (!id) return
  const ids = readCollapsedProfileIds()
  if (collapsed) ids.add(id)
  else ids.delete(id)
  writeCollapsedProfileIds(ids)
}
