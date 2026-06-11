/**
 * 정부지원 자료실 R2 object key (유저 사업장 첨부와 분리).
 * @module governmentResourceStorage
 */
export {
  sanitizeGovernmentR2FileName as sanitizeGovernmentResourceFileName,
  buildGovernmentResourceFileKey as buildGovernmentResourceObjectKey,
  assertGovernmentResourceObjectKey,
} from './governmentR2Keys.js'
