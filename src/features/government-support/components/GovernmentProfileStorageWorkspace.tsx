import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormButton } from '../../../components/form'
import Modal from '../../../components/ui/Modal'
import StorageFileList from '../../storage/components/StorageFileList'
import StorageRenameDialog from '../../storage/components/StorageRenameDialog'
import { GovernmentConfirmDialog } from './GovernmentConfirmDialog'
import type { StorageFileDownloadLinkEntry, StorageFileRow, StorageFolderRow } from '../../storage/api/storageApi'
import {
  GOVERNMENT_PROFILE_FILE_ALLOWED_MIME,
  GOVERNMENT_PROFILE_FILE_MAX_BYTES,
  GOVERNMENT_PROFILE_FILE_NAME_MAX,
} from '../constants/governmentProfileFiles.config'
import {
  deleteGovProfileFile,
  fetchGovProfileFiles,
  getGovProfileFileDownloadUrl,
  govProfileFileToStorageRow,
  patchGovProfileFile,
  presignGovProfileFile,
  saveGovProfileFile,
  type GovStorageFileRow,
} from '../api/governmentProfileFilesApi'
import {
  deleteGovProfileFileCategory,
  patchGovProfileFileCategory,
} from '../api/governmentProfileFileCategoriesApi'
import {
  buildGovCategoryFolders,
  govCategoryToFolderId,
  mergeProfileDocumentCategoryViews,
  type GovMergedDocumentCategory,
} from '../lib/governmentProfileDocumentCategories'
import GovernmentProfileStorageToolbar from './GovernmentProfileStorageToolbar'
import { useGovernmentProfileWorkspaceContextOptional } from '../pages/workspace/governmentProfileWorkspaceContext'

const FILE_NAME_REGEX = /^[A-Za-z0-9._\-() \u3131-\u318e\uac00-\ud7a3]+$/

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  )
}

function normalizeName(raw: string): string {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, GOVERNMENT_PROFILE_FILE_NAME_MAX)
}

function isValidFileName(raw: string): boolean {
  const value = normalizeName(raw)
  return Boolean(value) && FILE_NAME_REGEX.test(value)
}

function guessContentType(file: File): string {
  if (file.type && GOVERNMENT_PROFILE_FILE_ALLOWED_MIME.has(file.type)) {
    return file.type
  }
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel'
  if (lower.endsWith('.csv')) return 'text/csv'
  return file.type || 'application/octet-stream'
}

function storageFileKind(file: StorageFileRow): 'image' | 'pdf' | 'spreadsheet' | 'other' {
  const mime = String(file.mimeType ?? '').toLowerCase()
  const name = String(file.fileName || file.displayName || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (mime.includes('spreadsheet') || mime.includes('excel') || name.endsWith('.csv') || name.endsWith('.xls') || name.endsWith('.xlsx')) {
    return 'spreadsheet'
  }
  return 'other'
}

function resolveGovFileId(file: StorageFileRow): string {
  const ext = file as GovStorageFileRow
  return String(ext.govFileId ?? file.id)
}

type GovernmentProfileStorageWorkspaceProps = {
  token: string
  profileId: string
  variant: 'pc' | 'mobile'
  panelLayout?: 'default' | 'sidebar'
  onFileCountChange?: (count: number) => void
}

export default function GovernmentProfileStorageWorkspace({
  token,
  profileId,
  variant,
  panelLayout = 'default',
  onFileCountChange,
}: GovernmentProfileStorageWorkspaceProps) {
  const isMobile = variant === 'mobile'
  const isSidebar = panelLayout === 'sidebar'
  const workspaceCtx = useGovernmentProfileWorkspaceContextOptional()
  const filesRefreshNonce = workspaceCtx?.filesRefreshNonce ?? 0
  const documentCategoriesVersion = workspaceCtx?.documentCategoriesVersion ?? 0
  const [files, setFiles] = useState<StorageFileRow[]>([])
  const [rawGovFiles, setRawGovFiles] = useState<Array<{ category: string }>>([])
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<number>>(() => new Set())
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | 'image' | 'pdf' | 'spreadsheet'>('all')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [filesListError, setFilesListError] = useState('')
  const [renameTarget, setRenameTarget] = useState<{ file: StorageFileRow; value: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StorageFileRow | null>(null)
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [addCategoryName, setAddCategoryName] = useState('')
  const [renameFolderTarget, setRenameFolderTarget] = useState<{
    folder: StorageFolderRow
    categoryId: string
    value: string
  } | null>(null)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{
    folder: StorageFolderRow
    categoryId: string
  } | null>(null)
  const [localUploadCategoryName, setLocalUploadCategoryName] = useState<string | null>(null)
  const [moveCategoryTarget, setMoveCategoryTarget] = useState<{
    file: StorageFileRow
    value: string
  } | null>(null)

  const serverCategories = useMemo(() => {
    void documentCategoriesVersion
    return (workspaceCtx?.listProfileDocumentCategories(profileId) ?? []).filter((row) => !row.archivedAt)
  }, [documentCategoriesVersion, profileId, workspaceCtx])

  const selectedUploadCategoryName = workspaceCtx
    ? workspaceCtx.getUploadCategoryName(profileId)
    : localUploadCategoryName

  const applyUploadCategoryName = useCallback(
    (categoryName: string | null) => {
      if (workspaceCtx) {
        workspaceCtx.setUploadCategoryName(profileId, categoryName)
        return
      }
      setLocalUploadCategoryName(categoryName)
    },
    [profileId, workspaceCtx],
  )

  const uploadCategoryOptions = useMemo(
    () =>
      serverCategories
        .map((row) => ({
          name: normalizeName(row.name),
          serverCategoryId: row.id,
        }))
        .filter((row) => row.name),
    [serverCategories],
  )

  const highlightFolderId = useMemo(() => {
    const name = selectedUploadCategoryName?.trim()
    if (!name) return null
    return govCategoryToFolderId(name)
  }, [selectedUploadCategoryName])

  const mergedCategories = useMemo(() => {
    const fileCategories = rawGovFiles.map((file) => file.category)
    return mergeProfileDocumentCategoryViews(serverCategories, fileCategories)
  }, [rawGovFiles, serverCategories])

  const categoryFolders = useMemo(() => buildGovCategoryFolders(mergedCategories), [mergedCategories])

  const editableFolderIds = useMemo(
    () =>
      new Set(
        mergedCategories
          .filter((category) => category.serverCategoryId)
          .map((category) => category.folderId),
      ),
    [mergedCategories],
  )

  const categoryByFolderId = useMemo(() => {
    const map = new Map<number, GovMergedDocumentCategory>()
    for (const category of mergedCategories) {
      map.set(category.folderId, category)
    }
    return map
  }, [mergedCategories])

  const toggleFolder = useCallback((folderId: number) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])

  const handleFolderClick = useCallback(
    (folderId: number) => {
      toggleFolder(folderId)
      const category = categoryByFolderId.get(folderId)
      if (category?.serverCategoryId) {
        applyUploadCategoryName(category.name)
      }
    },
    [applyUploadCategoryName, categoryByFolderId, toggleFolder],
  )

  const filteredFiles = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return files.filter((file) => {
      if (kindFilter !== 'all' && storageFileKind(file) !== kindFilter) return false
      if (!query) return true
      const haystack = `${file.displayName ?? ''} ${file.fileName ?? ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [files, kindFilter, searchText])

  const FILE_DOWNLOAD_TTL_MS = 8 * 60 * 1000
  const fileDownloadLinksRef = useRef<Record<number, StorageFileDownloadLinkEntry>>({})
  const [fileDownloadLinks, setFileDownloadLinks] = useState<Record<number, StorageFileDownloadLinkEntry>>({})
  const [fileDownloadFailedIds, setFileDownloadFailedIds] = useState<ReadonlySet<number>>(() => new Set())

  const filteredFileIdsKey = useMemo(
    () =>
      filteredFiles
        .map((f) => f.id)
        .sort((a, b) => a - b)
        .join(','),
    [filteredFiles],
  )

  useEffect(() => {
    if (!token?.trim() || !profileId) {
      fileDownloadLinksRef.current = {}
      setFileDownloadLinks({})
      setFileDownloadFailedIds(new Set())
      return
    }
    let cancelled = false
    const run = async () => {
      const now = Date.now()
      const next: Record<number, StorageFileDownloadLinkEntry> = {}
      const failed = new Set<number>()
      for (const file of filteredFiles) {
        const cached = fileDownloadLinksRef.current[file.id]
        if (cached && now - cached.createdAt < FILE_DOWNLOAD_TTL_MS) {
          next[file.id] = cached
          continue
        }
        try {
          const href = await getGovProfileFileDownloadUrl(token, profileId, resolveGovFileId(file))
          if (cancelled) return
          next[file.id] = { href, createdAt: Date.now() }
        } catch {
          failed.add(file.id)
        }
      }
      fileDownloadLinksRef.current = next
      if (!cancelled) {
        setFileDownloadLinks({ ...next })
        setFileDownloadFailedIds(failed)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token, profileId, filteredFileIdsKey, filteredFiles])

  const loadFiles = useCallback(
    async (signal?: AbortSignal) => {
      if (!token?.trim() || !profileId) {
        setFiles([])
        return
      }
      if (signal?.aborted) return
      const rows = await fetchGovProfileFiles(token, profileId)
      if (signal?.aborted) return
      setRawGovFiles(rows.map((row) => ({ category: row.category })))
      setFiles(rows.map((r) => govProfileFileToStorageRow(r) as StorageFileRow))
    },
    [profileId, token],
  )

  useEffect(() => {
    setFiles([])
    setRawGovFiles([])
    setSelectedFileId(null)
    setSearchText('')
    setKindFilter('all')
    setError('')
    setFilesListError('')
    setExpandedFolderIds(new Set())
    setAddCategoryOpen(false)
    setAddCategoryName('')
    setMoveCategoryTarget(null)
  }, [profileId, token])

  useEffect(() => {
    if (!token?.trim() || !profileId) return
    const controller = new AbortController()
    setLoading(true)
    setFilesListError('')
    void loadFiles(controller.signal)
      .catch((e) => {
        if (isAbortError(e)) return
        setFilesListError(e instanceof Error ? e.message : '파일 목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [loadFiles, profileId, token, filesRefreshNonce])

  useEffect(() => {
    if (selectedFileId != null && !files.some((file) => file.id === selectedFileId)) {
      setSelectedFileId(null)
    }
  }, [files, selectedFileId])

  useEffect(() => {
    onFileCountChange?.(files.length)
  }, [files.length, onFileCountChange])

  const validateStoragePickerFile = useCallback((file: File): string | null => {
    const normalizedName = normalizeName(file.name)
    const mimeType = guessContentType(file)
    if (!isValidFileName(normalizedName)) return '파일 이름 형식이 올바르지 않습니다.'
    if (!GOVERNMENT_PROFILE_FILE_ALLOWED_MIME.has(mimeType)) {
      return 'JPG, PNG, PDF, XLS, XLSX, CSV만 업로드할 수 있습니다.'
    }
    if (file.size < 1) return '빈 파일은 업로드할 수 없습니다.'
    if (file.size > GOVERNMENT_PROFILE_FILE_MAX_BYTES) return '파일 크기는 25MB 이하여야 합니다.'
    return null
  }, [])

  const uploadFiles = useCallback(
    async (selectedFiles: File[] | FileList | null) => {
      if (!token?.trim() || !profileId || uploading || !selectedFiles?.length) return
      setUploading(true)
      setError('')
      const uploads = Array.isArray(selectedFiles) ? selectedFiles : Array.from(selectedFiles)
      const uploadCategory = selectedUploadCategoryName?.trim() || undefined
      let failCount = 0
      for (const file of uploads) {
        const normalizedName = normalizeName(file.name)
        const mimeType = guessContentType(file)
        if (!isValidFileName(normalizedName) || !GOVERNMENT_PROFILE_FILE_ALLOWED_MIME.has(mimeType) || file.size < 1 || file.size > GOVERNMENT_PROFILE_FILE_MAX_BYTES) {
          failCount += 1
          continue
        }
        let stagedFileId: string | null = null
        try {
          const presign = await presignGovProfileFile(token, profileId, {
            fileName: normalizedName,
            contentType: mimeType,
            sizeBytes: file.size,
            ...(uploadCategory ? { category: uploadCategory } : {}),
          })
          stagedFileId = presign.fileId
          const put = await fetch(presign.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': mimeType,
              ...(presign.putHeaders ?? {}),
            },
            body: file,
          })
          if (!put.ok) throw new Error('업로드 실패')
          await saveGovProfileFile(token, profileId, {
            fileId: presign.fileId,
            objectKey: presign.objectKey,
            fileName: normalizedName,
            size: file.size,
            mimeType,
          })
          stagedFileId = null
        } catch {
          failCount += 1
          if (stagedFileId) {
            try {
              await deleteGovProfileFile(token, profileId, stagedFileId)
            } catch {
              /* ignore */
            }
          }
        }
      }
      await loadFiles()
      workspaceCtx?.bumpFilesRefresh()
      setUploading(false)
      if (failCount > 0) setError(`${failCount}개 파일 업로드에 실패했습니다.`)
    },
    [loadFiles, profileId, selectedUploadCategoryName, token, uploading, workspaceCtx],
  )

  const submitRename = useCallback(async () => {
    if (!token?.trim() || !profileId || !renameTarget || submitting) return
    const value = normalizeName(renameTarget.value)
    if (!isValidFileName(value)) {
      setError('이름 형식이 올바르지 않습니다.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const updated = await patchGovProfileFile(token, profileId, resolveGovFileId(renameTarget.file), {
        fileName: value,
      })
      const row = govProfileFileToStorageRow(updated) as StorageFileRow
      setFiles((prev) => prev.map((file) => (file.id === row.id ? row : file)))
      setRenameTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '이름 변경에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }, [profileId, renameTarget, submitting, token])

  const submitDelete = useCallback(async () => {
    if (!token?.trim() || !profileId || !deleteTarget || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await deleteGovProfileFile(token, profileId, resolveGovFileId(deleteTarget))
      setFiles((prev) => prev.filter((file) => file.id !== deleteTarget.id))
      setDeleteTarget(null)
      workspaceCtx?.bumpFilesRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }, [deleteTarget, profileId, submitting, token, workspaceCtx])

  const openAddCategoryDialog = useCallback(() => {
    setAddCategoryName('')
    setAddCategoryOpen(true)
  }, [])

  const submitAddCategory = useCallback(async () => {
    const name = normalizeName(addCategoryName)
    if (!name) {
      setError('분류 이름을 입력해 주세요.')
      return
    }
    if (!workspaceCtx) {
      setError('문서 분류를 추가할 수 없습니다.')
      return
    }
    setSubmitting(true)
    setError('')
    const result = await workspaceCtx.addProfileDocumentCategory(profileId, name)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setAddCategoryOpen(false)
    setAddCategoryName('')
    applyUploadCategoryName(result.name)
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      next.add(govCategoryToFolderId(result.name))
      return next
    })
  }, [addCategoryName, applyUploadCategoryName, profileId, workspaceCtx])

  const submitMoveCategory = useCallback(async () => {
    if (!token?.trim() || !profileId || !moveCategoryTarget || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const categoryValue = moveCategoryTarget.value.trim()
      await patchGovProfileFile(token, profileId, resolveGovFileId(moveCategoryTarget.file), {
        category: categoryValue,
      })
      await loadFiles()
      setMoveCategoryTarget(null)
      workspaceCtx?.bumpFilesRefresh()
      if (categoryValue) {
        setExpandedFolderIds((prev) => {
          const next = new Set(prev)
          next.add(govCategoryToFolderId(categoryValue))
          return next
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '분류 변경에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }, [loadFiles, moveCategoryTarget, profileId, submitting, token, workspaceCtx])

  const submitRenameFolder = useCallback(async () => {
    if (!token?.trim() || !profileId || !renameFolderTarget || submitting) return
    const value = normalizeName(renameFolderTarget.value)
    if (!value) {
      setError('분류 이름을 입력해 주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await patchGovProfileFileCategory(token, profileId, renameFolderTarget.categoryId, { name: value })
      await workspaceCtx?.refreshProfileFileCategories(profileId)
      workspaceCtx?.bumpFilesRefresh()
      setRenameFolderTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '문서 분류 수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }, [profileId, renameFolderTarget, submitting, token, workspaceCtx])

  const submitDeleteFolder = useCallback(async () => {
    if (!token?.trim() || !profileId || !deleteFolderTarget || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await deleteGovProfileFileCategory(token, profileId, deleteFolderTarget.categoryId)
      await workspaceCtx?.refreshProfileFileCategories(profileId)
      setDeleteFolderTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '문서 분류 삭제에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }, [deleteFolderTarget, profileId, submitting, token, workspaceCtx])

  const openFile = useCallback(
    async (file: StorageFileRow) => {
      if (!token?.trim()) return
      try {
        const href =
          fileDownloadLinksRef.current[file.id]?.href ??
          (await getGovProfileFileDownloadUrl(token, profileId, resolveGovFileId(file)))
        window.open(href, '_blank', 'noopener,noreferrer')
      } catch (e) {
        setError(e instanceof Error ? e.message : '파일 열기에 실패했습니다.')
      }
    },
    [profileId, token],
  )

  return (
    <div
      className={`storage-workspace page-shell government-profile-storage-workspace${
        isSidebar ? ' government-profile-storage-workspace--sidebar storage-workspace--gov-sidebar' : ''
      }`}
    >
      <div className="government-profile-storage-workspace__scroll">
        <div className="storage-workspace__header">
          <p className="storage-workspace__quota" role="status">
            사업장 서류/첨부 {files.length}개
          </p>
        </div>

        <GovernmentProfileStorageToolbar
          isMobile={isMobile}
          isSidebar={isSidebar}
          validateUploadFile={validateStoragePickerFile}
          onUploadFiles={(selected) => {
            void uploadFiles(selected)
          }}
          onUploadInvalidBatch={(failures) => {
            if (failures.length) setError(`${failures.length}개 파일이 형식·용량·이름 규칙에 맞지 않습니다.`)
          }}
          uploading={uploading}
          uploadCategoryOptions={uploadCategoryOptions}
          selectedUploadCategoryName={selectedUploadCategoryName}
          onSelectUploadCategory={applyUploadCategoryName}
        />

        <div className="storage-workspace__filters" role="search">
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="파일명 검색"
            className="storage-workspace__search gov-form-control government-storage-search-input"
          />
          <select
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as 'all' | 'image' | 'pdf' | 'spreadsheet')}
            className="storage-workspace__kind-filter gov-form-control government-storage-kind-select"
            aria-label="파일 종류 필터"
          >
            <option value="all">전체 형식</option>
            <option value="image">이미지</option>
            <option value="pdf">PDF</option>
            <option value="spreadsheet">엑셀/CSV</option>
          </select>
          {(searchText.trim() || kindFilter !== 'all') && (
            <button
              type="button"
              className="storage-workspace__filter-reset"
              onClick={() => {
                setSearchText('')
                setKindFilter('all')
              }}
            >
              필터 초기화
            </button>
          )}
        </div>

        <div className="storage-workspace__summary">표시 {filteredFiles.length}개 / 전체 {files.length}개</div>

        {error ? <p className="storage-workspace__error">{error}</p> : null}

        <StorageFileList
          folders={categoryFolders}
          files={filteredFiles}
          loading={loading}
          listFetchError={filesListError}
          selectedFileId={selectedFileId}
          expandedFolderIds={expandedFolderIds}
          editableFolderIds={editableFolderIds}
          highlightFolderId={highlightFolderId}
          onToggleFolder={handleFolderClick}
          onSelectFile={setSelectedFileId}
          onOpen={(file) => {
            void openFile(file)
          }}
          downloadLinksByFileId={fileDownloadLinks}
          downloadLinkFailedIds={fileDownloadFailedIds}
          onRename={(file) => setRenameTarget({ file, value: file.displayName })}
          onDelete={(file) => setDeleteTarget(file)}
          onChangeFileCategory={(file) => {
            const ext = file as GovStorageFileRow
            setMoveCategoryTarget({
              file,
              value: String(ext.govCategory ?? '').trim(),
            })
          }}
          onRenameFolder={(folder) => {
            const category = categoryByFolderId.get(folder.id)
            if (!category?.serverCategoryId) return
            setRenameFolderTarget({ folder, categoryId: category.serverCategoryId, value: folder.name })
          }}
          onDeleteFolder={(folder) => {
            const category = categoryByFolderId.get(folder.id)
            if (!category?.serverCategoryId) return
            setDeleteFolderTarget({ folder, categoryId: category.serverCategoryId })
          }}
        />
      </div>

      {workspaceCtx ? (
        <footer className="government-profile-storage-workspace__footer">
          <button
            type="button"
            className="gov-btn gov-btn--secondary gov-btn--document-add"
            onClick={openAddCategoryDialog}
          >
            + 문서 분류 추가
          </button>
        </footer>
      ) : null}

      <StorageRenameDialog
        open={addCategoryOpen}
        title="문서 분류 추가"
        value={addCategoryName}
        inputClassName="gov-form-control"
        loading={submitting}
        onChange={setAddCategoryName}
        onClose={() => setAddCategoryOpen(false)}
        onSubmit={() => {
          void submitAddCategory()
        }}
      />

      <StorageRenameDialog
        open={renameFolderTarget != null}
        title="문서 분류 이름 변경"
        value={renameFolderTarget?.value ?? ''}
        inputClassName="gov-form-control"
        loading={submitting}
        onChange={(value) => {
          if (renameFolderTarget) setRenameFolderTarget({ ...renameFolderTarget, value })
        }}
        onClose={() => setRenameFolderTarget(null)}
        onSubmit={() => {
          void submitRenameFolder()
        }}
      />

      <StorageRenameDialog
        open={renameTarget != null}
        title="파일 이름 변경"
        value={renameTarget?.value ?? ''}
        onChange={(value) => {
          if (renameTarget) setRenameTarget({ ...renameTarget, value })
        }}
        onClose={() => setRenameTarget(null)}
        onSubmit={() => {
          void submitRename()
        }}
        loading={submitting}
      />

      <GovernmentConfirmDialog
        open={deleteFolderTarget != null}
        title="문서 분류 삭제"
        message={
          deleteFolderTarget
            ? `「${deleteFolderTarget.folder.name}」 분류를 삭제하시겠습니까? 파일이 있는 분류는 삭제할 수 없습니다.`
            : ''
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        tone="danger"
        busy={submitting}
        onCancel={() => setDeleteFolderTarget(null)}
        onConfirm={() => {
          void submitDeleteFolder()
        }}
      />

      <GovernmentConfirmDialog
        open={deleteTarget != null}
        title="파일 삭제"
        message={deleteTarget ? `「${deleteTarget.displayName}」 파일을 삭제하시겠습니까?` : ''}
        confirmLabel="삭제"
        cancelLabel="취소"
        tone="danger"
        busy={submitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          void submitDelete()
        }}
      />

      <Modal
        open={moveCategoryTarget != null}
        onClose={() => setMoveCategoryTarget(null)}
        ariaLabel="파일 분류 변경"
        panelClassName="max-w-md"
        closeOnBackdrop={false}
      >
        <div className="text-lg font-semibold mb-3 text-[var(--text-primary)]">파일 분류 변경</div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submitMoveCategory()
          }}
        >
          <label className="government-upload-category-field__label" htmlFor="gov-move-category-select">
            저장 위치
          </label>
          <select
            id="gov-move-category-select"
            className="gov-form-control government-upload-category-field__select"
            value={moveCategoryTarget?.value ?? ''}
            disabled={submitting}
            onChange={(event) => {
              if (!moveCategoryTarget) return
              setMoveCategoryTarget({ ...moveCategoryTarget, value: event.target.value })
            }}
          >
            <option value="">미분류</option>
            {uploadCategoryOptions.map((option) => (
              <option key={option.serverCategoryId} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2 mt-4">
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary"
              onClick={() => setMoveCategoryTarget(null)}
              disabled={submitting}
            >
              취소
            </FormButton>
            <FormButton
              htmlType="submit"
              variant="primary"
              className="gov-btn gov-btn--primary"
              disabled={submitting}
            >
              {submitting ? '저장 중…' : '저장'}
            </FormButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
