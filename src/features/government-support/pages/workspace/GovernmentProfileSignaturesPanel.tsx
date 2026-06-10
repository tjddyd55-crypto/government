import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import ResponsiveLayout from '../../../../components/ResponsiveLayout'
import { useAuth } from '../../../auth/AuthProvider'
import { useGovernmentProfileSignaturesState } from '../../hooks/useGovernmentProfileSignaturesState'
import { useGovernmentProfileWorkspaceContext } from './governmentProfileWorkspaceContext'
import GovernmentProfileSignaturesMobileView from './government-profile-signatures/GovernmentProfileSignaturesMobileView'
import GovernmentProfileSignaturesPCView from './government-profile-signatures/GovernmentProfileSignaturesPCView'
import type { GovernmentProfileSignaturesViewProps } from './government-profile-signatures/governmentProfileSignaturesViewProps'

export default function GovernmentProfileSignaturesPanel() {
  const { profileId: profileIdParam } = useParams()
  const profileId = String(profileIdParam ?? '').trim()
  const { token } = useAuth()
  const ws = useGovernmentProfileWorkspaceContext()
  const profile = ws.selected

  const displayName = useMemo(
    () => String(profile?.businessName || profile?.customerName || '').trim(),
    [profile?.businessName, profile?.customerName],
  )
  const profilePhone = String(profile?.phone ?? '')

  const state = useGovernmentProfileSignaturesState(token ?? '', profileId, displayName, profilePhone)
  const viewProps: GovernmentProfileSignaturesViewProps & { token: string } = {
    ...state,
    token: token?.trim() ?? '',
  }

  if (!profileId) {
    return <p className="government-page__muted">사업장을 먼저 선택해 주세요.</p>
  }

  if (!token?.trim()) {
    return <p className="government-page__muted">로그인이 필요합니다.</p>
  }

  return (
    <ResponsiveLayout<GovernmentProfileSignaturesViewProps & { token: string }>
      PC={GovernmentProfileSignaturesPCView}
      Mobile={GovernmentProfileSignaturesMobileView}
      viewProps={viewProps}
    />
  )
}
