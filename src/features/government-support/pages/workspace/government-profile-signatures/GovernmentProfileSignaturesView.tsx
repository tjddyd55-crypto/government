import { FormButton, FormInput, FormTextarea } from '../../../../../components/form'
import { SendSessionPanel } from '../../../signatureTemplates/components/SendSessionPanel'
import { formatSenderFieldLabel } from '../../../signatures/governmentSignatureUserDisplay'
import { SendSessionStatusBadge } from '../../../signatures/components/SendSessionStatusBadge'
import { AlimtalkNotificationStatusBadge } from '../../../signatures/components/AlimtalkNotificationStatusBadge'
import { ContractTableDateCell } from '../../../signatures/components/GovernmentSignatureTableCells'
import { GovernmentSignatureSendDeliveryOptions } from '../../../signatures/components/GovernmentSignatureSendDeliveryOptions'
import { useGovernmentConfirmDialog } from '../../../hooks/useGovernmentConfirmDialog'
import { validateSignatureExpiryYmd, canShowResendAvailableBadge } from '../../../signatures/governmentSignatureAlimtalkDisplay'
import type { GovernmentProfileSignaturesViewProps } from './governmentProfileSignaturesViewProps'

type Props = GovernmentProfileSignaturesViewProps & {
  variant: 'pc' | 'mobile'
  token: string
}

export default function GovernmentProfileSignaturesView({
  variant,
  token,
  recipient,
  templates,
  templatesLoading,
  templatesError,
  selectedTemplateId,
  selectedTemplate,
  onSelectTemplate,
  senderInputValues,
  onSenderFieldChange,
  confirmationFields,
  confirmationFieldValues,
  onConfirmationFieldChange,
  guideMessage,
  onGuideMessageChange,
  notifyMode,
  onNotifyModeChange,
  expiryYmd,
  onExpiryYmdChange,
  reportExpiryError,
  expiryError,
  lastNotification,
  canSend,
  sendBusy,
  sendError,
  lastCreated,
  sessionDetail,
  onSend,
  copySignLink,
  refreshSessionDetail,
  historyRows,
  historyLoading,
  historyError,
  downloadBusyId,
  onDownloadCompletedPdf,
}: Props) {
  const isMobile = variant === 'mobile'
  const { confirm, confirmDialog } = useGovernmentConfirmDialog()
  const templateNames = (names: string[]) => (names.length > 0 ? names.join(', ') : '—')

  const requestSend = async () => {
    if (!canSend || sendBusy) {
      return
    }
    const expiryValidation = validateSignatureExpiryYmd(expiryYmd)
    if (!expiryValidation.ok) {
      reportExpiryError(expiryValidation.message)
      return
    }
    const confirmMessage =
      notifyMode === 'kakao_alimtalk' ? (
        <>
          <p style={{ margin: '0 0 8px' }}>
            {recipient.name} 고객에게 카카오 알림톡으로 전자서명 요청을 보냅니다.
          </p>
          <p style={{ margin: '0 0 4px' }}>수신번호: {recipient.maskedPhone}</p>
          <p style={{ margin: 0 }}>서명기한: {expiryYmd}</p>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 8px' }}>{recipient.name} 고객의 전자서명 링크를 생성합니다.</p>
          <p style={{ margin: 0 }}>서명기한: {expiryYmd}</p>
        </>
      )
    const ok = await confirm({
      title: '전자서명을 보낼까요?',
      message: confirmMessage,
      confirmLabel: '전자서명 보내기',
      cancelLabel: '취소',
      closeOnBackdrop: false,
    })
    if (ok) {
      void onSend()
    }
  }

  return (
    <div className="government-profile-signatures-panel gov-workspace-tab-page">
      <section className="government-profile-signatures-panel__compose-card">
        <h2 className="government-profile-signatures-panel__card-title">전자서명 발송</h2>
        <p className="government-profile-signatures-panel__card-desc">
          선택한 사업장 담당자에게 전자서명 링크를 발송합니다.
        </p>

        <div className="government-profile-signatures-panel__recipient-card">
          <div className="government-profile-signatures-panel__recipient-name">수신자 · {recipient.name}</div>
          <div className="government-profile-signatures-panel__recipient-meta">
            연락처 {recipient.hasPhone ? recipient.maskedPhone : '등록된 휴대폰 없음'}
          </div>
          {!recipient.hasPhone ? (
            <p className="contract-signature-console__inline-warning" role="status">
              유효한 휴대폰 번호를 사업장 기본정보에 등록해야 발송할 수 있습니다.
            </p>
          ) : null}
        </div>

        <h3 className="government-profile-signatures-panel__subheading">전자서명 템플릿</h3>
        {templatesLoading ? <p className="gov-muted-text">템플릿을 불러오는 중…</p> : null}
        {templatesError ? (
          <p className="contract-signature-console__inline-error" role="alert">
            {templatesError}
          </p>
        ) : null}
        {!templatesLoading && !templatesError && templates.length === 0 ? (
          <p className="gov-muted-text">사용 가능한 전자서명 템플릿이 없습니다.</p>
        ) : null}
        {!templatesLoading && templates.length > 0 ? (
          <div className={isMobile ? 'contract-send-mobile-template-list' : 'contract-signature-console__pick-table-wrap'}>
            {templates.map((tpl) => {
              const active = selectedTemplateId === tpl.id
              const rowClass = isMobile
                ? `contract-send-mobile-template-card${active ? ' contract-send-mobile-template-card--selected' : ''}`
                : `contract-pick-row${active ? ' contract-pick-row--selected' : ''}`
              return (
                <FormButton
                  key={tpl.id}
                  htmlType="button"
                  variant="secondary"
                  className={`gov-btn gov-btn--secondary ${rowClass}`}
                  aria-pressed={active}
                  onClick={() => onSelectTemplate(tpl.id)}
                >
                  <span className="contract-pick-row__title">{tpl.title}</span>
                  {tpl.description ? <span className="gov-muted-text">{tpl.description}</span> : null}
                  {tpl.pdfEngineTitle ? <span className="gov-muted-text">문서: {tpl.pdfEngineTitle}</span> : null}
                </FormButton>
              )
            })}
          </div>
        ) : null}

        {selectedTemplate && (selectedTemplate.senderFieldsForSend?.length ?? 0) > 0 ? (
          <div className="government-profile-signatures-panel__sender-fields">
            <h3 className="government-profile-signatures-panel__subheading">발송 전 입력</h3>
            {selectedTemplate.senderFieldsForSend.map((field) => (
              <label key={field.fieldKey} className="government-profile-signatures-panel__field">
                <span className="government-profile-signatures-panel__field-label">
                  {formatSenderFieldLabel(field.label)}
                  {field.required ? ' *' : ''}
                </span>
                {field.fieldType === 'textarea' ? (
                  <FormTextarea
                    className="gov-form-control"
                    rows={3}
                    value={senderInputValues[field.fieldKey] ?? ''}
                    onChange={(e) => onSenderFieldChange(field.fieldKey, e.target.value)}
                  />
                ) : (
                  <FormInput
                    className="gov-form-control"
                    value={senderInputValues[field.fieldKey] ?? ''}
                    onChange={(e) => onSenderFieldChange(field.fieldKey, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        ) : null}

        {selectedTemplate?.templateMode === 'confirmation_only' && confirmationFields.length > 0 ? (
          <div className="government-profile-signatures-panel__sender-fields">
            <h3 className="government-profile-signatures-panel__subheading">확인서 항목</h3>
            {confirmationFields.map((field) => (
              <label key={field.fieldKey} className="government-profile-signatures-panel__field">
                <span className="government-profile-signatures-panel__field-label">
                  {field.label}
                  {field.required ? ' *' : ''}
                </span>
                {field.inputType === 'textarea' ? (
                  <FormTextarea
                    className="gov-form-control"
                    rows={3}
                    value={confirmationFieldValues[field.fieldKey] ?? ''}
                    onChange={(e) => onConfirmationFieldChange(field.fieldKey, e.target.value)}
                  />
                ) : (
                  <FormInput
                    className="gov-form-control"
                    value={confirmationFieldValues[field.fieldKey] ?? ''}
                    onChange={(e) => onConfirmationFieldChange(field.fieldKey, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        ) : null}

        <label className="government-profile-signatures-panel__field">
          <span className="government-profile-signatures-panel__field-label">고객 안내 메시지 (선택)</span>
          <FormTextarea
            className="gov-form-control"
            rows={3}
            value={guideMessage}
            onChange={(e) => onGuideMessageChange(e.target.value)}
            placeholder="링크 복사 시 함께 전달할 안내 문구를 입력할 수 있습니다."
          />
        </label>

        <GovernmentSignatureSendDeliveryOptions
          notifyMode={notifyMode}
          onNotifyModeChange={onNotifyModeChange}
          expiryYmd={expiryYmd}
          onExpiryYmdChange={onExpiryYmdChange}
          expiryError={expiryError}
          disabled={sendBusy}
        />

        <SendSessionPanel
          busy={sendBusy}
          lastCreated={lastCreated}
          lastNotification={lastNotification}
          onCreate={() => void requestSend()}
          canSend={canSend}
          inactiveTemplateHint={
            selectedTemplate && !selectedTemplate.sendable ? '선택한 템플릿은 현재 발송할 수 없습니다.' : null
          }
          detail={sessionDetail}
          onRefresh={() => void refreshSessionDetail()}
          error={sendError}
          staffAuthToken={token}
          layout={isMobile ? 'mobile' : 'desktop'}
        />
      </section>

      <section className="government-profile-signatures-panel__history-card">
        <h2 className="government-profile-signatures-panel__card-title">발송 내역</h2>
        {historyLoading ? <p className="gov-muted-text">불러오는 중…</p> : null}
        {historyError ? (
          <p className="contract-signature-console__inline-error" role="alert">
            {historyError}
          </p>
        ) : null}
        {!historyLoading && historyRows.length === 0 ? (
          <div className="government-profile-signatures-panel__empty-card">이 사업장의 발송 내역이 없습니다.</div>
        ) : null}
        {!historyLoading && historyRows.length > 0 ? (
          <div className={isMobile ? 'contract-history-mobile-cards' : 'contract-history-table-wrap'}>
            {isMobile
              ? historyRows.map((row) => (
                  <div key={row.id} className="contract-history-mobile-card">
                    <div className="contract-history-mobile-card__row">
                      <span className="contract-history-mobile-card__label">문서</span>
                      <span>{templateNames(row.templateNames)}</span>
                    </div>
                    <div className="contract-history-mobile-card__row">
                      <span className="contract-history-mobile-card__label">상태</span>
                      <SendSessionStatusBadge
                        sessionStatus={row.status}
                        hasSignedNotCompleted={row.hasSignedNotCompleted}
                      />
                    </div>
                    <div className="contract-history-mobile-card__row">
                      <span className="contract-history-mobile-card__label">알림톡</span>
                      <AlimtalkNotificationStatusBadge
                        notificationStatus={row.notificationStatus}
                        notificationDryRun={row.notificationDryRun}
                        notificationProviderCode={row.notificationProviderCode}
                      />
                      {canShowResendAvailableBadge(row.canResend) ? (
                        <span className="gov-signature-alimtalk-info__resend-badge">재발송 가능</span>
                      ) : null}
                    </div>
                    <div className="contract-history-mobile-card__row">
                      <span className="contract-history-mobile-card__label">발송일</span>
                      <ContractTableDateCell iso={row.sentAt ?? row.createdAt} />
                    </div>
                    <div className="contract-history-mobile-card__row">
                      <span className="contract-history-mobile-card__label">완료일</span>
                      <ContractTableDateCell iso={row.completedAt} />
                    </div>
                    <div className="contract-history-mobile-card__actions">
                      <FormButton
                        htmlType="button"
                        variant="secondary"
                        size="sm"
                        className="gov-btn gov-btn--secondary gov-btn--sm"
                        disabled={!row.canCopyLink}
                        onClick={() => void copySignLink(row.signToken)}
                      >
                        링크 복사
                      </FormButton>
                      <FormButton
                        htmlType="button"
                        variant="secondary"
                        size="sm"
                        className="gov-btn gov-btn--secondary gov-btn--sm"
                        disabled={!row.hasSignedPdfFile || downloadBusyId === row.id}
                        onClick={() => void onDownloadCompletedPdf(row)}
                      >
                        완료 PDF
                      </FormButton>
                    </div>
                  </div>
                ))
              : (
                  <table className="contract-history-table pdf-engine-table">
                    <thead>
                      <tr>
                        <th>문서</th>
                        <th>수신자</th>
                        <th>연락처</th>
                        <th>상태</th>
                        <th>알림톡</th>
                        <th>발송일</th>
                        <th>완료일</th>
                        <th>액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((row) => (
                        <tr key={row.id}>
                          <td>{templateNames(row.templateNames)}</td>
                          <td>{row.profileDisplayName || recipient.name}</td>
                          <td>{row.maskedPhone || recipient.maskedPhone}</td>
                          <td>
                            <SendSessionStatusBadge
                              sessionStatus={row.status}
                              hasSignedNotCompleted={row.hasSignedNotCompleted}
                            />
                          </td>
                          <td>
                            <AlimtalkNotificationStatusBadge
                              notificationStatus={row.notificationStatus}
                              notificationDryRun={row.notificationDryRun}
                              notificationProviderCode={row.notificationProviderCode}
                            />
                          </td>
                          <td>
                            <ContractTableDateCell iso={row.sentAt ?? row.createdAt} />
                          </td>
                          <td>
                            <ContractTableDateCell iso={row.completedAt} />
                          </td>
                          <td>
                            <div className="government-profile-signatures-panel__row-actions">
                              <FormButton
                                htmlType="button"
                                variant="secondary"
                                size="sm"
                                className="gov-btn gov-btn--secondary gov-btn--sm"
                                disabled={!row.canCopyLink}
                                onClick={() => void copySignLink(row.signToken)}
                              >
                                링크 복사
                              </FormButton>
                              <FormButton
                                htmlType="button"
                                variant="secondary"
                                size="sm"
                                className="gov-btn gov-btn--secondary gov-btn--sm"
                                disabled={!row.hasSignedPdfFile || downloadBusyId === row.id}
                                onClick={() => void onDownloadCompletedPdf(row)}
                              >
                                완료 PDF
                              </FormButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
          </div>
        ) : null}
      </section>
      {confirmDialog}
    </div>
  )
}
