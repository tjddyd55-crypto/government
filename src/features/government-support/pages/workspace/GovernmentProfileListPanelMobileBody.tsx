import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGovernmentConfirmDialog } from '../../hooks/useGovernmentConfirmDialog'
import { useGovernmentProfileListScrollToCard } from '../../hooks/useGovernmentProfileListScrollToCard'
import { isSameGovProfileId, normalizeGovProfileId } from '../../lib/governmentProfileDocumentCategories'
import { collectGovernmentBusinessTypeOptions } from '../../lib/governmentCustomerListDisplay'
import { orderGovernmentProfilesWithSelectedFirst } from '../../lib/orderGovernmentProfilesWithSelectedFirst'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'
import GovernmentProfileEditModal from './GovernmentProfileEditModal'
import GovernmentProfileListToolbarMobile from './customer-list/GovernmentProfileListToolbarMobile'
import GovernmentCustomerCardMobile from './customer-list/GovernmentCustomerCardMobile'
import GovernmentProfileListCardsMobile from './customer-list/GovernmentProfileListCardsMobile'

const EMPTY_LIST_HINT = '등록된 사업장이 없습니다. 사업장을 먼저 등록해 주세요.'

export default function GovernmentProfileListPanelMobileBody() {
  const ws = useGovernmentProfileWorkspaceContext()
  const navigate = useNavigate()
  const { confirm, confirmDialog } = useGovernmentConfirmDialog()
  const [editTarget, setEditTarget] = useState<(typeof ws.profiles)[number] | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const isUserMode = ws.shell.variant === 'user'
  const listRef = useRef<HTMLUListElement>(null)

  useGovernmentProfileListScrollToCard({
    listRef,
    profileId: ws.selectedProfileIdFromPath,
    expandProfileId: isUserMode ? ws.expandedProfileId : null,
    listRevision: ws.profiles.length,
  })

  const businessTypeOptions = useMemo(
    () => collectGovernmentBusinessTypeOptions(ws.profiles),
    [ws.profiles],
  )

  const orderedProfiles = useMemo(
    () => orderGovernmentProfilesWithSelectedFirst(ws.profiles, ws.selectedProfileIdFromPath),
    [ws.profiles, ws.selectedProfileIdFromPath],
  )

  const handleDeleteProfile = useCallback(
    async (profile: (typeof ws.profiles)[number]) => {
      const title = profile.businessName || profile.customerName || '이 사업장'
      const ok = await confirm({
        title: '사업장 삭제',
        message: `${title}을(를) 삭제하시겠습니까?`,
        confirmLabel: '삭제',
        cancelLabel: '취소',
        tone: 'danger',
      })
      if (!ok) return
      const deletedId = normalizeGovProfileId(profile.id)
      setDeletingId(deletedId)
      try {
        await ws.removeProfile(deletedId)
        if (isSameGovProfileId(deletedId, ws.selectedProfileIdFromPath)) {
          navigate(ws.paths.basePath, { replace: true })
        }
      } finally {
        setDeletingId(null)
      }
    },
    [confirm, navigate, ws],
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
        <ul ref={listRef} className={listClassName}>
          {isUserMode
            ? orderedProfiles.map((row) => {
                const profileId = normalizeGovProfileId(row.id)
                const pathId = normalizeGovProfileId(ws.selectedProfileIdFromPath)
                const selected = isSameGovProfileId(profileId, pathId)
                const expanded = isSameGovProfileId(profileId, ws.expandedProfileId)
                return (
                  <GovernmentCustomerCardMobile
                    key={profileId}
                    profile={row}
                    selected={selected}
                    expanded={expanded}
                    deleting={isSameGovProfileId(deletingId, profileId)}
                    statusOptions={ws.statusOptions}
                    onToggle={() => ws.onToggleProfileCard(profileId)}
                    onEdit={() => setEditTarget(row)}
                    onDelete={() => void handleDeleteProfile(row)}
                    onStatusChange={(optionId) => void handleStatusChange(profileId, optionId)}
                  />
                )
              })
            : (
                <GovernmentProfileListCardsMobile
                  profiles={orderedProfiles}
                  showOwnerGroups={ws.shell.showOwnerGroups}
                  selectedProfileIdFromPath={ws.selectedProfileIdFromPath}
                  statusOptions={ws.statusOptions}
                  onSelect={ws.onSelectProfile}
                  onStatusChange={handleStatusChange}
                />
              )}
        </ul>
      )}

      {isUserMode ? (
        <GovernmentProfileEditModal
          open={editTarget != null}
          profile={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={ws.saveProfile}
        />
      ) : null}
      {isUserMode ? confirmDialog : null}
    </>
  )
}
