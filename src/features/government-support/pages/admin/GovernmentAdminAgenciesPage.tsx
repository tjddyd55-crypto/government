import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState } from '../../../../components/feedback'
import FormButton from '../../../../components/form/FormButton'
import FormInput from '../../../../components/form/FormInput'
import { useAuth } from '../../../auth/AuthProvider'
import { createGovAgency, fetchGovAgencies } from '../../api/governmentProfilesApi'
import type { GovAgencyRow } from '../../types/governmentProfile.types'

export default function GovernmentAdminAgenciesPage() {
  const { token } = useAuth()
  const [rows, setRows] = useState<GovAgencyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [agencyCode, setAgencyCode] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      setRows(await fetchGovAgencies(token))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const onCreate = async () => {
    if (!token) return
    if (!name.trim()) {
      setErr('대행사명을 입력하세요.')
      return
    }
    if (!agencyCode.trim() || agencyCode.trim().length < 3) {
      setErr('기관 코드는 3자 이상이어야 합니다.')
      return
    }
    setErr(null)
    setMsg(null)
    try {
      await createGovAgency(token, { name: name.trim(), agencyCode: agencyCode.trim() })
      setName('')
      setAgencyCode('')
      setMsg('수행기관/대행사를 등록하고 가입 코드를 발급했습니다.')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '등록에 실패했습니다.')
    }
  }

  return (
    <div className="government-admin-page">
      <h1 className="government-page__title">수행기관/대행사 관리</h1>
      <p className="government-page__muted">기관명·기관 코드를 등록하면 가입 링크가 발급됩니다.</p>
      <AgencyCreateForm
        name={name}
        agencyCode={agencyCode}
        setName={setName}
        setAgencyCode={setAgencyCode}
        onCreate={onCreate}
        msg={msg}
        err={err}
      />
      {loading ? <LoadingState message="불러오는 중…" /> : null}
      {!loading && rows.length === 0 ? (
        <EmptyState message="등록된 수행기관/대행사가 없습니다. 위 폼에서 첫 기관을 등록하세요." />
      ) : null}
      {!loading && rows.length > 0 ? <AgencyTable rows={rows} /> : null}
    </div>
  )
}

function AgencyCreateForm(props: {
  name: string
  agencyCode: string
  setName: (v: string) => void
  setAgencyCode: (v: string) => void
  onCreate: () => void
  msg: string | null
  err: string | null
}) {
  const { name, agencyCode, setName, setAgencyCode, onCreate, msg, err } = props
  return (
    <>
      <div className="government-form-grid government-admin-page__form">
        <FormInput label="기관명" value={name} onChange={(e) => setName(e.target.value)} />
        <FormInput
          label="기관 코드 (가입 코드)"
          value={agencyCode}
          onChange={(e) => setAgencyCode(e.target.value)}
        />
      </div>
      <FormButton htmlType="button" variant="primary" onClick={() => void onCreate()}>
        등록
      </FormButton>
      {msg ? <p className="government-admin-page__msg">{msg}</p> : null}
      {err ? <p className="government-admin-page__error">{err}</p> : null}
    </>
  )
}

function AgencyTable({ rows }: { rows: GovAgencyRow[] }) {
  return (
    <div className="government-admin-table-wrap">
      <table className="government-admin-table">
        <thead>
          <tr>
            <th>코드</th>
            <th>이름</th>
            <th>상태</th>
            <th>가입 URL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.agencyCode}</td>
              <td>{r.name}</td>
              <td>{r.status}</td>
              <td>
                <Link to={`/government/join/${r.agencyCode}`} className="dark-link">
                  /government/join/{r.agencyCode}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
