import { Link } from 'react-router-dom'
import FormButton from '../../../../components/form/FormButton'
import { EmptyState } from '../../../../components/feedback'
import { GOVERNMENT_APPLICATION_STATUSES } from '../../constants/governmentApplicationStatuses'
import { GOVERNMENT_EDOC_TEMPLATES } from '../../adapters/governmentContractAdapter'
import {
  GOVERNMENT_DOCUMENT_TYPES,
  GOVERNMENT_SCHEDULE_TYPES,
} from '../../constants/governmentDocumentTypes'
import type { GovernmentProfileWorkspaceTab } from '../../config/governmentProfileWorkspaceTabs'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'
import GovernmentProfileMemosPanel from './GovernmentProfileMemosPanel'
import GovernmentProfileConsultationsPanel from './GovernmentProfileConsultationsPanel'

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

type GovernmentProfileDetailPanelsProps = {
  tab: GovernmentProfileWorkspaceTab
}

export default function GovernmentProfileDetailPanels({ tab }: GovernmentProfileDetailPanelsProps) {
  const ws = useGovernmentProfileWorkspaceContext()
  const p = ws.selected
  if (!p) {
    return <EmptyState message="사업장을 선택해 주세요." />
  }

  if (tab === 'files') {
    return (
      <div className="government-form-grid">
        <p className="government-page__muted">
          서류/파일 — 프로필 조회 시 체크리스트가 자동 생성됩니다. 파일 업로드는 R2 구조와 연동 예정.
        </p>
        <ul style={{ marginTop: '0.75rem', color: '#e5e7eb' }}>
          {GOVERNMENT_DOCUMENT_TYPES.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (tab === 'consultations') {
    return <GovernmentProfileConsultationsPanel />
  }

  if (tab === 'memos') {
    return <GovernmentProfileMemosPanel />
  }

  if (tab === 'progress') {
    return (
      <div className="government-form-grid">
        <Field label="접수상품명" value={p.productName} onChange={(v) => void ws.saveProfile({ productName: v })} />
        <Field label="가능상품" value={p.availableProduct} onChange={(v) => void ws.saveProfile({ availableProduct: v })} />
        <Field label="진행상태" value={p.progressStatus} onChange={(v) => void ws.saveProfile({ progressStatus: v })} />
        <Field label="접수일정" value={p.scheduleAt} onChange={(v) => void ws.saveProfile({ scheduleAt: v })} />
        <Field label="진행기관" value={p.agencyOrg} onChange={(v) => void ws.saveProfile({ agencyOrg: v })} />
        <Field label="지역" value={p.region} onChange={(v) => void ws.saveProfile({ region: v })} />
        <div style={{ gridColumn: '1 / -1' }}>
          <FormButton htmlType="button" onClick={() => void ws.addApplicationCase()}>
            + 신청/청약 건
          </FormButton>
          {ws.cases.map((c) => (
            <div
              key={c.id}
              style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px solid #334155', borderRadius: 8 }}
            >
              <Field
                label="접수상품명"
                value={c.productName}
                onChange={(v) => void ws.updateCaseField(c.id, { productName: v })}
              />
              <select
                value={c.progressStatus}
                onChange={(e) => void ws.updateCaseStatus(c.id, e.target.value)}
                style={{
                  background: '#020617',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: '0.35rem',
                }}
              >
                {GOVERNMENT_APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tab === 'signatures') {
    return (
      <div>
        <p className="government-page__muted">전자서명 발송·이력은 전자서명 메뉴에서 이어서 처리합니다.</p>
        <ul style={{ marginTop: '0.75rem', color: '#e5e7eb' }}>
          {GOVERNMENT_EDOC_TEMPLATES.map((name) => (
            <li key={name} style={{ marginBottom: '0.35rem' }}>
              {name}
            </li>
          ))}
        </ul>
        <p style={{ marginTop: '1rem' }}>
          <Link to="/government/signatures/send" className="dark-link">
            전자서명 발송 화면 열기
          </Link>
          {' · '}
          <Link to="/government/signatures" className="dark-link">
            발송 이력
          </Link>
        </p>
        <p className="government-page__muted" style={{ marginTop: '1rem' }}>
          일정관리 — <Link to="/todos">할일/일정</Link> 모듈과 연동 예정 (tenant·신청건 기준).
        </p>
        <ul style={{ marginTop: '0.5rem', color: '#94a3b8' }}>
          {GOVERNMENT_SCHEDULE_TYPES.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    )
  }

  return <EmptyState message="준비 중입니다." />
}
