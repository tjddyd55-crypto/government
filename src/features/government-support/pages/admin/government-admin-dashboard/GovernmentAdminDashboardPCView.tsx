import { Link } from 'react-router-dom'
import type { GovernmentAdminDashboardViewProps } from './governmentAdminDashboardViewProps'
import {
  documentRequestStatusLabel,
  formatDashboardDateTime,
  inquiryStatusLabel,
  signatureStatusLabel,
} from './governmentAdminDashboardViewProps'

export function PlatformHubSection({ cards }: Pick<GovernmentAdminDashboardViewProps, 'platformCards'>) {
  return (
    <div className="platform-admin-page__grid">
      {cards.map((c) => (
        <Link key={c.to} to={c.to} className="platform-admin-page__card">
          <h2 className="platform-admin-page__card-title">{c.title}</h2>
          <p className="platform-admin-page__card-desc">{c.description}</p>
        </Link>
      ))}
    </div>
  )
}

export function OperationalDashboardBody({
  loading,
  error,
  summary,
  showUserMgmt,
}: Pick<GovernmentAdminDashboardViewProps, 'loading' | 'error' | 'summary' | 'showUserMgmt'>) {
  if (loading) {
    return <p className="government-admin-page__msg">오늘 처리할 업무를 불러오는 중…</p>
  }
  if (error) {
    return <p className="government-admin-page__error">{error}</p>
  }
  if (!summary) {
    return <p className="government-admin-page__muted">표시할 운영 요약이 없습니다.</p>
  }

  const statItems = [
    { label: '요청서류 · 제출 대기', value: summary.pendingDocumentRequests, hint: '이용자 미제출' },
    { label: '요청서류 · 확인 필요', value: summary.submittedDocumentRequests, hint: '제출·일부 제출' },
    { label: '문의 · 미답변', value: summary.unansweredInquiries, hint: 'open 상태' },
    { label: '문의 · 진행 중', value: summary.inProgressInquiries, hint: '답변 후 종료 전' },
    { label: '전자서명 · 발송 중', value: summary.sentSignatures, hint: '미완료' },
    { label: '전자서명 · 완료', value: summary.completedSignatures, hint: '서명 완료' },
    { label: '완료 PDF 확인', value: summary.completedSignaturesNeedingReview, hint: '최근 30일' },
    { label: '전자서명 · 취소/만료', value: summary.cancelledSignatures + summary.expiredSignatures, hint: '취소·만료 합계' },
    { label: '내 담당 · 미답변 문의', value: summary.myAssignedOpenInquiries, hint: 'open · 나에게 배정' },
    { label: '내 담당 · 제출 확인', value: summary.myAssignedDocumentRequestsReview, hint: '요청서류' },
    { label: '미지정 · 미답변 문의', value: summary.unassignedOpenInquiries, hint: '담당자 없음' },
    { label: '미지정 · 제출 확인', value: summary.unassignedDocumentRequestsReview, hint: '요청서류' },
    { label: '프로그램 이용자', value: summary.programUsersCount, hint: '내 대행사' },
    { label: '등록 사업장', value: summary.profilesCount, hint: '프로필 수' },
  ]

  const shortcutCards = [
    {
      to: '/government/admin/document-requests',
      title: '요청서류 관리',
      description: `제출 대기 ${summary.pendingDocumentRequests}건 · 확인 ${summary.submittedDocumentRequests}건`,
    },
    {
      to: '/government/admin/inquiries',
      title: '문의 관리',
      description: `미답변 ${summary.unansweredInquiries}건 · 진행 ${summary.inProgressInquiries}건`,
    },
    ...(showUserMgmt
      ? [
          {
            to: '/government/admin/program-users',
            title: '이용자 관리',
            description: `등록 이용자 ${summary.programUsersCount}명`,
          },
        ]
      : []),
    {
      to: '/government/admin/notices',
      title: '공지 작성',
      description: '운영 공지·전달사항 게시',
    },
    {
      to: '/government/admin/resources',
      title: '자료 등록',
      description: '자료실·서식함 파일 관리',
    },
  ]

  return (
    <>
      <section className="government-admin-dashboard__section" aria-labelledby="gov-admin-dash-stats">
        <h2 id="gov-admin-dash-stats" className="government-admin-dashboard__section-title">
          오늘 처리할 업무
        </h2>
        <div className="government-admin-dashboard__stats">
          {statItems.map((item) => (
            <div key={item.label} className="government-admin-dashboard__stat-card">
              <span className="government-admin-dashboard__stat-label">{item.label}</span>
              <strong>{item.value.toLocaleString()}</strong>
              <span className="government-admin-dashboard__stat-hint">{item.hint}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="government-admin-dashboard__section" aria-labelledby="gov-admin-dash-shortcuts">
        <h2 id="gov-admin-dash-shortcuts" className="government-admin-dashboard__section-title">
          바로가기
        </h2>
        <div className="platform-admin-page__grid">
          {shortcutCards.map((c) => (
            <Link key={c.to} to={c.to} className="platform-admin-page__card">
              <h3 className="platform-admin-page__card-title">{c.title}</h3>
              <p className="platform-admin-page__card-desc">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="government-admin-dashboard__section" aria-labelledby="gov-admin-dash-notifications">
        <div className="government-admin-dashboard__panel-head">
          <h2 id="gov-admin-dash-notifications" className="government-admin-dashboard__section-title">
            최근 알림
            {summary.unreadNotifications > 0 ? (
              <span className="government-admin-dashboard__badge">{summary.unreadNotifications}</span>
            ) : null}
          </h2>
          <Link to="/government/admin/notifications" className="government-admin-dashboard__panel-link">
            전체 보기
          </Link>
        </div>
        {summary.recentNotifications.length === 0 ? (
          <p className="government-admin-page__muted">최근 알림이 없습니다.</p>
        ) : (
          <ul className="government-admin-dashboard__list">
            {summary.recentNotifications.map((row) => (
              <li key={row.id}>
                <Link
                  to={row.targetUrl || '/government/admin/notifications'}
                  className={[
                    'government-admin-dashboard__list-link',
                    !row.isRead ? 'government-admin-dashboard__list-link--unread' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="government-admin-dashboard__list-title">{row.title || row.message}</span>
                  <span className="government-admin-dashboard__list-meta">
                    {row.message} · {formatDashboardDateTime(row.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="government-admin-dashboard__section" aria-labelledby="gov-admin-dash-recent">
        <h2 id="gov-admin-dash-recent" className="government-admin-dashboard__section-title">
          최근 처리 대상
        </h2>
        <div className="government-admin-dashboard__panels">
          <div className="government-admin-dashboard__panel">
            <div className="government-admin-dashboard__panel-head">
              <h3 className="government-admin-dashboard__panel-title">요청서류</h3>
              <Link to="/government/admin/document-requests" className="government-admin-dashboard__panel-link">
                전체 보기
              </Link>
            </div>
            {summary.recentDocumentRequests.length === 0 ? (
              <p className="government-admin-page__muted">최근 요청이 없습니다.</p>
            ) : (
              <ul className="government-admin-dashboard__list">
                {summary.recentDocumentRequests.map((row) => (
                  <li key={row.id}>
                    <Link to="/government/admin/document-requests" className="government-admin-dashboard__list-link">
                      <span className="government-admin-dashboard__list-title">{row.title || `요청 #${row.id}`}</span>
                      <span className="government-admin-dashboard__list-meta">
                        {row.profileDisplayName || '사업장'} · {documentRequestStatusLabel(row.status)} ·{' '}
                        {formatDashboardDateTime(row.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="government-admin-dashboard__panel">
            <div className="government-admin-dashboard__panel-head">
              <h3 className="government-admin-dashboard__panel-title">문의</h3>
              <Link to="/government/admin/inquiries" className="government-admin-dashboard__panel-link">
                전체 보기
              </Link>
            </div>
            {summary.recentInquiries.length === 0 ? (
              <p className="government-admin-page__muted">최근 문의가 없습니다.</p>
            ) : (
              <ul className="government-admin-dashboard__list">
                {summary.recentInquiries.map((row) => (
                  <li key={row.id}>
                    <Link to="/government/admin/inquiries" className="government-admin-dashboard__list-link">
                      <span className="government-admin-dashboard__list-title">{row.title || `문의 #${row.id}`}</span>
                      <span className="government-admin-dashboard__list-meta">
                        {row.profileDisplayName || '사업장'} · {inquiryStatusLabel(row.status)} ·{' '}
                        {formatDashboardDateTime(row.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="government-admin-dashboard__panel">
            <div className="government-admin-dashboard__panel-head">
              <h3 className="government-admin-dashboard__panel-title">전자서명</h3>
            </div>
            {summary.recentSignatures.length === 0 ? (
              <p className="government-admin-page__muted">최근 발송 내역이 없습니다.</p>
            ) : (
              <ul className="government-admin-dashboard__list">
                {summary.recentSignatures.map((row) => (
                  <li key={row.id}>
                    <span className="government-admin-dashboard__list-link government-admin-dashboard__list-link--static">
                      <span className="government-admin-dashboard__list-title">
                        {row.profileDisplayName || '사업장'} · {signatureStatusLabel(row.status)}
                      </span>
                      <span className="government-admin-dashboard__list-meta">
                        {formatDashboardDateTime(row.completedAt ?? row.sentAt ?? row.updatedAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="government-admin-dashboard__panel">
            <div className="government-admin-dashboard__panel-head">
              <h3 className="government-admin-dashboard__panel-title">이용자 · 사업장</h3>
              {showUserMgmt ? (
                <Link to="/government/admin/program-users" className="government-admin-dashboard__panel-link">
                  이용자 보기
                </Link>
              ) : null}
            </div>
            <h4 className="government-admin-dashboard__subheading">최근 가입 이용자</h4>
            {summary.recentProgramUsers.length === 0 ? (
              <p className="government-admin-page__muted">최근 가입 이용자가 없습니다.</p>
            ) : (
              <ul className="government-admin-dashboard__list">
                {summary.recentProgramUsers.map((row) => (
                  <li key={row.id}>
                    <span className="government-admin-dashboard__list-link government-admin-dashboard__list-link--static">
                      <span className="government-admin-dashboard__list-title">
                        {row.displayName || row.username}
                      </span>
                      <span className="government-admin-dashboard__list-meta">
                        @{row.username} · {formatDashboardDateTime(row.createdAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <h4 className="government-admin-dashboard__subheading">최근 등록 사업장</h4>
            {summary.recentProfiles.length === 0 ? (
              <p className="government-admin-page__muted">최근 등록 사업장이 없습니다.</p>
            ) : (
              <ul className="government-admin-dashboard__list">
                {summary.recentProfiles.map((row) => (
                  <li key={row.id}>
                    <span className="government-admin-dashboard__list-link government-admin-dashboard__list-link--static">
                      <span className="government-admin-dashboard__list-title">
                        {row.businessName || `사업장 #${row.id}`}
                      </span>
                      <span className="government-admin-dashboard__list-meta">
                        #{row.id} · {formatDashboardDateTime(row.createdAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

export default function GovernmentAdminDashboardPCView(props: GovernmentAdminDashboardViewProps) {
  const isPlatform = props.variant === 'platform'

  return (
    <main className="page platform-admin-page government-admin-dashboard-page government-admin-dashboard-page--pc platform-admin-page--pc page--with-back">
      <header className="platform-admin-page__head">
        <h1 className="platform-admin-page__title">
          {isPlatform ? '정부지원 CRM 관리' : '운영 대시보드'}
        </h1>
        <p className="platform-admin-page__lede">
          {isPlatform
            ? '대행사·대행사 직원·이용자·운영 공지/자료를 관리합니다. 사업장 전체 목록은 제공하지 않으며, 이용자 워크스페이스 또는 이용자 상세 요약에서만 확인합니다.'
            : '요청서류·문의·전자서명·이용자 요약을 한 화면에서 확인합니다. 상세는 각 관리 메뉴에서 처리하세요.'}
        </p>
      </header>
      {isPlatform ? (
        <PlatformHubSection cards={props.platformCards} />
      ) : (
        <>
          {props.signatureSetupCards.length > 0 ? (
            <section className="government-admin-dashboard__section" aria-labelledby="gov-admin-dash-signature-setup">
              <h2 id="gov-admin-dash-signature-setup" className="government-admin-dashboard__section-title">
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
