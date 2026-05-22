import type { GovSupportProfile } from '../types/governmentProfile.types'
import {
  GOVERNMENT_PROFILE_BASIC_INFO_SECTIONS,
  readGovProfileBasicInfoValue,
} from './governmentProfileBasicInfo.config'

type Props = {
  profile: GovSupportProfile
}

function displayValue(value: string): string {
  const trimmed = value.trim()
  return trimmed || '—'
}

export default function GovernmentProfileBasicInfoReadView({ profile }: Props) {
  return (
    <div className="customer-detail-read">
      {GOVERNMENT_PROFILE_BASIC_INFO_SECTIONS.map((section) => (
        <section key={section.id} className="customer-detail-read__section" aria-labelledby={`gov-basic-${section.id}`}>
          <div className="customer-detail-read__section-header">
            <h4 id={`gov-basic-${section.id}`} className="customer-detail-read__section-title">
              {section.title}
            </h4>
          </div>
          <div className="customer-detail-read__section-body">
            <div className="customer-detail-read__info-list">
              {section.fields.map((field) => (
                <div key={field.key} className="customer-detail-read__info-row">
                  <span className="customer-detail-read__info-bullet" aria-hidden>
                    •
                  </span>
                  <div className="customer-detail-read__info-main">
                    <span className="customer-detail-read__info-label">{field.label}:</span>{' '}
                    <span className="customer-detail-read__info-value">
                      {displayValue(readGovProfileBasicInfoValue(profile, field.key))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
