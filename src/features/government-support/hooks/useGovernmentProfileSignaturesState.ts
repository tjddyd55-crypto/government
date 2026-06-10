import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../../lib/apiClient'
import type { CreateSendSessionResult, SendSessionDetail } from '../signatureTemplates/governmentSignatureTemplateClient'
import { downloadStaffSignedPdfFile } from '../signatureTemplates/governmentSignatureTemplateClient'
import { maskGovernmentPhone } from '../signatureTemplates/governmentSignatureTemplateDisplay'
import {
  buildGovSignaturePublicSignUrl,
  listUserSendSessions,
  type SendSessionHistoryListItem,
} from '../signatures/governmentSignatureHistoryClient'
import { mapGovernmentSignatureApiError } from '../signatures/governmentSignatureUserDisplay'
import {
  createUserGovernmentSignatureSendSession,
  getUserGovernmentSignatureSendSessionDetail,
  listUserGovernmentSignatureTemplateConfirmationFields,
  listUserGovernmentSignatureTemplates,
  type GovSignatureConfirmationFieldRow,
  type UserGovernmentSignatureTemplateItem,
} from '../signatures/governmentSignatureSendClient'

export type GovernmentProfileSignaturesViewProps = ReturnType<typeof useGovernmentProfileSignaturesState>

function profilePhoneMeta(phone: string): { hasPhone: boolean; maskedPhone: string } {
  const digits = String(phone ?? '').replace(/\D/g, '')
  const hasPhone = digits.length >= 10 && digits.startsWith('010')
  return {
    hasPhone,
    maskedPhone: hasPhone ? maskGovernmentPhone(digits) : '—',
  }
}

function validateConfirmationOnlyFieldValues(
  fields: GovSignatureConfirmationFieldRow[],
  values: Record<string, string>,
): string | null {
  for (const f of fields) {
    if (f.inputRole !== 'sender' || !f.required) {
      continue
    }
    const raw = values[f.fieldKey]
    if (raw == null || String(raw).trim() === '') {
      return `「${f.label}」항목은 필수입니다.`
    }
  }
  return null
}

export function useGovernmentProfileSignaturesState(token: string, profileId: string, profileDisplayName: string, profilePhone: string) {
  const t = token?.trim() ?? ''
  const pid = Number(profileId)
  const recipient = useMemo(() => {
    const phoneMeta = profilePhoneMeta(profilePhone)
    return {
      name: profileDisplayName.trim() || '사업장 담당자',
      ...phoneMeta,
    }
  }, [profileDisplayName, profilePhone])

  const [templates, setTemplates] = useState<UserGovernmentSignatureTemplateItem[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const selectedTemplate = useMemo(
    () => templates.find((row) => row.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  )

  const [senderInputValues, setSenderInputValues] = useState<Record<string, string>>({})
  const [confirmationFields, setConfirmationFields] = useState<GovSignatureConfirmationFieldRow[]>([])
  const [confirmationFieldValues, setConfirmationFieldValues] = useState<Record<string, string>>({})
  const [guideMessage, setGuideMessage] = useState('')

  const [sendBusy, setSendBusy] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [lastCreated, setLastCreated] = useState<CreateSendSessionResult | null>(null)
  const [sessionDetail, setSessionDetail] = useState<SendSessionDetail | null>(null)

  const [historyRows, setHistoryRows] = useState<SendSessionHistoryListItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [downloadBusyId, setDownloadBusyId] = useState<string | null>(null)

  const reloadTemplates = useCallback(async () => {
    if (!t) {
      setTemplates([])
      setTemplatesLoading(false)
      return
    }
    setTemplatesLoading(true)
    setTemplatesError(null)
    try {
      const rows = await listUserGovernmentSignatureTemplates(t)
      setTemplates(rows.filter((row) => row.sendable && row.status === 'active'))
    } catch (e) {
      setTemplates([])
      setTemplatesError(mapGovernmentSignatureApiError(e, '템플릿을 불러오지 못했습니다.'))
    } finally {
      setTemplatesLoading(false)
    }
  }, [t])

  const reloadHistory = useCallback(async () => {
    if (!t || !Number.isInteger(pid) || pid < 1) {
      setHistoryRows([])
      setHistoryLoading(false)
      return
    }
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const res = await listUserSendSessions(t, { profileId: pid, limit: 50, offset: 0, sort: 'sent_desc' })
      setHistoryRows(res.sendSessions)
    } catch (e) {
      setHistoryRows([])
      setHistoryError(mapGovernmentSignatureApiError(e, '발송 내역을 불러오지 못했습니다.'))
    } finally {
      setHistoryLoading(false)
    }
  }, [pid, t])

  useEffect(() => {
    void reloadTemplates()
  }, [reloadTemplates])

  useEffect(() => {
    void reloadHistory()
  }, [reloadHistory])

  useEffect(() => {
    setSelectedTemplateId(null)
    setSenderInputValues({})
    setConfirmationFields([])
    setConfirmationFieldValues({})
    setLastCreated(null)
    setSessionDetail(null)
    setSendError(null)
  }, [profileId])

  useEffect(() => {
    if (!t || !selectedTemplateId) {
      setConfirmationFields([])
      setConfirmationFieldValues({})
      return
    }
    if (selectedTemplate?.templateMode !== 'confirmation_only') {
      setConfirmationFields([])
      setConfirmationFieldValues({})
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const fields = await listUserGovernmentSignatureTemplateConfirmationFields(t, selectedTemplateId)
        if (!cancelled) {
          setConfirmationFields(fields.filter((f) => f.inputRole === 'sender'))
          setConfirmationFieldValues({})
        }
      } catch {
        if (!cancelled) {
          setConfirmationFields([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedTemplate?.templateMode, selectedTemplateId, t])

  const canSend = Boolean(
    t &&
      recipient.hasPhone &&
      selectedTemplateId &&
      selectedTemplate?.sendable &&
      selectedTemplate.status === 'active' &&
      !sendBusy,
  )

  const onSelectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId)
    setSenderInputValues({})
    setSendError(null)
    setLastCreated(null)
    setSessionDetail(null)
  }, [])

  const onSenderFieldChange = useCallback((fieldKey: string, value: string) => {
    setSenderInputValues((prev) => ({ ...prev, [fieldKey]: value }))
  }, [])

  const onConfirmationFieldChange = useCallback((fieldKey: string, value: string) => {
    setConfirmationFieldValues((prev) => ({ ...prev, [fieldKey]: value }))
  }, [])

  const copySignLink = useCallback(
    async (signToken: string) => {
      const url = buildGovSignaturePublicSignUrl(signToken)
      const guide = guideMessage.trim()
      const text = guide ? `${guide}\n\n전자서명 링크: ${url}` : url
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        window.prompt('링크를 복사하세요', text)
      }
    },
    [guideMessage],
  )

  const onSend = useCallback(async () => {
    if (!canSend || !selectedTemplateId || !Number.isInteger(pid) || pid < 1) {
      return
    }
    setSendBusy(true)
    setSendError(null)
    try {
      if (selectedTemplate?.templateMode === 'confirmation_only') {
        const validation = validateConfirmationOnlyFieldValues(confirmationFields, confirmationFieldValues)
        if (validation) {
          throw new ApiError(validation, 400)
        }
      }
      const senderPayload: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(senderInputValues)) {
        senderPayload[key] = value
      }
      const created = await createUserGovernmentSignatureSendSession(t, {
        profileId: pid,
        templateIds: [selectedTemplateId],
        senderInputValues: Object.keys(senderPayload).length > 0 ? senderPayload : undefined,
        confirmationFieldValues:
          selectedTemplate?.templateMode === 'confirmation_only' ? confirmationFieldValues : undefined,
      })
      setLastCreated(created)
      const detail = await getUserGovernmentSignatureSendSessionDetail(t, created.id)
      setSessionDetail(detail)
      await reloadHistory()
    } catch (e) {
      setSendError(mapGovernmentSignatureApiError(e, '전자서명 발송에 실패했습니다.'))
    } finally {
      setSendBusy(false)
    }
  }, [
    canSend,
    confirmationFieldValues,
    confirmationFields,
    pid,
    reloadHistory,
    selectedTemplate?.templateMode,
    selectedTemplateId,
    senderInputValues,
    t,
  ])

  const refreshSessionDetail = useCallback(async () => {
    const sessionId = sessionDetail?.id ?? lastCreated?.id
    if (!t || !sessionId) {
      return
    }
    try {
      const detail = await getUserGovernmentSignatureSendSessionDetail(t, sessionId)
      setSessionDetail(detail)
    } catch (e) {
      setSendError(mapGovernmentSignatureApiError(e, '발송 상태를 갱신하지 못했습니다.'))
    }
  }, [lastCreated?.id, sessionDetail?.id, t])

  const onDownloadCompletedPdf = useCallback(
    async (row: SendSessionHistoryListItem) => {
      if (!t || !row.hasSignedPdfFile) {
        return
      }
      setDownloadBusyId(row.id)
      try {
        const detail = await getUserGovernmentSignatureSendSessionDetail(t, row.id)
        const completed = detail.documents.find((d) => d.status === 'completed' && d.evidence?.hasSignedPdfFile)
        if (!completed) {
          throw new ApiError('완료된 문서를 찾을 수 없습니다.', 404)
        }
        const result = await downloadStaffSignedPdfFile(t, detail.id, completed.id)
        if (!result.ok) {
          throw new ApiError(result.message, 400)
        }
      } catch (e) {
        setHistoryError(mapGovernmentSignatureApiError(e, 'PDF 다운로드에 실패했습니다.'))
      } finally {
        setDownloadBusyId(null)
      }
    },
    [t],
  )

  return {
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
    onGuideMessageChange: setGuideMessage,
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
    reloadHistory,
    reloadTemplates,
  }
}
