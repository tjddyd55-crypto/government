/**
 * 정부지원 CRM 전용 R2 object key (보험 customer_files / storage API 와 분리).
 */
export {
  sanitizeGovernmentR2FileName as sanitizeGovernmentDocumentFileName,
  buildGovernmentProfileDocumentKey as buildGovernmentDocumentObjectKey,
  assertGovernmentProfileDocumentObjectKey,
} from './governmentR2Keys.js'
