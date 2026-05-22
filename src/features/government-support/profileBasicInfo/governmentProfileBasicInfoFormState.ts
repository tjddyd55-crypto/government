import type { GovSupportProfile } from '../types/governmentProfile.types'
import {
  GOVERNMENT_PROFILE_BASIC_INFO_SECTIONS,
  type GovProfileBasicInfoFieldKey,
} from './governmentProfileBasicInfo.config'

export type GovProfileBasicInfoFormState = Record<GovProfileBasicInfoFieldKey, string>

export function profileToBasicInfoForm(profile: GovSupportProfile): GovProfileBasicInfoFormState {
  const form = {} as GovProfileBasicInfoFormState
  for (const section of GOVERNMENT_PROFILE_BASIC_INFO_SECTIONS) {
    for (const field of section.fields) {
      form[field.key] = profile[field.key] != null ? String(profile[field.key]) : ''
    }
  }
  return form
}

export function basicInfoFormToPatch(form: GovProfileBasicInfoFormState): Partial<GovSupportProfile> {
  return { ...form }
}
