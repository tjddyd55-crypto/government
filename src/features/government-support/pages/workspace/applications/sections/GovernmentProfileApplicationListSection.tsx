import { FormButton } from '../../../../../../components/form'
import type { GovProfileApplication } from '../../../../types/governmentProfile.types'

type GovernmentProfileApplicationListSectionProps = {
  rows: GovProfileApplication[]
  selectedId?: string | null
  loading?: boolean
  profileLabel: string
  onSelectApplication: (id: string) => void
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
  onSelectApplication,
  formatDateTime,
  statusLabel,
  statusBadgeClass,
  listPreviewText,
}: GovernmentProfileApplicationListSectionProps) {
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
