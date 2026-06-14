import type { GovernmentProfileProgressSummaryModel } from '../utils/governmentProfileProgressSummary'

type Props = {
  summary: GovernmentProfileProgressSummaryModel
}

function summaryValueClassName(valueTone?: string) {
  const base = 'government-profile-progress-summary-value'
  if (!valueTone) return base
  return `${base} government-profile-progress-summary-value--${valueTone}`
}

export default function GovernmentProfileProgressSummarySection({ summary }: Props) {
  const showEmpty = summary.rows.length === 0 && !summary.hasAnySignal
  const showFallback = summary.rows.length === 0 && summary.hasAnySignal
  const showBadge = summary.statusLabel.trim().length > 0 && summary.statusLabel !== '미정'

  return (
    <section
      className="government-profile-progress-summary-card gov-user-card"
      data-testid="government-profile-progress-summary-card"
      aria-labelledby="gov-profile-progress-summary-heading"
    >
      <div className="government-profile-progress-summary-header">
        <div>
          <h3
            id="gov-profile-progress-summary-heading"
            className="government-profile-progress-summary-title"
          >
            현재 진행 상태
          </h3>
          <p className="government-profile-progress-summary-description">
            현재 신청 건의 진행 상태를 확인합니다.
          </p>
        </div>
        {showBadge ? (
          <span
            className={`government-profile-progress-summary-badge government-profile-progress-summary-badge--${summary.statusTone}`}
          >
            {summary.statusLabel}
          </span>
        ) : null}
      </div>

      {showEmpty ? (
        <p className="government-profile-progress-summary-empty" role="note">
          표시할 진행 현황이 없습니다.
        </p>
      ) : null}

      {summary.rows.length > 0 ? (
        <div className="government-profile-progress-summary-grid">
          {summary.rows.map((row, index) => (
            <div key={`${row.label}-${index}`} className="government-profile-progress-summary-item">
              <span className="government-profile-progress-summary-label">{row.label}</span>
              <strong className={summaryValueClassName(row.valueTone)}>{row.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {showFallback ? (
        <p className="government-profile-progress-summary-empty" role="note">
          {summary.secondaryLine.trim() || summary.primaryLine}
        </p>
      ) : null}
    </section>
  )
}
