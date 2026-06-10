import FormButton from '../../../../components/form/FormButton'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'

const EMPTY_LIST_HINT = '등록된 사업장이 없습니다. 사업장을 먼저 등록해 주세요.'

export default function GovernmentProfileListPanelBody() {
  const ws = useGovernmentProfileWorkspaceContext()

  return (
    <>
      <header className="customers-page__header">
        <h1 className="customers-page__title">내 사업장/신청</h1>
        <p className="customers-page__subtitle">본인 명의 사업장만 표시됩니다.</p>
        <div className="customers-page__action-row customers-page__action-row--gov">
          <FormButton htmlType="button" variant="secondary" size="sm" onClick={() => void ws.addProfile()}>
            + 사업장 추가
          </FormButton>
        </div>
      </header>

      {ws.error ? (
        <p className="government-user-section__error customers-page__list-status">{ws.error}</p>
      ) : null}
      {ws.feedback ? (
        <p className="government-user-section__feedback customers-page__list-status">{ws.feedback}</p>
      ) : null}

      {ws.loading ? (
        <p className="government-page__muted customers-page__list-status customers-page__list-status--pad">
          불러오는 중…
        </p>
      ) : ws.profiles.length === 0 ? (
        <p className="government-page__muted customers-page__list-status customers-page__list-status--pad">
          {EMPTY_LIST_HINT}
        </p>
      ) : (
        <ul className="record-list customer-expand-list customer-list customers-page__customer-list">
          {ws.profiles.map((row) => {
            const active = row.id === ws.selectedProfileIdFromPath || row.id === ws.selectedId
            const title = row.businessName || row.customerName || '이름 없음'
            return (
              <li
                key={row.id}
                className={`customer-expand-card${active ? ' customer-expand-card--focal' : ''}`}
                data-profile-id={row.id}
              >
                <button
                  type="button"
                  className="customer-expand-summary customer-expand-summary--toggle"
                  aria-expanded={active}
                  onClick={() => ws.onSelectProfile(row.id)}
                >
                  <span className="customer-expand-summary__content w-full min-w-0">
                    <strong>{title}</strong>
                    <span className="gov-customer-list-meta-line">
                      {row.customerName ? `${row.customerName} · ` : null}
                      {row.phone || '연락처 없음'} · {row.progressStatus}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
