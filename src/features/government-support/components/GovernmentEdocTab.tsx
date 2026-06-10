import { useState } from 'react'
import FormButton from '../../../components/form/FormButton'
import FormInput from '../../../components/form/FormInput'
import { GOVERNMENT_EDOC_TEMPLATES } from '../adapters/governmentContractAdapter'
import { createGovEdocLink } from '../api/governmentProfilesApi'
import type { GovEdocLinkRow } from '../types/governmentProfile.types'

type Props = {
  token: string
  profileId: string
  links: GovEdocLinkRow[]
  onReload: () => Promise<void>
  onFeedback: (msg: string) => void
}

export default function GovernmentEdocTab({ token, profileId, links, onReload, onFeedback }: Props) {
  const [documentName, setDocumentName] = useState(GOVERNMENT_EDOC_TEMPLATES[0] ?? '')
  const [recipient, setRecipient] = useState('')

  const onRegister = async () => {
    if (!recipient.trim()) {
      onFeedback('수신자를 입력하세요.')
      return
    }
    try {
      await createGovEdocLink(token, profileId, {
        documentName: documentName.trim(),
        recipient: recipient.trim(),
      })
      setRecipient('')
      await onReload()
      onFeedback('전자문서 발송 이력을 등록했습니다.')
    } catch (e) {
      onFeedback(e instanceof Error ? e.message : '전자문서 이력 등록에 실패했습니다.')
    }
  }

  return (
    <div className="government-profile-edoc-tab">
      <p className="government-page__muted">
        보험 `/contracts/signatures` 모듈과 분리된 정부지원 전자문서 이력입니다. 실제 서명 발송 연동은 government 전용
        모듈로 확장합니다.
      </p>
      <div className="government-form-grid government-profile-edoc-tab__form">
        <label className="customer-workspace-tab-field">
          문서 종류
          <select
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            className="customer-workspace-tab-select"
          >
            {GOVERNMENT_EDOC_TEMPLATES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <FormInput label="수신자" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <FormButton type="button" onClick={() => void onRegister()}>
          이력 등록
        </FormButton>
      </div>
      <table className="government-profile-edoc-tab__table">
        <thead>
          <tr>
            <th>문서명</th>
            <th>수신자</th>
            <th>서명상태</th>
            <th>발송일</th>
          </tr>
        </thead>
        <tbody>
          {links.map((row) => (
            <tr key={row.id}>
              <td className="government-profile-edoc-tab__cell">{row.documentName}</td>
              <td>{row.recipient}</td>
              <td>{row.signStatus}</td>
              <td>{row.sentAt ? String(row.sentAt).slice(0, 10) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
