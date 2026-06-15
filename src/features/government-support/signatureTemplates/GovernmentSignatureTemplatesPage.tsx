/**
 * 전자서명 템플릿 관리 — SUPER_ADMIN / GA_ADMIN. 실제 고객 발송은 전자서명 발송 메뉴에서 진행.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../../pdf-engine/pdf-engine.css'
import './government-signature-console.css'
import { useAuth } from '../../auth/AuthProvider'
import GovernmentAdminOperationalScopeFields from '../components/GovernmentAdminOperationalScopeFields'
import { GOVERNMENT_ROUTE_PATHS } from '../constants/governmentRouteKeys'
import { useGovernmentAccess } from '../hooks/useGovernmentAccess'
import { useGovernmentSignatureScopeFields } from '../hooks/useGovernmentSignatureScopeFields'
import { mapGovernmentSignatureApiError } from '../signatures/governmentSignatureUserDisplay'
import { FormButton } from '../../../components/form'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { GovernmentSignatureTemplatePanel } from './components/GovernmentSignatureTemplatePanel'
import type { PdfPickRow } from './components/PdfTemplateSelector'
import { PdfTemplateSelector } from './components/PdfTemplateSelector'
import {
  countPdfFieldStats,
  createGovernmentSignatureTemplateFromPdfTemplate,
  fetchGovernmentSignatureTemplateDetail,
  getGovSignaturePdfTemplate,
  listGovSignaturePdfTemplates,
  listGovernmentSignatureTemplates,
  type GovernmentSignatureTemplateListItem,
} from './governmentSignatureTemplateClient'

function resolveTenantGaId(role: string | undefined, ownerUserId: number): number | null {
  if (role === 'SUPER_ADMIN') {
    return null
  }
  return ownerUserId
}

export default function GovernmentSignatureTemplatesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAdminRoute = location.pathname.startsWith(GOVERNMENT_ROUTE_PATHS.adminSignatureTemplates)
  const { token, user } = useAuth()
  const { summary } = useGovernmentAccess(token)
  const scopeFields = useGovernmentSignatureScopeFields(token, summary)
  const t = token?.trim() ?? ''
  const role = user?.role
  const isAdminMobile = useMediaQuery('(max-width: 768px)')
  const tenantGaId = useMemo(() => resolveTenantGaId(role, user?.ownerUserId ?? 0), [role, user?.ownerUserId])

  const [bootError, setBootError] = useState<string | null>(null)
  const [pdfRows, setPdfRows] = useState<PdfPickRow[]>([])
  const [selectedPdfId, setSelectedPdfId] = useState<number | null>(null)
  const [governmentSignatureTemplates, setGovernmentSignatureTemplates] = useState<GovernmentSignatureTemplateListItem[]>([])
  const [contractPanelError, setContractPanelError] = useState<string | null>(null)
  const [contractBusy, setContractBusy] = useState(false)

  const selectedPdf = useMemo(
    () => (selectedPdfId == null ? null : pdfRows.find((r) => r.id === selectedPdfId) ?? null),
    [pdfRows, selectedPdfId],
  )

  const pdfSignatureCountByPdfId = useMemo(() => {
    const m = new Map<number, number>()
    for (const r of pdfRows) {
      m.set(r.id, r.signatureCount)
    }
    return m
  }, [pdfRows])

  const visibleGovernmentSignatureTemplates = useMemo(() => {
    if (selectedPdfId == null) {
      return governmentSignatureTemplates
    }
    return governmentSignatureTemplates.filter((x) => x.pdfTemplateId === selectedPdfId)
  }, [governmentSignatureTemplates, selectedPdfId])

  const reloadContracts = useCallback(async () => {
    if (!t) {
      return
    }
    setContractPanelError(null)
    try {
      const list = await listGovernmentSignatureTemplates(t, role, tenantGaId)
      setGovernmentSignatureTemplates(list)
    } catch (e) {
      setContractPanelError(mapGovernmentSignatureApiError(e, '전자서명 템플릿 목록을 불러오지 못했습니다.'))
    }
  }, [t, role, tenantGaId])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!t) {
        return
      }
      setBootError(null)
      try {
        const { templates } = await listGovSignaturePdfTemplates(t)
        if (cancelled) {
          return
        }
        const initial: PdfPickRow[] = templates.map((s) => ({
          ...s,
          fieldCount: 0,
          signatureCount: 0,
          loadingDetail: true,
        }))
        setPdfRows(initial)
        const enriched = await Promise.all(
          templates.map(async (s) => {
            try {
              const detail = await getGovSignaturePdfTemplate(t, s.id)
              const { fieldCount, signatureCount } = countPdfFieldStats(detail)
              return { ...s, fieldCount, signatureCount, loadingDetail: false } satisfies PdfPickRow
            } catch {
              return { ...s, fieldCount: 0, signatureCount: 0, loadingDetail: false } satisfies PdfPickRow
            }
          }),
        )
        if (!cancelled) {
          setPdfRows(enriched)
        }
      } catch (e) {
        if (!cancelled) {
          setBootError(mapGovernmentSignatureApiError(e, 'PDF 템플릿 목록을 불러오지 못했습니다.'))
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [t, role])

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void reloadContracts()
      }
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [reloadContracts])

  const createTemplateFromSelectedPdf = useCallback(async () => {
    if (!t || selectedPdfId == null || !selectedPdf) {
      return
    }
    const pdfTitle = selectedPdf.title ?? ''
    await createGovernmentSignatureTemplateFromPdfTemplate(t, role, {
      pdfTemplateId: selectedPdfId,
      pdfTitle,
      scope: scopeFields.resolveScopePayload(),
    })
  }, [t, role, selectedPdfId, selectedPdf, scopeFields])

  const onSelectPdf = (id: number) => {
    setSelectedPdfId(id)
  }

  const resolveCoordinateEditorHref = isAdminRoute
    ? (pdfTemplateId: number) => `/government/admin/signature-templates/pdf/${pdfTemplateId}`
    : undefined

  return (
    <main
      className={
        'insurance-dark-forms contract-signature-console' +
        (isAdminMobile ? ' contract-signature-console--admin-mobile' : '')
      }
    >
      <div className="contract-signature-console__container">
        <h1 className="contract-signature-console__title">전자서명 템플릿 관리</h1>
        <p className="contract-signature-console__lead">
          관리자는 PDF 좌표 템플릿을 전자서명 발송용 문서 템플릿으로 등록하고 관리합니다. 실제 발송은 이용자 화면의 「전자서명
          발송」 메뉴에서 진행합니다.
        </p>
        <div className="contract-signature-console__notice" role="status">
          <ul>
            <li>
              현재 기능은 지정 휴대폰 인증 기반 전자서명입니다. NICE/KCB 실명 본인확인은 아직 연결되어 있지 않습니다.
            </li>
            <li>발송·서명이 끝나면 담당자 화면에서 완료 문서 PDF와 증빙 PDF를 내려받을 수 있습니다.</li>
            <li>관리자용 임시 발송·세션 조회 API(`/api/government-support/signatures`)는 호환용으로 유지될 수 있습니다.</li>
          </ul>
        </div>

        {bootError ? (
          <div className="contract-signature-console__alert--danger" role="alert">
            {bootError}
          </div>
        ) : null}

        <section className="contract-signature-console__section">
          <h2 className="contract-signature-console__section-title">1. PDF 템플릿 선택</h2>
          {isAdminRoute ? (
            <div className="contract-signature-console__toolbar">
              <FormButton
                htmlType="button"
                variant="primary"
                size="sm"
                onClick={() => navigate(GOVERNMENT_ROUTE_PATHS.adminSignaturePdfNew)}
              >
                PDF 업로드 · 좌표 편집
              </FormButton>
            </div>
          ) : null}
          <PdfTemplateSelector
            rows={pdfRows}
            selectedId={selectedPdfId}
            onSelect={onSelectPdf}
            disabled={!t || contractBusy}
            resolveCoordinateEditorHref={resolveCoordinateEditorHref}
          />
          {selectedPdfId != null ? (
            <div className="contract-signature-console__toolbar">
              <FormButton
                htmlType="button"
                variant="secondary"
                size="sm"
                className="contract-signature-console__filter-btn"
                disabled={!t || contractBusy}
                onClick={() => setSelectedPdfId(null)}
              >
                PDF 선택 해제
              </FormButton>
            </div>
          ) : null}
        </section>

        <section className="contract-signature-console__section">
          <h2 className="contract-signature-console__section-title">2. 전자서명 템플릿 관리</h2>
          {isAdminRoute ? (
            <div className="contract-signature-console__scope-fields" style={{ marginBottom: 16 }}>
              <GovernmentAdminOperationalScopeFields
                canPickScope={scopeFields.canPickScope}
                scopeType={scopeFields.scopeType}
                tenantId={scopeFields.tenantId}
                agencyOptions={scopeFields.agencyOptions}
                onScopeTypeChange={(value) =>
                  scopeFields.setScopeType(value === 'global' ? 'global' : 'agency')
                }
                onTenantIdChange={scopeFields.setTenantId}
                disabled={contractBusy}
              />
            </div>
          ) : null}
          <GovernmentSignatureTemplatePanel
            token={t}
            role={role}
            tenantGaId={tenantGaId}
            pdfTemplateId={selectedPdfId}
            pdfTitle={selectedPdf?.title ?? null}
            pdfSignatureCountByPdfId={pdfSignatureCountByPdfId}
            templates={visibleGovernmentSignatureTemplates}
            busy={contractBusy}
            error={contractPanelError}
            onBusy={setContractBusy}
            onError={setContractPanelError}
            onReload={reloadContracts}
            onCreateTemplate={createTemplateFromSelectedPdf}
            onClearPdfFilter={() => setSelectedPdfId(null)}
            resolveCreateScope={scopeFields.resolveScopePayload}
          />
        </section>
      </div>
    </main>
  )
}
