import type { GovernmentProfileProgressSummaryModel } from '../utils/governmentProfileProgressSummary'

type Props = {
  summary: GovernmentProfileProgressSummaryModel
}

export default function GovernmentProfileProgressSummarySection({ summary }: Props) {
  const showEmpty = summary.rows.length === 0 && !summary.hasAnySignal
  const showFallback = summary.rows.length === 0 && summary.hasAnySignal

  return (
    <section
      className="gov-user-card gov-workspace-status-summary-card"
      aria-labelledby="gov-profile-progress-summary-heading"
    >
      <div className="gov-workspace-status-summary-card__header">
        <h2 id="gov-profile-progress-summary-heading" className="gov-workspace-status-summary-card__title">
          현재 진행 상태
        </h2>
      </div>
      <div className="gov-workspace-status-summary-card__body">
        {summary.badges.length > 0 ? (
          <ul className="gov-workspace-status-summary-card__badges" aria-label="진행 상태">
            {summary.badges.map((b, i) => (
              <li
                key={`${b.label}-${i}`}
                className={`gov-workspace-status-summary-card__badge gov-workspace-status-summary-card__badge--${b.tone}`}
              >
                {b.label}
              </li>
            ))}
          </ul>
        ) : null}

        {summary.primaryLine ? (
          <p className="gov-workspace-status-summary-card__line" role="note">
            {summary.primaryLine}
            {summary.secondaryLine ? ` · ${summary.secondaryLine}` : ''}
          </p>
        ) : null}

        {showEmpty ? (
          <p className="gov-workspace-status-summary-card__empty" role="note">
            표시할 진행 현황이 없습니다.
          </p>
        ) : null}

        {summary.rows.length > 0 ? (
          <dl className="gov-workspace-status-summary-card__grid">
            {summary.rows.map((r, i) => (
              <div key={`${r.label}-${i}`} className="gov-workspace-status-summary-card__cell">
                <dt className="gov-workspace-status-summary-card__cell-label">{r.label}</dt>
                <dd
                  className={
                    r.valueTone
                      ? `gov-workspace-status-summary-card__cell-value gov-workspace-status-summary-card__cell-value--${r.valueTone}`
                      : 'gov-workspace-status-summary-card__cell-value'
                  }
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {showFallback ? (
          <p className="gov-workspace-status-summary-card__empty" role="note">
            {summary.secondaryLine.trim() || summary.primaryLine}
          </p>
        ) : null}
      </div>
    </section>
  )
}
