import { FormButton } from '../../../../../../components/form'
import type { GovProfileApplication } from '../../../../types/governmentProfile.types'

type GovernmentProfileApplicationListSectionProps = {
  rows: GovProfileApplication[]
  selectedId?: string | null
  loading?: boolean
  profileLabel: string
  variant?: 'default' | 'workspace' | 'profileMobile'
  actionBusy?: boolean
  onSelectApplication: (id: string) => void
  onDeleteApplication?: (id: string) => void
  formatDateTime: (iso: string | null | undefined) => string
  statusLabel: (status: string) => string
  statusBadgeClass: (status: string) => string
  listPreviewText: (item: GovProfileApplication) => string
}

export default function GovernmentProfileApplicationListSection({
  rows,
  selectedId,
  loading = false,
  profileLabel,
  variant = 'default',
  actionBusy = false,
  onSelectApplication,
  onDeleteApplication,
  formatDateTime,
  statusLabel,
  statusBadgeClass,
  listPreviewText,
}: GovernmentProfileApplicationListSectionProps) {
  if (variant === 'workspace') {
    return (
      <section className="gov-workspace-record-section gov-applications-page__list-section">
        <div className="gov-workspace-record-section__head">
          <div>
            <h3 className="gov-workspace-record-section__title">신청 목록</h3>
            <p className="gov-applications-page__list-desc">{profileLabel} 사업장의 신청 건입니다.</p>
          </div>
          <span className="gov-workspace-record-section__count">총 {rows.length}건</span>
        </div>

        {loading ? <p className="gov-workspace-record-section__empty">신청 목록을 불러오는 중…</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="gov-workspace-record-section__empty">등록된 신청이 없습니다.</p>
        ) : null}

        {rows.length > 0 ? (
          <ul className="gov-workspace-record-list" data-testid="government-profile-application-record-list">
            {rows.map((item) => {
              const selected = item.id === selectedId
              return (
                <li
                  key={item.id}
                  className={`gov-workspace-record-card gov-application-record-card${
                    selected ? ' gov-application-record-card--selected' : ''
                  }`}
                  data-testid="government-profile-application-record-card"
                  data-application-selected={selected ? 'true' : 'false'}
                >
                  <div className="gov-application-record-card__main">
                    <div className="gov-application-record-card__title">
                      #{item.id} {item.title || '제목 없음'}
                    </div>
                    <div className="gov-application-record-card__meta">
                      <span>{item.applicationType || '유형 미지정'}</span>
                      <span>{formatDateTime(item.submittedAt ?? item.createdAt)}</span>
                    </div>
                    <div className="gov-application-record-card__preview">{listPreviewText(item)}</div>
                    <span className={`gov-application-record-card__badge ${statusBadgeClass(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <div className="gov-application-record-card__actions">
                    <FormButton
                      htmlType="button"
                      variant="secondary"
                      size="sm"
                      className="gov-btn gov-btn--secondary gov-btn--sm"
                      disabled={actionBusy}
                      onClick={() => onSelectApplication(item.id)}
                    >
                      상세
                    </FormButton>
                    {onDeleteApplication ? (
                      <FormButton
                        htmlType="button"
                        variant="danger"
                        size="sm"
                        className="gov-btn gov-btn--danger gov-btn--sm"
                        disabled={actionBusy}
                        onClick={() => void onDeleteApplication(item.id)}
                      >
                        삭제
                      </FormButton>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </section>
    )
  }

  if (variant === 'profileMobile') {
    return (
      <section className="government-profile-mobile-card government-profile-mobile-applications-list">
        <div className="government-profile-mobile-applications-list__head">
          <div>
            <h2 className="government-profile-mobile-card__title">신청 목록</h2>
            <p className="government-profile-mobile-card__desc">
              {profileLabel} 사업장의 신청 건을 관리합니다.
            </p>
          </div>
          <span className="government-profile-mobile-applications-list__count">총 {rows.length}건</span>
        </div>

        {loading ? (
          <div className="government-profile-mobile-empty">신청 목록을 불러오는 중…</div>
        ) : null}
        {!loading && rows.length === 0 ? (
          <div className="government-profile-mobile-empty">등록된 신청이 없습니다.</div>
        ) : null}

        {rows.length > 0 ? (
          <ul className="government-profile-mobile-list">
            {rows.map((item) => {
              const openDetail = () => onSelectApplication(item.id)
              const selected = item.id === selectedId
              return (
                <li
                  key={item.id}
                  className={`government-profile-mobile-list-item government-profile-mobile-applications-list-item${
                    selected ? ' government-profile-mobile-applications-list-item--active' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="government-profile-mobile-applications-list-item__tap"
                    aria-label={`#${item.id} ${item.title || '신청'} 상세 보기`}
                    onClick={openDetail}
                  >
                    <div className="government-profile-mobile-applications-list-item__title">
                      #{item.id} {item.title || '제목 없음'}
                    </div>
                    <div className="government-profile-mobile-applications-list-item__meta">
                      {item.applicationType || '유형 미지정'} · {formatDateTime(item.submittedAt ?? item.createdAt)}
                    </div>
                    <div className="government-profile-mobile-applications-list-item__preview">
                      {listPreviewText(item)}
                    </div>
                  </button>
                  <div className="government-profile-mobile-applications-list-item__side">
                    <span className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</span>
                    <FormButton
                      htmlType="button"
                      variant="secondary"
                      className="gov-btn gov-btn--secondary gov-btn--sm"
                      onClick={openDetail}
                    >
                      상세
                    </FormButton>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </section>
    )
  }

  return (
    <section className="claim-requests-page__card claim-requests-page__list-section">
      <div className="claim-requests-page__section-header claim-requests-page__list-header">
        <div className="claim-requests-page__section-heading">
          <h2 className="claim-requests-page__section-title">신청 목록</h2>
          <p className="claim-requests-page__section-description">{profileLabel} 사업장의 신청 건을 관리합니다.</p>
        </div>
        <span className="claim-requests-page__list-count">총 {rows.length}건</span>
      </div>

      {loading ? <div className="claim-requests-page__empty">신청 목록을 불러오는 중…</div> : null}
      {!loading && rows.length === 0 ? (
        <div className="claim-requests-page__empty">등록된 신청이 없습니다.</div>
      ) : null}

      {rows.length > 0 ? (
        <div className="claim-requests-page__request-list">
          {rows.map((item) => {
            const openDetail = () => onSelectApplication(item.id)
            return (
              <article
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`#${item.id} ${item.title || '신청'} 상세 보기`}
                onClick={openDetail}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openDetail()
                  }
                }}
                className={
                  item.id === selectedId
                    ? 'claim-requests-page__request-card claim-requests-page__request-card--active'
                    : 'claim-requests-page__request-card'
                }
              >
                <div className="claim-requests-page__request-main">
                  <div className="claim-requests-page__request-title">
                    #{item.id} {item.title || '제목 없음'}
                  </div>
                  <div className="claim-requests-page__request-meta">
                    {item.applicationType || '유형 미지정'} · {formatDateTime(item.submittedAt ?? item.createdAt)}
                  </div>
                  <div className="claim-requests-page__request-text">{listPreviewText(item)}</div>
                </div>
                <div className="claim-requests-page__request-side">
                  <span className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</span>
                  <FormButton
                    htmlType="button"
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation()
                      openDetail()
                    }}
                  >
                    상세
                  </FormButton>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
