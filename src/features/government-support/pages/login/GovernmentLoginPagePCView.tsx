import LoginPageVersionFooter from '../../../auth/pages/Login/LoginPageVersionFooter'
import { GOVERNMENT_APP_TITLE } from '../../../../config/governmentAppMeta'
import { useGovernmentLoginController } from '../../hooks/useGovernmentLoginController'
import GovernmentLoginForm from './GovernmentLoginForm'

export default function GovernmentLoginPagePCView() {
  const controller = useGovernmentLoginController()

  return (
    <main className="auth-page auth-page--login-split government-auth-page government-auth-white-theme">
      <aside className="auth-login-sidebar" aria-label="로그인 안내">
        <div className="auth-login-sidebar__inner">
          <h2 className="auth-login-sidebar__brand">{GOVERNMENT_APP_TITLE}</h2>
          <p className="auth-login-sidebar__copy">
            사업장 · 신청 · 요청서류 · 전자서명을 한 화면에서 이어서 처리합니다.
          </p>
        </div>
      </aside>

      <section className="auth-login-content">
        <GovernmentLoginForm
          username={controller.username}
          password={controller.password}
          errorMessage={controller.errorMessage}
          isSubmitting={controller.isSubmitting}
          flash={controller.flash}
          setUsername={controller.setUsername}
          setPassword={controller.setPassword}
          handleSubmit={controller.handleSubmit}
        />
      </section>

      <LoginPageVersionFooter version={controller.version} />
    </main>
  )
}
