/**
 * 정부지원 사업장 첨부 R2 object key (자료실·전자서명·보험 storage 와 분리).
 * @module governmentProfileFileStorage
 */
export {
  sanitizeGovernmentR2FileName as sanitizeGovernmentProfileFileName,
  buildGovernmentProfileFileKey as buildGovernmentProfileFileObjectKey,
  buildLegacyGovernmentProfileFileObjectKey,
  assertGovernmentProfileFileObjectKey,
} from './governmentR2Keys.js'
