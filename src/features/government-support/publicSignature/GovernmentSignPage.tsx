import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusMessage } from '../../../components/feedback'
import { FormButton, FormInput } from '../../../components/form'
import { GOVERNMENT_APP_TITLE } from '../../../config/governmentAppMeta'
import './government-signature-public.css'
import {
  ApiError,
  fetchContractOtpStatus,
  fetchContractPublicDocuments,
  fetchContractPublicSession,
  formatContractPublicSessionError,
  postContractOtpSend,
  postContractOtpVerify,
  postContractPublicOpen,
  type ContractDocumentRow,
  type ContractPublicSessionPayload,
} from './governmentSignaturePublicClient'

import { staffDocumentStatusLabel } from '../signatures/sendSessionStaffDisplay'
import { useGovernmentPublicSignatureBodyClass } from './useGovernmentPublicSignatureBodyClass'

export default function GovernmentSignPage() {
  useGovernmentPublicSignatureBodyClass()
  const { token: tokenParam } = useParams<{ token: string }>()
  const signToken = String(tokenParam ?? '').trim()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState<ContractPublicSessionPayload | null>(null)
  const [documents, setDocuments] = useState<ContractDocumentRow[] | null>(null)

  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpInfo, setOtpInfo] = useState('')
  const [cooldownSec, setCooldownSec] = useState(0)

  const loadSession = useCallback(async () => {
    const data = await fetchContractPublicSession(signToken)
    setSession(data)
    return data
  }, [signToken])

  useEffect(() => {
    if (!signToken) {
      setError('유효하지 않거나 만료된 전자서명 링크입니다.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    void loadSession()
      .then(async () => {
        if (cancelled) return
        try {
          await postContractPublicOpen(signToken)
        } catch {
          /* open 기록 실패는 치명적이지 않음 */
        }
      })
      .catch((e) => {
        if (cancelled) return
        setSession(null)
        setError(formatContractPublicSessionError(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [signToken, loadSession])

  useEffect(() => {
    if (!signToken || !session) return
    if (session.sendSession.authenticationRequired || session.blocked || session.completed) return
    let cancelled = false
    void fetchContractPublicDocuments(signToken)
      .then((d) => {
        if (!cancelled) setDocuments(d.documents)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [signToken, session])

  useEffect(() => {
    if (!signToken || !session?.sendSession.authenticationRequired) return
    let cancelled = false
    void fetchContractOtpStatus(signToken)
      .then((st) => {
        if (cancelled || !st.verified) return
        void loadSession()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [signToken, session?.sendSession.authenticationRequired, loadSession])

  useEffect(() => {
    if (cooldownSec <= 0) return
    const t = window.setInterval(() => {
      setCooldownSec((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [cooldownSec])

  const refreshAuthorized = useCallback(async () => {
    const next = await loadSession()
    if (!next.sendSession.authenticationRequired) {
      const d = await fetchContractPublicDocuments(signToken)
      setDocuments(d.documents)
    }
  }, [signToken, loadSession])

  const handleSendOtp = async () => {
    setOtpError('')
    setOtpInfo('')
    setOtpSending(true)
    try {
      const res = await postContractOtpSend(signToken)
      const deliveryMode = res.deliveryMode ?? (res.sent === false ? 'test' : 'live')
      const sent = res.sent === true
      const message =
        typeof res.message === 'string' && res.message.trim()
          ? res.message.trim()
          : deliveryMode === 'test' && !sent
            ? '현재 SMS 테스트 모드라 실제 문자가 발송되지 않았습니다.'
            : sent
              ? '인증번호를 발송했습니다.'
              : ''
      if (message) {
        setOtpInfo(message)
      }
      const debugCode = res.data?.debugCode
      if (debugCode) {
        setOtpInfo((prev) =>
          prev
            ? `${prev} (개발용 인증번호: ${debugCode})`
            : `(개발용 인증번호: ${debugCode})`,
        )
      }
      setCooldownSec(0)
    } catch (e) {
      if (e instanceof ApiError && e.status === 429 && e.retryAfterSec) {
        setCooldownSec(e.retryAfterSec)
      }
      setOtpError(formatContractPublicSessionError(e))
    } finally {
      setOtpSending(false)
    }
  }

  const otpCodeValid = /^\d{6}$/.test(otpCode)

  const handleVerify = async () => {
    setOtpError('')
    setOtpVerifying(true)
    try {
      await postContractOtpVerify(signToken, otpCode)
      setOtpCode('')
      await refreshAuthorized()
    } catch (e) {
      setOtpError(formatContractPublicSessionError(e))
    } finally {
      setOtpVerifying(false)
    }
  }

  let body: ReactNode
  if (loading) {
    body = <p className="contract-public-link-page__loading">불러오는 중…</p>
  } else if (error || !session) {
    body = (
      <div className="contract-public-sign-page__panel-danger">
        <p className="font-medium">유효하지 않은 링크입니다.</p>
        <p className="mt-2 text-sm">{error || '요청을 확인할 수 없습니다.'}</p>
      </div>
    )
  } else if (session.blocked) {
    const reason = session.blockedReason
    const isCancelled = reason === 'cancelled'
    body = (
      <div className="contract-public-sign-page__panel-danger-soft">
        {isCancelled ? (
          <>
            <p className="font-medium">취소된 전자서명 요청입니다.</p>
            <p className="mt-2 text-sm">담당자에게 문의해주세요.</p>
          </>
        ) : (
          <>
            <p className="font-medium">이 링크는 더 이상 사용할 수 없습니다.</p>
            <p className="mt-2 text-sm">만료되었거나 취소된 세션입니다. 담당자에게 문의해 주세요.</p>
          </>
        )}
      </div>
    )
  } else if (session.completed) {
    body = (
      <div className="contract-public-sign-page__panel-success" data-testid="government-public-signature-complete">
        <p className="contract-public-sign-page__panel-success-title">전자서명이 완료되었습니다.</p>
        <p>담당자가 확인할 수 있도록 저장되었습니다.</p>
      </div>
    )
  } else if (session.sendSession.authenticationRequired) {
    const masked = session.sendSession.maskedPhone ?? '지정된 번호'
    body = (
      <div className="contract-public-link-page__stack" data-testid="government-public-signature-otp">
        <div className="contract-public-sign-page__card government-public-signature-card">
          <h2 className="contract-public-sign-page__card-title">본인 확인</h2>
          <p className="contract-public-sign-page__notice mt-2">
            {session.sendSession.customerDisplayName}님, 전자서명 문서 확인을 위해 휴대폰 인증이 필요합니다.
          </p>
          <p className="contract-public-sign-page__notice contract-public-sign-page__notice--secondary">
            휴대폰으로 받은 인증번호를 입력해 주세요. 인증번호는 문서 발송 시 지정된 번호로만 발송됩니다.
          </p>
          <p className="contract-public-sign-page__meta mt-3 text-base font-semibold tracking-wide">{masked}</p>
        </div>

        {otpError ? <StatusMessage tone="error" message={otpError} /> : null}
        {otpInfo ? <StatusMessage message={otpInfo} /> : null}

        <div className="contract-public-link-page__actions-col">
          <FormButton
            htmlType="button"
            variant="secondary"
            fullWidth
            className="gov-btn gov-btn--secondary"
            disabled={otpSending || cooldownSec > 0}
            loading={otpSending}
            onClick={() => void handleSendOtp()}
          >
            {cooldownSec > 0 ? `인증번호 재전송 (${cooldownSec}초 후)` : '인증번호 받기'}
          </FormButton>
        </div>

        <div className="contract-public-link-page__otp-field">
          <label className="contract-public-link-page__otp-label" htmlFor="contract-otp-code">
            인증번호
          </label>
          <FormInput
            id="contract-otp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6자리"
            maxLength={6}
            className="gov-form-control text-center text-lg tracking-widest"
          />
          <FormButton
            htmlType="button"
            variant="primary"
            fullWidth
            className="gov-btn gov-btn--primary"
            disabled={otpVerifying || !otpCodeValid}
            loading={otpVerifying}
            onClick={() => void handleVerify()}
          >
            인증 확인
          </FormButton>
        </div>

        <p className="contract-public-link-page__hint">
          문자를 받지 못했거나 번호가 맞지 않으면 담당자에게 문의해 주세요.
        </p>
      </div>
    )
  } else {
    const docList = documents ?? session.documents
    body = (
      <div className="contract-public-link-page__stack" data-testid="government-public-signature-card">
        <div className="contract-public-sign-page__card government-public-signature-card">
          <p className="contract-public-sign-page__card-title">서명할 문서</p>
          <p className="contract-public-sign-page__notice mt-2">
            필수 문서를 모두 완료해야 전체 제출이 가능합니다.
          </p>
        </div>
        <ul className="contract-public-link-page__doc-list">
          {docList.map((d) => (
            <li key={d.id}>
              <Link
                className="contract-public-link-page__doc-link"
                to={`/government/sign/${encodeURIComponent(signToken)}/documents/${encodeURIComponent(d.id)}`}
              >
                <span className="contract-public-link-page__doc-title">
                  {d.required ? (
                    <span className="contract-public-link-page__badge contract-public-link-page__badge--req">
                      필수
                    </span>
                  ) : (
                    <span className="contract-public-link-page__badge contract-public-link-page__badge--opt">
                      선택
                    </span>
                  )}
                  {d.title || '문서'}
                </span>
                <span className="contract-public-link-page__doc-status">{staffDocumentStatusLabel(d.status)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div
      className="government-public-signature-page contract-public-link-page"
      data-testid="government-public-signature-page"
    >
      <div className="contract-public-link-page__inner">
        <header className="government-public-signature-brand">
          <p className="government-public-signature-brand__eyebrow">{GOVERNMENT_APP_TITLE}</p>
          <h1 className="contract-public-link-page__title">전자서명</h1>
        </header>
        {body}
      </div>
    </div>
  )
}
