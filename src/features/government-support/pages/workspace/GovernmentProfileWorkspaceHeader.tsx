import FormButton from '../../../../components/form/FormButton'
import type { GovSupportProfile } from '../../types/governmentProfile.types'

type Props = {
  variant: 'pc' | 'mobile'
  selectedProfileId: string | null
  selectedProfile: GovSupportProfile | null
  selectedProfileLabel: string
  onClickCustomerApp: () => void
}

export default function GovernmentProfileWorkspaceHeader({
  variant,
  selectedProfileId,
  selectedProfileLabel,
  onClickCustomerApp,
}: Props) {
  const isPc = variant === 'pc'

  return (
    <header
      className={`government-profile-workspace-header government-profile-workspace-header--${variant}`}
    >
      <div className="government-profile-workspace-header__meta">
        <h2 className="government-profile-workspace-header__title">
          {selectedProfileId ? selectedProfileLabel || '선택 사업장' : '사업장을 선택해 주세요.'}
        </h2>
      </div>
      {isPc && selectedProfileId ? (
        <div className="government-profile-workspace-header__actions">
          <FormButton
            htmlType="button"
            variant="secondary"
            size="sm"
            className="gov-btn gov-btn--secondary gov-btn--sm"
            onClick={onClickCustomerApp}
          >
            고객앱 보기
          </FormButton>
        </div>
      ) : null}
    </header>
  )
}
