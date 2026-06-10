import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FormDialog, useConfirmDialog } from '../../../../components/dialog'
import { EmptyState, LoadingState, StatusMessage } from '../../../../components/feedback'
import { FieldWrapper, FormButton, FormInput, FormSelect } from '../../../../components/form'
import { useAuth } from '../../../auth/AuthProvider'
import {
  createGovernmentAdminUser,
  fetchGovernmentAdminUsers,
  patchGovernmentAdminUser,
  resetGovernmentAdminUserPassword,
} from '../../api/governmentAdminUsersApi'
import { fetchGovAgencies } from '../../api/governmentProfilesApi'
import {
  GOVERNMENT_MEMBERSHIP_ROLES,
  GOVERNMENT_ROLE_LABELS,
  GOVERNMENT_STAFF_MANAGEABLE_ROLES,
  type GovernmentMembershipRole,
  type GovernmentStaffManageableRole,
} from '../../constants/governmentRoles'
import { useGovernmentAccess } from '../../hooks/useGovernmentAccess'
import GovernmentAdminPageShell from '../../components/GovernmentAdminPageShell'
import type { GovAgencyRow } from '../../types/governmentProfile.types'
import type {
  GovernmentAdminUserRow,
  GovernmentUserEntityStatus,
} from '../../types/governmentAdminUser.types'
import '../../government-support.css'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: '상태 전체' },
  { value: 'active', label: '정상' },
  { value: 'blocked', label: '접근금지' },
  { value: 'inactive', label: '비활성' },
]

const STATUS_EDIT_OPTIONS = STATUS_FILTER_OPTIONS.filter((o) => o.value !== '')

const STATUS_LABEL: Record<GovernmentUserEntityStatus, string> = {
  active: '정상',
  blocked: '접근금지',
  inactive: '비활성',
}

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_HELPER = `${PASSWORD_MIN_LENGTH}자 이상 입력`

function normalizeUserStatus(s: string | undefined): GovernmentUserEntityStatus {
  const v = String(s ?? '').toLowerCase()
  if (v === 'blocked' || v === 'inactive') {
    return v
  }
  return 'active'
}

function UserStatusBadge({ status }: { status: GovernmentUserEntityStatus }) {
  const st = normalizeUserStatus(status)
  return (
    <span className={`admin-entity-status-badge admin-entity-status-badge--${st}`}>
      {STATUS_LABEL[st]}
    </span>
  )
}

function formatCreatedAt(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10)
  }
  return d.toISOString().slice(0, 10)
}

function tenantLabel(row: GovernmentAdminUserRow): string {
  if (row.role === 'government_industry_admin') return '전체(업종 관리자)'
  if (row.tenantName) return row.tenantName
  if (row.agencyCode) return row.agencyCode
  return '—'
}

function roleOptionsForManager(isFullAccess: boolean): { value: GovernmentStaffManageableRole; label: string }[] {
  const roles = isFullAccess
    ? GOVERNMENT_STAFF_MANAGEABLE_ROLES
    : (['government_agency_admin', 'government_staff'] as const)
  return roles.map((r) => ({ value: r, label: GOVERNMENT_ROLE_LABELS[r] }))
}

function roleFilterOptions(): { value: string; label: string }[] {
  return [
    { value: '', label: '역할 전체' },
    ...GOVERNMENT_MEMBERSHIP_ROLES.filter((r) => r !== 'government_user').map((r) => ({
      value: r,
      label: GOVERNMENT_ROLE_LABELS[r],
    })),
  ]
}

export default function GovernmentAdminUsersPage() {
  const { token } = useAuth()
  const { summary } = useGovernmentAccess(token)
  const { confirm, confirmDialog } = useConfirmDialog()

  const isFullAccess = Boolean(summary?.isSuperAdmin || summary?.isGovernmentIndustryAdmin)
  const staffRoleOptions = useMemo(() => roleOptionsForManager(isFullAccess), [isFullAccess])
  const filterRoleOptions = useMemo(() => roleFilterOptions(), [])

  const [agencies, setAgencies] = useState<GovAgencyRow[]>([])
  const [rows, setRows] = useState<GovernmentAdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [filterRole, setFilterRole] = useState('')
  const [filterTenant, setFilterTenant] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterQ, setFilterQ] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createUsername, setCreateUsername] = useState('')
  const [createDisplayName, setCreateDisplayName] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<GovernmentStaffManageableRole>('government_staff')
  const [createTenantId, setCreateTenantId] = useState('')
  const [createError, setCreateError] = useState('')
  const [createSaving, setCreateSaving] = useState(false)

  const [editing, setEditing] = useState<GovernmentAdminUserRow | null>(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editRole, setEditRole] = useState<GovernmentStaffManageableRole>('government_staff')
  const [editTenantId, setEditTenantId] = useState('')
  const [editStatus, setEditStatus] = useState<GovernmentUserEntityStatus>('active')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [resetTarget, setResetTarget] = useState<GovernmentAdminUserRow | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSaving, setResetSaving] = useState(false)

  const tenantFilterOptions = useMemo(
    () => [
      { value: '', label: '소속 전체' },
      ...agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.agencyCode})` })),
    ],
    [agencies],
  )

  const agencySelectOptions = useMemo(
    () => agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.agencyCode})` })),
    [agencies],
  )

  const loadAgencies = useCallback(async () => {
    if (!token) return
    try {
      const list = await fetchGovAgencies(token)
      setAgencies(list)
      if (list.length === 1) {
        setCreateTenantId(list[0].id)
      }
    } catch {
      setAgencies([])
    }
  }, [token])

  const loadUsers = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setLoadError('')
    try {
      let list = await fetchGovernmentAdminUsers(token, {
        role: filterRole || undefined,
        tenantId: filterTenant || undefined,
        status: filterStatus || undefined,
        q: filterQ.trim() || undefined,
      })
      if (!filterRole) {
        list = list.filter((r) => r.role !== 'government_user')
      }
      setRows(list)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '사용자 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [token, filterRole, filterTenant, filterStatus, filterQ])

  useEffect(() => {
    void loadAgencies()
  }, [loadAgencies])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const openCreate = () => {
    setCreateError('')
    setCreateUsername('')
    setCreateDisplayName('')
    setCreatePassword('')
    setCreateRole('government_staff')
    setCreateTenantId(agencies[0]?.id ?? '')
    setCreateOpen(true)
  }

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setCreateError('')
    setCreateSaving(true)
    try {
      await createGovernmentAdminUser(token, {
        username: createUsername.trim(),
        password: createPassword,
        displayName: createDisplayName.trim(),
        role: createRole,
        ...(createRole !== 'government_industry_admin' && createTenantId
          ? { tenantId: createTenantId }
          : {}),
      })
      setCreateOpen(false)
      setSuccessMsg('직원을 등록했습니다.')
      await loadUsers()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '직원 등록에 실패했습니다.')
    } finally {
      setCreateSaving(false)
    }
  }

  const openEdit = (row: GovernmentAdminUserRow) => {
    setEditError('')
    setEditing(row)
    setEditDisplayName(row.displayName)
    setEditRole(
      row.role === 'government_user'
        ? 'government_staff'
        : (row.role as GovernmentStaffManageableRole),
    )
    setEditTenantId(row.tenantId ?? '')
    setEditStatus(normalizeUserStatus(row.status))
  }

  const editingIsProgramUser = editing?.role === 'government_user'
  const editRoleLocked = editingIsProgramUser && !isFullAccess

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !editing) return
    setEditError('')
    setEditSaving(true)
    try {
      const updated = await patchGovernmentAdminUser(token, editing.id, {
        displayName: editDisplayName.trim(),
        status: editStatus,
        ...(!editRoleLocked
          ? {
              role: editRole,
              ...(editRole !== 'government_industry_admin' && editTenantId
                ? { tenantId: editTenantId }
                : {}),
            }
          : {}),
      })
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setEditing(null)
      setSuccessMsg('저장되었습니다.')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setEditSaving(false)
    }
  }

  const openReset = (row: GovernmentAdminUserRow) => {
    setResetError('')
    setResetPassword('')
    setResetTarget(row)
  }

  const submitReset = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !resetTarget) return
    const ok = await confirm({
      title: '비밀번호 초기화',
      message: `${resetTarget.username} 사용자의 비밀번호를 변경하시겠습니까?`,
      tone: 'danger',
    })
    if (!ok) return
    setResetError('')
    setResetSaving(true)
    try {
      await resetGovernmentAdminUserPassword(token, resetTarget.id, resetPassword)
      setResetTarget(null)
      setSuccessMsg('비밀번호가 변경되었습니다. 새 비밀번호로 로그인할 수 있습니다.')
    } catch (err) {
      setResetError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.')
    } finally {
      setResetSaving(false)
    }
  }

  const createNeedsTenant = createRole !== 'government_industry_admin'
  const editNeedsTenant = editRole !== 'government_industry_admin'

  const defaultDescription = (
    <>
      대행사 직원·관리자 계정만 이 화면에서 추가합니다. 프로그램 이용자는{' '}
      <Link to="/government/admin/program-users" className="dark-link">
        이용자 관리
      </Link>
      에서 확인하세요.
    </>
  )

  return (
    <GovernmentAdminPageShell
      managementKind="user"
      title="대행사 직원"
      description={loadError || defaultDescription}
      toolbar={
        <>
          <FormButton
            htmlType="button"
            variant="primary"
            className="button button--primary"
            onClick={openCreate}
            disabled={loading}
          >
            등록
          </FormButton>
          <FieldWrapper label="검색" className="admin-modal-field admin-user-management__filter-field">
            <FormInput
              className="admin-form-input"
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              placeholder="아이디·이름"
              disabled={loading}
            />
          </FieldWrapper>
          <FieldWrapper label="권한" className="admin-modal-field admin-user-management__filter-field">
            <FormSelect
              className="admin-form-input"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              options={filterRoleOptions}
              disabled={loading}
              aria-label="권한"
            />
          </FieldWrapper>
          <FieldWrapper label="소속" className="admin-modal-field admin-user-management__filter-field">
            <FormSelect
              className="admin-form-input"
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              options={tenantFilterOptions}
              disabled={loading}
              aria-label="소속 수행기관/대행사"
            />
          </FieldWrapper>
          <FieldWrapper label="상태" className="admin-modal-field admin-user-management__filter-field">
            <FormSelect
              className="admin-form-input"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={STATUS_FILTER_OPTIONS}
              disabled={loading}
              aria-label="상태"
            />
          </FieldWrapper>
          {loading ? <LoadingState message="불러오는 중…" className="m-0 text-sm text-[var(--text-sub)]" /> : null}
        </>
      }
    >
      {successMsg ? (
        <div className="admin-user-management__alerts">
          <p className="status admin-user-management__status-success m-0">{successMsg}</p>
        </div>
      ) : null}

      <UsersTable rows={rows} isLoading={loading} onEdit={openEdit} onReset={openReset} />

      {createOpen ? (
        <FormDialog
          open={createOpen}
          onClose={() => {
            if (!createSaving) {
              setCreateOpen(false)
            }
          }}
          title="직원 등록"
          panelClassName="admin-modal-panel"
          overlayClassName="admin-modal-backdrop"
          closeOnBackdrop={!createSaving}
          closeOnEsc={!createSaving}
        >
          <form className="admin-modal-content" onSubmit={(e) => void submitCreate(e)}>
            <StatusMessage message={createError} tone="error" className="m-0" />
            <UsersCreateForm
              createUsername={createUsername}
              setCreateUsername={setCreateUsername}
              createDisplayName={createDisplayName}
              setCreateDisplayName={setCreateDisplayName}
              createPassword={createPassword}
              setCreatePassword={setCreatePassword}
              createRole={createRole}
              setCreateRole={setCreateRole}
              createTenantId={createTenantId}
              setCreateTenantId={setCreateTenantId}
              createNeedsTenant={createNeedsTenant}
              createSaving={createSaving}
              roleOptions={staffRoleOptions}
              agencySelectOptions={agencySelectOptions}
            />
            <div className="admin-modal-actions">
              <FormButton
                htmlType="button"
                variant="secondary"
                className="button button--secondary"
                onClick={() => setCreateOpen(false)}
                disabled={createSaving}
              >
                취소
              </FormButton>
              <FormButton
                htmlType="submit"
                variant="primary"
                className="button button--primary"
                loading={createSaving}
                loadingText="저장 중…"
              >
                저장
              </FormButton>
            </div>
          </form>
        </FormDialog>
      ) : null}

      {editing ? (
        <FormDialog
          open
          onClose={() => {
            if (!editSaving) {
              setEditing(null)
            }
          }}
          title="직원 수정"
          panelClassName="admin-modal-panel"
          overlayClassName="admin-modal-backdrop"
          closeOnBackdrop={!editSaving}
          closeOnEsc={!editSaving}
        >
          <form className="admin-modal-content" onSubmit={(e) => void submitEdit(e)}>
            <p className="admin-user-management__edit-context m-0">
              소속: <strong>{tenantLabel(editing)}</strong> · 권한:{' '}
              {GOVERNMENT_ROLE_LABELS[editing.role as GovernmentMembershipRole] ?? editing.role}
            </p>
            <StatusMessage message={editError} tone="error" className="m-0" />
            <UsersEditForm
              editUsername={editing.username}
              editDisplayName={editDisplayName}
              setEditDisplayName={setEditDisplayName}
              editRole={editRole}
              setEditRole={setEditRole}
              editTenantId={editTenantId}
              setEditTenantId={setEditTenantId}
              editStatus={editStatus}
              setEditStatus={setEditStatus}
              editNeedsTenant={editNeedsTenant}
              editSaving={editSaving}
              roleOptions={staffRoleOptions}
              roleSelectDisabled={editRoleLocked}
              agencySelectOptions={agencySelectOptions}
            />
            <div className="admin-modal-actions">
              <FormButton
                htmlType="button"
                variant="secondary"
                className="button button--secondary"
                onClick={() => setEditing(null)}
                disabled={editSaving}
              >
                취소
              </FormButton>
              <FormButton
                htmlType="submit"
                variant="primary"
                className="button button--primary"
                loading={editSaving}
                loadingText="저장 중…"
              >
                저장
              </FormButton>
            </div>
          </form>
        </FormDialog>
      ) : null}

      {resetTarget ? (
        <FormDialog
          open
          onClose={() => {
            if (!resetSaving) {
              setResetTarget(null)
            }
          }}
          title="비밀번호 초기화"
          panelClassName="admin-modal-panel"
          overlayClassName="admin-modal-backdrop"
          closeOnBackdrop={!resetSaving}
          closeOnEsc={!resetSaving}
        >
          <form className="admin-modal-content" onSubmit={(e) => void submitReset(e)}>
            <StatusMessage message={resetError} tone="error" className="m-0" />
            <p className="admin-user-management__edit-context m-0">
              선택한 사용자(<strong>{resetTarget.username}</strong>)의 비밀번호를 새 값으로 변경합니다.
            </p>
            <FieldWrapper label="새 비밀번호" helperText={PASSWORD_HELPER} className="admin-modal-field">
              <FormInput
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder={PASSWORD_HELPER}
                autoComplete="new-password"
                className="admin-form-input"
                disabled={resetSaving}
                required
              />
            </FieldWrapper>
            <div className="admin-modal-actions">
              <FormButton
                htmlType="button"
                variant="secondary"
                className="button button--secondary"
                onClick={() => setResetTarget(null)}
                disabled={resetSaving}
              >
                취소
              </FormButton>
              <FormButton
                htmlType="submit"
                variant="primary"
                className="button button--primary"
                loading={resetSaving}
                loadingText="처리 중…"
              >
                변경
              </FormButton>
            </div>
          </form>
        </FormDialog>
      ) : null}

      {confirmDialog}
    </GovernmentAdminPageShell>
  )
}

function UsersCreateForm(props: {
  createUsername: string
  setCreateUsername: (v: string) => void
  createDisplayName: string
  setCreateDisplayName: (v: string) => void
  createPassword: string
  setCreatePassword: (v: string) => void
  createRole: GovernmentStaffManageableRole
  setCreateRole: (v: GovernmentStaffManageableRole) => void
  createTenantId: string
  setCreateTenantId: (v: string) => void
  createNeedsTenant: boolean
  createSaving: boolean
  roleOptions: { value: GovernmentStaffManageableRole; label: string }[]
  agencySelectOptions: { value: string; label: string }[]
}) {
  return (
    <>
      {props.createNeedsTenant && props.agencySelectOptions.length > 0 ? (
        <FieldWrapper label="소속 수행기관/대행사" className="admin-modal-field">
          <FormSelect
            className="admin-form-input"
            value={props.createTenantId}
            onChange={(e) => props.setCreateTenantId(e.target.value)}
            options={props.agencySelectOptions}
            disabled={props.createSaving}
            aria-label="소속 수행기관/대행사"
          />
        </FieldWrapper>
      ) : null}
      <FieldWrapper label="권한" className="admin-modal-field">
        <FormSelect
          className="admin-form-input"
          value={props.createRole}
          onChange={(e) => props.setCreateRole(e.target.value as GovernmentStaffManageableRole)}
          options={props.roleOptions}
          disabled={props.createSaving}
          aria-label="권한"
        />
      </FieldWrapper>
      <FieldWrapper label="아이디" className="admin-modal-field">
        <FormInput
          value={props.createUsername}
          onChange={(e) => props.setCreateUsername(e.target.value)}
          placeholder="예) staff01"
          autoComplete="username"
          className="admin-form-input"
          disabled={props.createSaving}
          required
        />
      </FieldWrapper>
      <FieldWrapper label="초기 비밀번호" helperText={PASSWORD_HELPER} className="admin-modal-field">
        <FormInput
          type="password"
          value={props.createPassword}
          onChange={(e) => props.setCreatePassword(e.target.value)}
          placeholder={PASSWORD_HELPER}
          autoComplete="new-password"
          className="admin-form-input"
          disabled={props.createSaving}
          required
        />
      </FieldWrapper>
      <FieldWrapper label="이름 (표시용, 선택)" className="admin-modal-field">
        <FormInput
          value={props.createDisplayName}
          onChange={(e) => props.setCreateDisplayName(e.target.value)}
          placeholder="예) 홍길동"
          autoComplete="name"
          className="admin-form-input"
          disabled={props.createSaving}
        />
      </FieldWrapper>
    </>
  )
}

function UsersEditForm(props: {
  editUsername: string
  editDisplayName: string
  setEditDisplayName: (v: string) => void
  editRole: GovernmentStaffManageableRole
  setEditRole: (v: GovernmentStaffManageableRole) => void
  editTenantId: string
  setEditTenantId: (v: string) => void
  editStatus: GovernmentUserEntityStatus
  setEditStatus: (v: GovernmentUserEntityStatus) => void
  editNeedsTenant: boolean
  editSaving: boolean
  roleSelectDisabled?: boolean
  roleOptions: { value: GovernmentStaffManageableRole; label: string }[]
  agencySelectOptions: { value: string; label: string }[]
}) {
  return (
    <>
      <FieldWrapper label="아이디" className="admin-modal-field">
        <FormInput
          value={props.editUsername}
          readOnly
          disabled
          className="admin-form-input field--readonly"
          aria-readonly="true"
        />
      </FieldWrapper>
      <FieldWrapper label="이름" className="admin-modal-field">
        <FormInput
          value={props.editDisplayName}
          onChange={(e) => props.setEditDisplayName(e.target.value)}
          placeholder="예) 홍길동"
          autoComplete="name"
          className="admin-form-input"
          disabled={props.editSaving}
        />
      </FieldWrapper>
      <FieldWrapper
        label="권한"
        helperText={
          props.roleSelectDisabled ? '이용자 권한은 기관 코드 가입으로만 부여됩니다.' : undefined
        }
        className="admin-modal-field"
      >
        <FormSelect
          className="admin-form-input"
          value={props.editRole}
          onChange={(e) => props.setEditRole(e.target.value as GovernmentStaffManageableRole)}
          options={props.roleOptions}
          disabled={props.roleSelectDisabled || props.editSaving}
          aria-label="권한"
        />
      </FieldWrapper>
      {props.editNeedsTenant && props.agencySelectOptions.length > 0 ? (
        <FieldWrapper label="소속 수행기관/대행사" className="admin-modal-field">
          <FormSelect
            className="admin-form-input"
            value={props.editTenantId}
            onChange={(e) => props.setEditTenantId(e.target.value)}
            options={props.agencySelectOptions}
            disabled={props.editSaving}
            aria-label="소속 수행기관/대행사"
          />
        </FieldWrapper>
      ) : null}
      <FieldWrapper label="상태" className="admin-modal-field">
        <FormSelect
          className="admin-form-input"
          value={props.editStatus}
          onChange={(e) => props.setEditStatus(e.target.value as GovernmentUserEntityStatus)}
          options={STATUS_EDIT_OPTIONS}
          disabled={props.editSaving}
          aria-label="상태"
        />
      </FieldWrapper>
    </>
  )
}

function UsersTable(props: {
  rows: GovernmentAdminUserRow[]
  isLoading: boolean
  onEdit: (row: GovernmentAdminUserRow) => void
  onReset: (row: GovernmentAdminUserRow) => void
}) {
  const emptyMessage = '등록된 직원이 없습니다.'

  return (
    <>
      <div className="table-container table-container--desktop">
        <table className="admin-user-table admin-data-table">
          <thead>
            <tr>
              <th scope="col">소속</th>
              <th scope="col">아이디</th>
              <th scope="col">이름</th>
              <th scope="col">권한</th>
              <th scope="col">상태</th>
              <th scope="col">등록일</th>
              <th scope="col" className="admin-table-cell--actions">
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {props.rows.length === 0 && !props.isLoading ? (
              <tr>
                <td colSpan={7} className="admin-data-table__empty-cell">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              props.rows.map((r) => (
                <tr key={r.id}>
                  <td>{tenantLabel(r)}</td>
                  <td>{r.username}</td>
                  <td>{r.displayName || '—'}</td>
                  <td>{GOVERNMENT_ROLE_LABELS[r.role] ?? r.role}</td>
                  <td>
                    <UserStatusBadge status={r.status} />
                  </td>
                  <td>{formatCreatedAt(r.createdAt)}</td>
                  <td className="admin-table-cell--actions">
                    <UserRowActions row={r} onEdit={props.onEdit} onReset={props.onReset} disabled={props.isLoading} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-responsive-card-list">
        {props.rows.length === 0 && !props.isLoading ? (
          <EmptyState message={emptyMessage} className="m-0 px-1 py-2 text-[var(--text-sub)]" />
        ) : (
          props.rows.map((r) => (
            <UserMobileCard
              key={r.id}
              row={r}
              onEdit={props.onEdit}
              onReset={props.onReset}
              disabled={props.isLoading}
            />
          ))
        )}
      </div>
    </>
  )
}

function UserRowActions(props: {
  row: GovernmentAdminUserRow
  onEdit: (row: GovernmentAdminUserRow) => void
  onReset: (row: GovernmentAdminUserRow) => void
  disabled?: boolean
}) {
  return (
    <div className="admin-table-actions">
      <FormButton
        htmlType="button"
        variant="secondary"
        className="button button--secondary"
        onClick={() => props.onEdit(props.row)}
        disabled={props.disabled}
      >
        수정
      </FormButton>
      <FormButton
        htmlType="button"
        variant="secondary"
        className="button button--secondary"
        onClick={() => props.onReset(props.row)}
        disabled={props.disabled}
      >
        비밀번호
      </FormButton>
    </div>
  )
}

function UserMobileCard(props: {
  row: GovernmentAdminUserRow
  onEdit: (row: GovernmentAdminUserRow) => void
  onReset: (row: GovernmentAdminUserRow) => void
  disabled?: boolean
}) {
  const r = props.row
  return (
    <article className="admin-user-card">
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">소속</span>
        <span className="admin-user-card__value">{tenantLabel(r)}</span>
      </div>
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">아이디</span>
        <span className="admin-user-card__value">{r.username}</span>
      </div>
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">이름</span>
        <span className="admin-user-card__value">{r.displayName || '—'}</span>
      </div>
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">권한</span>
        <span className="admin-user-card__value">{GOVERNMENT_ROLE_LABELS[r.role] ?? r.role}</span>
      </div>
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">상태</span>
        <span className="admin-user-card__value">
          <UserStatusBadge status={r.status} />
        </span>
      </div>
      <div className="admin-user-card__row">
        <span className="admin-user-card__label">등록일</span>
        <span className="admin-user-card__value">{formatCreatedAt(r.createdAt)}</span>
      </div>
      <div className="admin-user-card__actions">
        <UserRowActions row={r} onEdit={props.onEdit} onReset={props.onReset} disabled={props.disabled} />
      </div>
    </article>
  )
}
