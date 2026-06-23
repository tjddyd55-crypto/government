import { useCallback, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { EmptyState } from '../../../../components/feedback'
import { FormButton } from '../../../../components/form'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'
import { getGovernmentProgressStatusLabel } from '../../constants/governmentProgressStatus'
import type { GovSupportProfile } from '../../types/governmentProfile.types'

type OutletContext = {
  selectedProfileId: string | null
}

function profileTitle(row: GovSupportProfile): string {
  return row.businessName || row.customerName || '이름 없음'
}

function formatPhone(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return String(phone ?? '').trim() || '연락처 없음'
}

export default function GovernmentProfileWorkspaceHomePage() {
  const { selectedProfileId } = useOutletContext<OutletContext>()
  const ws = useGovernmentProfileWorkspaceContext()

  const quickProfiles = useMemo(() => ws.profiles.slice(0, 5), [ws.profiles])

  const openProfile = useCallback(
    (profileId: string) => {
      ws.onSelectProfile(profileId)
    },
    [ws],
  )

  if (ws.shell.variant === 'agencyAdmin') {
    return <EmptyState message="사업장을 선택해 주세요." />
  }

  return (
    <section className="customer-workspace-home customer-workspace-home--landing">
      <div className="customer-workspace-home__intro">
        <h3 className="customer-workspace-home__title">사업장 작업영역</h3>
        <p className="customer-workspace-home__desc">
          좌측 목록에서 사업장을 선택한 뒤, 상단 버튼으로 기본정보·서류/파일·상담·메모·진행·전자서명·신청 관리 작업을
          진행하세요.
        </p>
        <p className="customer-workspace-home__selected">
          현재 선택: {selectedProfileId ? selectedProfileId.slice(0, 8) : '없음'}
          {ws.profiles.length > 0 ? ` · 등록 ${ws.profiles.length}건` : null}
        </p>
      </div>

      <section className="customer-workspace-recent" aria-label="빠른 열기 사업장">
        <div className="customer-workspace-recent__header">
          <div>
            <h4>빠른 열기</h4>
            <p>등록된 사업장을 바로 열어 작업을 시작합니다.</p>
          </div>
          <FormButton
            htmlType="button"
            variant="secondary"
            onClick={() => void ws.reloadProfiles()}
            loading={ws.loading}
          >
            새로고침
          </FormButton>
        </div>

        {ws.error ? <p className="customer-workspace-recent__error">{ws.error}</p> : null}
        {ws.loading && quickProfiles.length === 0 ? (
          <div className="customer-workspace-recent__empty">불러오는 중…</div>
        ) : null}
        {!ws.loading && quickProfiles.length === 0 ? (
          <div className="customer-workspace-recent__empty">등록된 사업장이 없습니다.</div>
        ) : null}

        {quickProfiles.length > 0 ? (
          <div className="customer-workspace-recent__list">
            {quickProfiles.map((row, index) => (
              <button
                key={row.id}
                type="button"
                className="customer-workspace-recent__item"
                onClick={() => openProfile(row.id)}
              >
                <span className="customer-workspace-recent__rank">{index + 1}</span>
                <span className="customer-workspace-recent__main">
                  <strong>{profileTitle(row)}</strong>
                  <small>
                    {formatPhone(row.phone)} · {getGovernmentProgressStatusLabel(row.progressStatus)}
                  </small>
                </span>
                <span className="customer-workspace-recent__action">열기</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  )
}
