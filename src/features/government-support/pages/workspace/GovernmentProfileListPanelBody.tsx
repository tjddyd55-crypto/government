import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfirmDialog } from '../../../../components/dialog'
import FormButton from '../../../../components/form/FormButton'
import {
  GOVERNMENT_PROFILE_WORKSPACE_BASE_PATH,
  governmentProfileWorkspacePath,
} from '../../config/governmentProfileWorkspaceTabs'
import { getGovernmentProgressStatusLabel } from '../../constants/governmentProgressStatus'
import type { GovSupportProfile } from '../../types/governmentProfile.types'
import GovernmentProfileEditModal from './GovernmentProfileEditModal'
import GovernmentProfileListExpandDetail from './GovernmentProfileListExpandDetail'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'

const EMPTY_LIST_HINT = '등록된 사업장이 없습니다. 사업장을 먼저 등록해 주세요.'

export default function GovernmentProfileListPanelBody() {
  const ws = useGovernmentProfileWorkspaceContext()
  const navigate = useNavigate()
  const { confirm, confirmDialog } = useConfirmDialog()
  const [editTarget, setEditTarget] = useState<GovSupportProfile | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSaveProfile = useCallback(
    async (profileId: string, patch: Partial<GovSupportProfile>) => {
      await ws.saveProfile(profileId, patch)
    },
    [ws],
  )

  const handleDeleteProfile = useCallback(
    async (profile: GovSupportProfile) => {
      const title = profile.businessName || profile.customerName || '이 사업장'
      const ok = await confirm({
        title: '사업장 삭제',
        message: `${title}을(를) 삭제하시겠습니까?\n연결된 파일·상담 데이터는 보관되며 목록에서만 제거됩니다.`,
        confirmLabel: '삭제',
        cancelLabel: '취소',
        tone: 'danger',
      })
      if (!ok) return

      const deletedId = profile.id
      const remaining = ws.profiles.filter((p) => p.id !== deletedId)
      const wasSelected =
        deletedId === ws.selectedProfileIdFromPath || deletedId === ws.selectedId

      setDeletingId(deletedId)
      try {
        await ws.removeProfile(deletedId)
        if (wasSelected) {
          const next = remaining.find((p) => p.id !== deletedId)
          if (next) {
            navigate(governmentProfileWorkspacePath(next.id, 'basic'), { replace: true })
          } else {
            navigate(GOVERNMENT_PROFILE_WORKSPACE_BASE_PATH, { replace: true })
          }
        }
      } finally {
        setDeletingId(null)
      }
    },
    [confirm, navigate, ws],
  )

  return (
    <>
      <header className="customers-page__header">
        <h1 className="customers-page__title">내 사업장/신청</h1>
        <p className="customers-page__subtitle">본인 명의 사업장만 표시됩니다.</p>
        <div className="customers-page__action-row customers-page__action-row--gov">
          <FormButton
            htmlType="button"
            variant="primary"
            size="sm"
            className="gov-btn gov-btn--primary gov-btn--sm"
            onClick={() => void ws.addProfile()}
          >
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
            const expanded = row.id === ws.expandedProfileId
            const title = row.businessName || row.customerName || '이름 없음'
            return (
              <li
                key={row.id}
                className={`record-card customer-card customer-expand-card transition-all duration-150 ease-out${
                  expanded ? ' customer-expand-card--focal government-profile-list-card--expanded' : ''
                }`}
                data-profile-id={row.id}
                data-profile-expanded={expanded ? 'true' : 'false'}
              >
                <div className="customer-expand-card__main">
                  <button
                    type="button"
                    className="customer-expand-summary customer-expand-summary--toggle transition-transform duration-100 ease-out active:scale-[0.98]"
                    aria-expanded={expanded}
                    aria-label={`${title} 상세 ${expanded ? '접기' : '펼치기'}`}
                    onClick={() => ws.onToggleProfileCard(row.id)}
                  >
                    <span className="customer-expand-summary__content w-full min-w-0">
                      <div className="flex justify-between items-center gap-2 w-full min-w-0">
                        <div className="min-w-0 flex-1">
                          <strong className="font-semibold">{title}</strong>
                          <div className="text-sm text-[var(--text-secondary)] customer-card-summary-meta mt-0.5">
                            <div className="gov-customer-list-summary">
                              <div className="gov-customer-list-meta-line">
                                {row.customerName ? `${row.customerName} · ` : null}
                                {row.phone || '연락처 없음'} · {getGovernmentProgressStatusLabel(row.progressStatus)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className="customer-expand-summary__hint shrink-0" aria-hidden="true">
                          {expanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </span>
                  </button>

                  {expanded ? (
                    <GovernmentProfileListExpandDetail
                      profile={row}
                      onEdit={() => setEditTarget(row)}
                      onDelete={() => void handleDeleteProfile(row)}
                      deleting={deletingId === row.id}
                    />
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <GovernmentProfileEditModal
        open={editTarget != null}
        profile={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveProfile}
      />
      {confirmDialog}
    </>
  )
}
