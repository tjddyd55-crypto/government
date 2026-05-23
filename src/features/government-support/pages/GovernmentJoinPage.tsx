import { useParams } from 'react-router-dom'
import { RegisterPage } from '../../auth/pages/RegisterPage'
import { normalizeTenantRegistrationCode } from '../lib/normalizeTenantRegistrationCode'

/**
 * /government/join/:agencyCode — agencyCode 를 가입 코드 입력란에 프리필.
 */
export default function GovernmentJoinPage() {
  const { agencyCode } = useParams()
  const initialCode = normalizeTenantRegistrationCode(agencyCode)
  return (
    <RegisterPage
      signupIndustry="government"
      initialRegistrationCode={initialCode || undefined}
    />
  )
}
