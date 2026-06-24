import { governmentAdminHubTitle } from '../../../../../config/governmentAppMeta'
import { Link } from 'react-router-dom'
import { LoadingState } from '../../../../../components/feedback'
import { GOVERNMENT_ROUTE_PATHS } from '../../../constants/governmentRouteKeys'
import type { GovernmentAdminDashboardViewProps } from './governmentAdminDashboardViewProps'
import {
  documentRequestStatusLabel,
  formatDashboardDateTime,
  inquiryStatusLabel,
  signatureStatusLabel,
} from './governmentAdminDashboardViewProps'

export function PlatformHubSection({
  cards,
  mobile,
}: Pick<GovernmentAdminDashboardViewProps, 'platformCards'> & { mobile?: boolean }) {
  return (
    <div className={`platform-admin-page__grid${mobile ? ' platform-admin-page__grid--mobile' : ''}`}>
      {cards.map((c) => (
        <Link key={c.to} to={c.to} className="platform-admin-page__card">
          <h2 className="platform-admin-page__card-title">{c.title}</h2>
          <p className="platform-admin-page__card-desc">{c.description}</p>
        </Link>
      ))}
    </div>
  )
}

function DashboardListPanel(props: {
  title: string
  linkTo?: string
  linkLabel?: string
  emptyMessage: string
  items: { key: string; title: string; meta: string; href?: string; unread?: boolean }[]
}) {
  return (
    <section className="platform-admin-page__panel">
      <div className="platform-admin-page__head-row">
        <h3 className="platform-admin-page__panel-title">{props.title}</h3>
        {props.linkTo && props.linkLabel ? (
          <Link to={props.linkTo} className="platform-admin-page__head-link">
            {props.linkLabel}
          </Link>
        ) : null}
      </div>
      {props.items.length === 0 ? (
        <p className="platform-admin-page__muted m-0">{props.emptyMessage}</p>
      ) : (
        <ul className="platform-admin-page__card-list">
          {props.items.map((item) => {
            const cardClass = [
              'platform-admin-page__stack-card',
              item.unread ? 'platform-admin-page__stack-card--highlight' : '',
            ]
              .filter(Boolean)
              .join(' ')
            const body = (
              <>
                <div className="platform-admin-page__stack-title">{item.title}</div>
                <div className="platform-admin-page__stack-meta">{item.meta}</div>
              </>
            )
            return (
              <li key={item.key}>
                {item.href ? (
                  <Link to={item.href} className={cardClass}>
                    {body}
                  </Link>
                ) : (
                  <div className={cardClass}>{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function OperationalDashboardBody({
  loading,
  error,
  summary,
  showUserMgmt,
  mobile,
}: Pick<GovernmentAdminDashboardViewProps, 'loading' | 'error' | 'summary' | 'showUserMgmt'> & {
  mobile?: boolean
}) {
  if (loading) {
    return (
      <LoadingState
        message="오늘 처리할 업무를 불러오는 중…"
        className="platform-admin-page__muted m-0"
      />
    )
  }
  if (error) {
    return null
  }
  if (!summary) {
    return <p className="platform-admin-page__muted m-0">표시할 운영 요약이 없습니다.</p>
  }

  const statItems = [
    { label: '요청서류 · 제출 대기', value: summary.pendingDocumentRequests, hint: '이용자 미제출' },
    { label: '요청서류 · 확인 필요', value: summary.submittedDocumentRequests, hint: '제출·일부 제출' },
    { label: '문의 · 미답변', value: summary.unansweredInquiries, hint: 'open 상태' },
    { label: '문의 · 진행 중', value: summary.inProgressInquiries, hint: '답변 후 종료 전' },
    { label: '전자서명 · 발송 중', value: summary.sentSignatures, hint: '미완료' },
    { label: '전자서명 · 완료', value: summary.completedSignatures, hint: '서명 완료' },
    { label: '완료 PDF 확인', value: summary.completedSignaturesNeedingReview, hint: '최근 30일' },
    {
      label: '전자서명 · 취소/만료',
      value: summary.cancelledSignatures + summary.expiredSignatures,
      hint: '취소·만료 합계',
    },
    { label: '내 담당 · 미답변 문의', value: summary.myAssignedOpenInquiries, hint: 'open · 나에게 배정' },
    { label: '내 담당 · 제출 확인', value: summary.myAssignedDocumentRequestsReview, hint: '요청서류' },
    { label: '미지정 · 미답변 문의', value: summary.unassignedOpenInquiries, hint: '담당자 없음' },
    { label: '미지정 · 제출 확인', value: summary.unassignedDocumentRequestsReview, hint: '요청서류' },
    { label: '프로그램 이용자', value: summary.programUsersCount, hint: '내 대행사' },
    { label: '등록 사업장', value: summary.profilesCount, hint: '프로필 수' },
  ]

  const shortcutCards = [
    {
      to: GOVERNMENT_ROUTE_PATHS.adminDocumentRequests,
      title: '요청서류 관리',
      description: `제출 대기 ${summary.pendingDocumentRequests}건 · 확인 ${summary.submittedDocumentRequests}건`,
    },
    {
      to: GOVERNMENT_ROUTE_PATHS.adminInquiries,
      title: '문의 관리',
      description: `미답변 ${summary.unansweredInquiries}건 · 진행 ${summary.inProgressInquiries}건`,
    },
    ...(showUserMgmt
      ? [
          {
            to: GOVERNMENT_ROUTE_PATHS.adminProgramUsers,
            title: '이용자 관리',
            description: `등록 이용자 ${summary.programUsersCount}명`,
          },
        ]
      : []),
    {
      to: GOVERNMENT_ROUTE_PATHS.adminNotices,
      title: '공지 작성',
      description: '운영 공지·전달사항 게시',
    },
    {
      to: GOVERNMENT_ROUTE_PATHS.adminResources,
      title: '자료 등록',
      description: '자료실·서식함 파일 관리',
    },
  ]

  return (
    <>
      <section className="platform-admin-page__section" aria-labelledby="gov-admin-dash-stats">
        <h2 id="gov-admin-dash-stats" className="platform-admin-page__subhead">
          오늘 처리할 업무
        </h2>
        <div className="platform-admin-page__summary-grid">
          {statItems.map((item) => (
            <div key={item.label} className="platform-admin-page__summary-card">
              <h3 className="platform-admin-page__summary-card-title">{item.label}</h3>
              <p className="platform-admin-page__stat">
                <strong>{item.value.toLocaleString()}</strong>
              </p>
              <p className="platform-admin-page__stat-note platform-admin-page__muted">{item.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="platform-admin-page__section" aria-labelledby="gov-admin-dash-shortcuts">
        <h2 id="gov-admin-dash-shortcuts" className="platform-admin-page__subhead">
          바로가기
        </h2>
        <div className={`platform-admin-page__grid${mobile ? ' platform-admin-page__grid--mobile' : ''}`}>
          {shortcutCards.map((c) => (
            <Link key={c.to} to={c.to} className="platform-admin-page__card">
              <h2 className="platform-admin-page__card-title">{c.title}</h2>
              <p className="platform-admin-page__card-desc">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="platform-admin-page__section" aria-labelledby="gov-admin-dash-notifications">
        <div className="platform-admin-page__head-row">
          <h2 id="gov-admin-dash-notifications" className="platform-admin-page__subhead platform-admin-page__subhead--inline">
            최근 알림
            {summary.unreadNotifications > 0 ? (
              <span className="government-admin-dashboard__badge">{summary.unreadNotifications}</span>
            ) : null}
          </h2>
          <Link to={GOVERNMENT_ROUTE_PATHS.adminNotifications} className="platform-admin-page__head-link">
            전체 보기
          </Link>
        </div>
        {summary.recentNotifications.length === 0 ? (
          <p className="platform-admin-page__muted m-0">최근 알림이 없습니다.</p>
        ) : (
          <ul className="platform-admin-page__card-list">
            {summary.recentNotifications.map((row) => (
              <li key={row.id}>
                <Link
                  to={row.targetUrl || GOVERNMENT_ROUTE_PATHS.adminNotifications}
                  className={[
                    'platform-admin-page__stack-card',
                    !row.isRead ? 'platform-admin-page__stack-card--highlight' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="platform-admin-page__stack-title">{row.title || row.message}</div>
                  <div className="platform-admin-page__stack-meta">
                    {row.message} · {formatDashboardDateTime(row.createdAt)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="platform-admin-page__section" aria-labelledby="gov-admin-dash-recent">
        <h2 id="gov-admin-dash-recent" className="platform-admin-page__subhead">
          최근 처리 대상
        </h2>
        <div className="platform-admin-page__grid-two">
          <DashboardListPanel
            title="요청서류"
            linkTo={GOVERNMENT_ROUTE_PATHS.adminDocumentRequests}
            linkLabel="전체 보기"
            emptyMessage="최근 요청이 없습니다."
            items={summary.recentDocumentRequests.map((row) => ({
              key: String(row.id),
              title: row.title || `요청 #${row.id}`,
              meta: `${row.profileDisplayName || '사업장'} · ${documentRequestStatusLabel(row.status)} · ${formatDashboardDateTime(row.updatedAt)}`,
              href: GOVERNMENT_ROUTE_PATHS.adminDocumentRequests,
            }))}
          />
          <DashboardListPanel
            title="문의"
            linkTo={GOVERNMENT_ROUTE_PATHS.adminInquiries}
            linkLabel="전체 보기"
            emptyMessage="최근 문의가 없습니다."
            items={summary.recentInquiries.map((row) => ({
              key: String(row.id),
              title: row.title || `문의 #${row.id}`,
              meta: `${row.profileDisplayName || '사업장'} · ${inquiryStatusLabel(row.status)} · ${formatDashboardDateTime(row.updatedAt)}`,
              href: GOVERNMENT_ROUTE_PATHS.adminInquiries,
            }))}
          />
          <DashboardListPanel
            title="전자서명"
            emptyMessage="최근 발송 내역이 없습니다."
            items={summary.recentSignatures.map((row) => ({
              key: String(row.id),
              title: `${row.profileDisplayName || '사업장'} · ${signatureStatusLabel(row.status)}`,
              meta: formatDashboardDateTime(row.completedAt ?? row.sentAt ?? row.updatedAt),
            }))}
          />
          <section className="platform-admin-page__panel">
            <div className="platform-admin-page__head-row">
              <h3 className="platform-admin-page__panel-title">이용자 · 사업장</h3>
              {showUserMgmt ? (
                <Link to="/government/admin/program-users" className="platform-admin-page__head-link">
                  이용자 보기
                </Link>
              ) : null}
            </div>
            <h4 className="platform-admin-page__subhead platform-admin-page__subhead--nested">최근 가입 이용자</h4>
            {summary.recentProgramUsers.length === 0 ? (
              <p className="platform-admin-page__muted m-0">최근 가입 이용자가 없습니다.</p>
            ) : (
              <ul className="platform-admin-page__card-list">
                {summary.recentProgramUsers.map((row) => (
                  <li key={row.id}>
                    <div className="platform-admin-page__stack-card">
                      <div className="platform-admin-page__stack-title">{row.displayName || row.username}</div>
                      <div className="platform-admin-page__stack-meta">
                        @{row.username} · {formatDashboardDateTime(row.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <h4 className="platform-admin-page__subhead platform-admin-page__subhead--nested">최근 등록 사업장</h4>
            {summary.recentProfiles.length === 0 ? (
              <p className="platform-admin-page__muted m-0">최근 등록 사업장이 없습니다.</p>
            ) : (
              <ul className="platform-admin-page__card-list">
                {summary.recentProfiles.map((row) => (
                  <li key={row.id}>
                    <div className="platform-admin-page__stack-card">
                      <div className="platform-admin-page__stack-title">
                        {row.businessName || `사업장 #${row.id}`}
                      </div>
                      <div className="platform-admin-page__stack-meta">
                        #{row.id} · {formatDashboardDateTime(row.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </>
  )
}

export default function GovernmentAdminDashboardPCView(props: GovernmentAdminDashboardViewProps) {
  const isPlatform = props.variant === 'platform'
  const operationalLede =
    '요청서류·문의·전자서명·이용자 요약을 한 화면에서 확인합니다. 상세는 각 관리 메뉴에서 처리하세요.'
  const platformLede =
    '대행사·대행사 직원·이용자·운영 공지/자료를 관리합니다. 사업장 전체 목록은 제공하지 않으며, 이용자 워크스페이스 또는 이용자 상세 요약에서만 확인합니다.'

  return (
    <main className="page platform-admin-page government-admin-dashboard-page government-admin-dashboard-page--pc platform-admin-page--pc page--with-back">
      <header className="platform-admin-page__head">
        <h1 className="platform-admin-page__title">
          {governmentAdminHubTitle(isPlatform)}
        </h1>
        <p className="platform-admin-page__lede">
          {!isPlatform && props.error ? props.error : isPlatform ? platformLede : operationalLede}
        </p>
      </header>
      {isPlatform ? (
        <PlatformHubSection cards={props.platformCards} />
      ) : (
        <>
          {props.signatureSetupCards.length > 0 ? (
            <section className="platform-admin-page__section" aria-labelledby="gov-admin-dash-signature-setup">
              <h2 id="gov-admin-dash-signature-setup" className="platform-admin-page__subhead">
                전자서명 준비
              </h2>
              <PlatformHubSection cards={props.signatureSetupCards} />
            </section>
          ) : null}
          <OperationalDashboardBody {...props} />
        </>
      )}
    </main>
  )
}
