import type { StorageFolderRow } from '../../storage/api/storageApi'
import { GOVERNMENT_PROFILE_FILE_NAME_MAX } from '../constants/governmentProfileFiles.config'

const CATEGORIES_STORAGE_KEY = 'gov-profile-document-categories'
const COLLAPSED_PROFILES_KEY = 'gov-profile-workspace-collapsed-profile-ids'

type CategoryStore = Record<string, string[]>

function readCategoryStore(): CategoryStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CATEGORIES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as CategoryStore
  } catch {
    return {}
  }
}

function writeCategoryStore(store: CategoryStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(store))
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

export function listStoredProfileDocumentCategories(profileId: string): string[] {
  const id = String(profileId ?? '').trim()
  if (!id) return []
  const store = readCategoryStore()
  const rows = store[id]
  if (!Array.isArray(rows)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of rows) {
    const name = normalizeCategoryName(String(row ?? ''))
    const key = categoryKey(name)
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

export function mergeProfileDocumentCategories(profileId: string, fileCategories: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of [...listStoredProfileDocumentCategories(profileId), ...fileCategories]) {
    const normalized = normalizeCategoryName(name)
    const key = categoryKey(normalized)
    if (!normalized || seen.has(key)) continue
    seen.add(key)
    out.push(normalized)
  }
  return out.sort((a, b) => a.localeCompare(b, 'ko'))
}

export function addStoredProfileDocumentCategory(
  profileId: string,
  rawName: string,
): { ok: true; name: string } | { ok: false; error: string } {
  const id = String(profileId ?? '').trim()
  const name = normalizeCategoryName(rawName)
  if (!id) return { ok: false, error: '사업장을 선택해 주세요.' }
  if (!name) return { ok: false, error: '분류 이름을 입력해 주세요.' }

  const store = readCategoryStore()
  const current = listStoredProfileDocumentCategories(id)
  if (current.some((row) => categoryKey(row) === categoryKey(name))) {
    return { ok: false, error: '이미 같은 이름의 문서 분류가 있습니다.' }
  }

  store[id] = [...current, name]
  writeCategoryStore(store)
  return { ok: true, name }
}

export function buildGovCategoryFolders(categories: string[]): StorageFolderRow[] {
  return categories.map((name) => ({
    id: govCategoryToFolderId(name),
    name,
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
