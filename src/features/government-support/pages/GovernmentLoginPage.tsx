import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { FormButton, FormInput } from '../../../components/form'
import { GOVERNMENT_LOGIN_DOCUMENT_TITLE } from '../../../config/governmentAppMeta'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { ApiError } from '../../../lib/apiClient'
import { login as loginApi } from '../../auth/authApi'
import { useAuth } from '../../auth/AuthProvider'
import { useGovernmentAccess } from '../hooks/useGovernmentAccess'
import { resolveGovernmentHomePath } from '../lib/governmentHome'
import '../government-support.css'

export default function GovernmentLoginPage() {
  useDocumentTitle(GOVERNMENT_LOGIN_DOCUMENT_TITLE)
  const navigate = useNavigate()
  const { isAuthenticated, token, login } = useAuth()
  const { summary, loading } = useGovernmentAccess(token)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated && token && !loading && summary) {
    return <Navigate to={resolveGovernmentHomePath(summary)} replace />
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const form = e.currentTarget
    const fd = new FormData(form)
    const submittedUsername = String(fd.get('username') ?? username).trim()
    const submittedPassword = String(fd.get('password') ?? password)
    try {
      const res = await loginApi(submittedUsername, submittedPassword)
      login({ token: res.token, user: res.user })
      navigate('/government/workspace', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '로그인에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page government-page government-page--gate">
      <h1 className="government-page__title">정부지원 CRM 로그인</h1>
      <p className="government-page__muted">government-support 전용 진입점입니다.</p>
      <form onSubmit={onSubmit} style={{ marginTop: '1.5rem', display: 'grid', gap: '0.75rem' }}>
        <FormInput
          name="username"
          label="아이디"
          placeholder="아이디 입력"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onInput={(e) => setUsername(e.currentTarget.value)}
          autoComplete="username"
        />
        <FormInput
          name="password"
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onInput={(e) => setPassword(e.currentTarget.value)}
          autoComplete="current-password"
        />
        {error ? <p style={{ color: '#ef4444', margin: 0 }}>{error}</p> : null}
        <FormButton htmlType="submit" variant="primary" disabled={submitting}>
          로그인
        </FormButton>
      </form>
      <p className="government-page__muted" style={{ marginTop: '1rem' }}>
        <Link to="/government/signup">회원가입</Link>
        {' · '}
        <Link to="/government/join">가입 코드로 가입</Link>
      </p>
    </main>
  )
}
