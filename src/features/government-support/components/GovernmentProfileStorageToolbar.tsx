import FileUploader from '../../../components/common/FileUploader'

export type GovernmentUploadCategoryOption = {
  name: string
  serverCategoryId: string
}

type GovernmentProfileStorageToolbarProps = {
  isMobile: boolean
  isSidebar?: boolean
  validateUploadFile: (file: File) => string | null
  onUploadFiles: (files: File[]) => void
  onUploadInvalidBatch?: (failures: { file: File; message: string }[]) => void
  uploading: boolean
  uploadCategoryOptions?: GovernmentUploadCategoryOption[]
  selectedUploadCategoryName?: string | null
  onSelectUploadCategory?: (categoryName: string | null) => void
}

/** 보험 StorageToolbar — 폴더 없이 업로드만 (사업장 첨부 전용) */
export default function GovernmentProfileStorageToolbar({
  isMobile,
  isSidebar = false,
  validateUploadFile,
  onUploadFiles,
  onUploadInvalidBatch,
  uploading,
  uploadCategoryOptions = [],
  selectedUploadCategoryName = null,
  onSelectUploadCategory,
}: GovernmentProfileStorageToolbarProps) {
  const uploadLocationLabel =
    selectedUploadCategoryName?.trim() ? selectedUploadCategoryName.trim() : '미분류'

  return (
    <div
      className={`storage-toolbar${isMobile ? ' storage-toolbar--mobile' : ''}${isSidebar ? ' storage-toolbar--gov-sidebar' : ''}`}
    >
      {onSelectUploadCategory ? (
        <div
          className="government-upload-category-field"
          data-testid="government-upload-category-select"
        >
          <label className="government-upload-category-field__label" htmlFor="gov-upload-category-select">
            저장 위치
          </label>
          <select
            id="gov-upload-category-select"
            className="gov-form-control government-upload-category-field__select"
            value={selectedUploadCategoryName ?? ''}
            disabled={uploading}
            aria-label="저장할 문서 분류"
            onChange={(event) => {
              const value = event.target.value.trim()
              onSelectUploadCategory(value ? value : null)
            }}
          >
            <option value="">미분류</option>
            {uploadCategoryOptions.map((option) => (
              <option key={option.serverCategoryId} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
          <p className="government-upload-category-field__hint" aria-live="polite">
            현재 업로드 위치: {uploadLocationLabel}
          </p>
        </div>
      ) : null}

      <div className={`storage-toolbar__row${isMobile || isSidebar ? ' storage-toolbar__row--full' : ''}`}>
        <FileUploader
          accept="image/jpeg,image/png,application/pdf,.pdf,.xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          validateFile={validateUploadFile}
          onFiles={onUploadFiles}
          onInvalidBatch={onUploadInvalidBatch}
          compact={!isMobile && !isSidebar}
          disabled={uploading}
          statusText={uploading ? '업로드 중…' : undefined}
          primaryHint={isSidebar ? '파일 업로드' : '파일을 드래그하거나 클릭하여 업로드'}
          hintLines={['JPG · PNG · PDF · XLS · XLSX · CSV, 파일당 최대 25MB']}
        />
      </div>
    </div>
  )
}
