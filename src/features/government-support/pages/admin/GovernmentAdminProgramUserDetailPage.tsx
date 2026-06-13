import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LoadingState, StatusMessage } from '../../../../components/feedback'
import { FormButton } from '../../../../components/form'
import { useAuth } from '../../../auth/AuthProvider'
import {
  fetchGovernmentProgramUserDetail,
  type GovernmentProgramUserDetail,
} from '../../api/governmentProgramUsersApi'
import { useGovernmentProgramUserAdminActions } from '../../hooks/useGovernmentProgramUserAdminActions'
import { GOVERNMENT_ROUTE_PATHS } from '../../constants/governmentRouteKeys'
import type { GovernmentUserEntityStatus } from '../../types/governmentAdminUser.types'
import '../../government-support.css'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ko-KR')
}

const STATUS_LABELS: Record<GovernmentUserEntityStatus, string> = {
  active: '정상',
  blocked: '정지',
  inactive: '삭제/보관',
}

function normalizeStatus(s: string | undefined): GovernmentUserEntityStatus {
  const v = String(s ?? '').toLowerCase()
  if (v === 'blocked' || v === 'inactive') return v
  return 'active'
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="government-admin-program-user-detail__row">
      <span className="government-admin-program-user-detail__label">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default function GovernmentAdminProgramUserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const { token } = useAuth()
  const [data, setData] = useState<GovernmentProgramUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !userId) return
    setLoading(true)
    setError(null)
    try {
      setData(await fetchGovernmentProgramUserDetail(token, userId))
    } catch (e) {
      setError(e instanceof Error ? e.message : '이용자 정보를 불러오지 못했습니다.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [token, userId])

  useEffect(() => {
    void load()
  }, [load])

  const {
    confirmDialog,
    actingUserId,
    actionError,
    suspendUser,
    unsuspendUser,
    archiveUser,
    isSelf,
  } = useGovernmentProgramUserAdminActions({ onChanged: load })

  if (loading) {
    return <LoadingState message="이용자 정보 불러오는 중…" />
  }

  if (error || !data || !userId) {
    return (
      <div className="government-admin-page government-admin-program-user-detail">
        <StatusMessage message={error ?? '이용자를 찾을 수 없습니다.'} tone="error" />
        <Link to={GOVERNMENT_ROUTE_PATHS.adminProgramUsers} className="gov-link">
          ← 이용자 목록
        </Link>
      </div>
    )
  }

  const agencyLabel =
    data.tenantName && data.agencyCode
      ? `${data.tenantName} (${data.agencyCode})`
      : data.tenantName || data.agencyCode || '—'

  const status = normalizeStatus(data.status)
  const displayName = data.displayName?.trim() || data.username
  const self = isSelf(userId)
  const busy = actingUserId === userId

  return (
    <div className="government-admin-page government-admin-program-user-detail">
      <p>
        <Link to={GOVERNMENT_ROUTE_PATHS.adminProgramUsers} className="gov-link">
          ← 이용자 목록
        </Link>
      </p>
      <h1 className="government-page__title">이용자 상세</h1>
      <p className="government-page__muted">{data.profilesAccessNote}</p>

      {actionError ? <StatusMessage message={actionError} tone="error" className="m-0 mb-3" /> : null}

      <section className="government-admin-program-user-detail__card">
        <DetailRow label="이용자 아이디" value={data.username} />
        <DetailRow label="이름" value={data.displayName || '—'} />
        <DetailRow label="소속 대행사" value={agencyLabel} />
        <DetailRow label="가입일" value={formatDate(data.createdAt)} />
        <DetailRow label="상태" value={STATUS_LABELS[status] ?? data.status} />
        <DetailRow label="최근 로그인" value={formatDate(data.lastLoginAt)} />
      </section>

      {!self && status !== 'inactive' ? (
        <section className="government-admin-program-user-detail__actions">
          {status === 'active' ? (
            <FormButton
              htmlType="button"
              variant="secondary"
              className="gov-btn gov-btn--secondary"
              disabled={busy}
              onClick={() => void suspendUser(userId, displayName)}
            >
              정지
            </FormButton>
          ) : null}
          {status === 'blocked' ? (
            <FormButton
              htmlType="button"
              variant="primary"
              className="gov-btn gov-btn--primary"
              disabled={busy}
              onClick={() => void unsuspendUser(userId, displayName)}
            >
              정지 해제
            </FormButton>
          ) : null}
          <FormButton
            htmlType="button"
            variant="danger"
            className="gov-btn gov-btn--danger"
            disabled={busy}
            onClick={() => void archiveUser(userId, displayName)}
          >
            삭제(보관)
          </FormButton>
        </section>
      ) : null}

      {self ? (
        <p className="government-page__muted">본인 계정은 정지·삭제할 수 없습니다.</p>
      ) : null}

      {confirmDialog}
    </div>
  )
}
