import { useCallback, useMemo } from 'react'
import { collectGovernmentBusinessTypeOptions } from '../../lib/governmentCustomerListDisplay'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'
import GovernmentProfileListToolbarMobile from './customer-list/GovernmentProfileListToolbarMobile'
import GovernmentProfileListCardsMobile from './customer-list/GovernmentProfileListCardsMobile'

const EMPTY_LIST_HINT = '등록된 사업장이 없습니다. 사업장을 먼저 등록해 주세요.'

export default function GovernmentProfileListPanelMobileBody() {
  const ws = useGovernmentProfileWorkspaceContext()

  const businessTypeOptions = useMemo(
    () => collectGovernmentBusinessTypeOptions(ws.profiles),
    [ws.profiles],
  )

  const handleStatusChange = useCallback(
    async (profileId: string, optionId: string | null) => {
      await ws.updateProfileCustomerStatus(profileId, optionId)
    },
    [ws],
  )

  const listClassName = ws.shell.showOwnerGroups
    ? 'government-profile-list-panel__list government-profile-list-panel__list--mobile government-profile-list-panel__list--grouped'
    : 'government-profile-list-panel__list government-profile-list-panel__list--mobile'

  return (
    <>
      <header className="customers-page__header">
        <h1 className="customers-page__title">{ws.shell.listTitle}</h1>
        <p className="customers-page__subtitle">{ws.shell.listSubtitle}</p>
      </header>

      <GovernmentProfileListToolbarMobile
        search={ws.listSearch}
        customerStatusOptionId={ws.listCustomerStatusFilter}
        businessType={ws.listBusinessTypeFilter}
        businessTypeOptions={businessTypeOptions}
        statusOptions={ws.statusOptions}
        onSearchChange={ws.setListSearch}
        onCustomerStatusChange={ws.setListCustomerStatusFilter}
        onBusinessTypeChange={ws.setListBusinessTypeFilter}
        onAddProfile={ws.requestAddProfile}
        showOwnerFilter={ws.shell.showOwnerFilter}
        ownerUserId={ws.listOwnerUserFilter}
        ownerOptions={ws.ownerOptions}
        onOwnerUserChange={ws.setListOwnerUserFilter}
        showTenantFilter={ws.shell.showTenantFilter}
        tenantId={ws.listTenantId}
        tenantOptions={ws.tenantOptions}
        onTenantChange={ws.setListTenantId}
      />

      {ws.error ? <p className="government-user-section__error customers-page__list-status">{ws.error}</p> : null}
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
        <ul className={listClassName}>
          <GovernmentProfileListCardsMobile
            profiles={ws.profiles}
            showOwnerGroups={ws.shell.showOwnerGroups}
            selectedProfileIdFromPath={ws.selectedProfileIdFromPath}
            statusOptions={ws.statusOptions}
            onSelect={ws.onSelectProfile}
            onStatusChange={handleStatusChange}
          />
        </ul>
      )}
    </>
  )
}
