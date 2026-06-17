import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGovernmentConfirmDialog } from '../../hooks/useGovernmentConfirmDialog'
import {
  GOVERNMENT_PROFILE_WORKSPACE_BASE_PATH,
  governmentProfileWorkspacePath,
} from '../../config/governmentProfileWorkspaceTabs'
import GovernmentProfileEditModal from './GovernmentProfileEditModal'
import { isSameGovProfileId, normalizeGovProfileId } from '../../lib/governmentProfileDocumentCategories'
import { collectGovernmentBusinessTypeOptions } from '../../lib/governmentCustomerListDisplay'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'
import GovernmentProfileListToolbarPC from './customer-list/GovernmentProfileListToolbarPC'
import GovernmentCustomerCardPC from './customer-list/GovernmentCustomerCardPC'

const EMPTY_LIST_HINT = '등록된 사업장이 없습니다. 사업장을 먼저 등록해 주세요.'

export default function GovernmentProfileListPanelPCBody() {
  const ws = useGovernmentProfileWorkspaceContext()
  const navigate = useNavigate()
  const { confirm, confirmDialog } = useGovernmentConfirmDialog()
  const [editTarget, setEditTarget] = useState<(typeof ws.profiles)[number] | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const businessTypeOptions = useMemo(
    () => collectGovernmentBusinessTypeOptions(ws.profiles),
    [ws.profiles],
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
          navigate(GOVERNMENT_PROFILE_WORKSPACE_BASE_PATH, { replace: true })
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

  return (
    <>
      <header className="customers-page__header">
        <h1 className="customers-page__title">내 사업장/신청</h1>
        <p className="customers-page__subtitle">본인 명의 사업장만 표시됩니다.</p>
      </header>

      <GovernmentProfileListToolbarPC
        search={ws.listSearch}
        customerStatusOptionId={ws.listCustomerStatusFilter}
        businessType={ws.listBusinessTypeFilter}
        businessTypeOptions={businessTypeOptions}
        statusOptions={ws.statusOptions}
        onSearchChange={ws.setListSearch}
        onCustomerStatusChange={ws.setListCustomerStatusFilter}
        onBusinessTypeChange={ws.setListBusinessTypeFilter}
        onAddProfile={() => void ws.addProfile()}
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
        <ul className="record-list customer-expand-list customer-list customers-page__customer-list government-profile-list-panel__list">
          {ws.profiles.map((row) => {
            const profileId = normalizeGovProfileId(row.id)
            const pathId = normalizeGovProfileId(ws.selectedProfileIdFromPath)
            const selected = isSameGovProfileId(profileId, pathId)
            const expanded = isSameGovProfileId(profileId, ws.expandedProfileId)
            return (
              <GovernmentCustomerCardPC
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
          })}
        </ul>
      )}

      <GovernmentProfileEditModal
        open={editTarget != null}
        profile={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={ws.saveProfile}
      />
      {confirmDialog}
    </>
  )
}
