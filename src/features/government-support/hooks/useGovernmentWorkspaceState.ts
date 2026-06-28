import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createGovApplicationCase,
  createGovPriorLoan,
  createGovProfile,
  patchGovPriorLoan,
  deleteGovPriorLoan,
  fetchGovApplicationCases,
  fetchGovDocuments,
  fetchGovEdocLinks,
  fetchGovPriorLoans,
  fetchGovProfiles,
  patchGovApplicationCase,
  patchGovProfile,
  patchGovProfileCustomerStatus,
  deleteGovProfile,
} from '../api/governmentProfilesApi'
import type {
  GovApplicationCase,
  GovDocumentItem,
  GovEdocLinkRow,
  GovPriorLoan,
  GovProfileListQuery,
  GovSupportProfile,
} from '../types/governmentProfile.types'

export type GovernmentWorkspaceTab =
  | 'reception'
  | 'customer'
  | 'business'
  | 'funding'
  | 'loans'
  | 'application'
  | 'edoc'
  | 'documents'
  | 'schedule'
  | 'memo'

export function useGovernmentWorkspaceState(
  token: string | null,
  defaultTenantId: string | null,
  options?: {
    canCreateProfile?: boolean
    canDeleteProfile?: boolean
    onProfilesChanged?: () => void
    listQuery?: GovProfileListQuery
    loadProfiles?: (token: string, query?: GovProfileListQuery) => Promise<GovSupportProfile[]>
    createProfile?: (
      token: string,
      tenantId: string | null,
      ownerUserId?: string | null,
      patch?: Partial<GovSupportProfile>,
    ) => Promise<GovSupportProfile>
  },
) {
  const canCreateProfile = options?.canCreateProfile ?? true
  const canDeleteProfile = options?.canDeleteProfile ?? true
  const onProfilesChanged = options?.onProfilesChanged
  const listQuery = options?.listQuery
  const loadProfilesFn = options?.loadProfiles ?? fetchGovProfiles
  const createProfileFn = options?.createProfile
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<GovSupportProfile[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<GovernmentWorkspaceTab>('reception')
  const [priorLoans, setPriorLoans] = useState<GovPriorLoan[]>([])
  const [cases, setCases] = useState<GovApplicationCase[]>([])
  const [documents, setDocuments] = useState<GovDocumentItem[]>([])
  const [edocLinks, setEdocLinks] = useState<GovEdocLinkRow[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId],
  )

  const reloadProfiles = useCallback(async () => {
    if (!token) return
    const rows = await loadProfilesFn(token, listQuery)
    setProfiles(rows)
    if (rows.length > 0 && !selectedId) {
      setSelectedId(rows[0].id)
    }
  }, [token, selectedId, listQuery, loadProfilesFn])

  const reloadDetail = useCallback(async () => {
    if (!token || !selectedId) {
      setPriorLoans([])
      setCases([])
      setDocuments([])
      setEdocLinks([])
      return
    }
    const [loans, appCases, docs, edocs] = await Promise.all([
      fetchGovPriorLoans(token, selectedId),
      fetchGovApplicationCases(token, selectedId),
      fetchGovDocuments(token, selectedId),
      fetchGovEdocLinks(token, selectedId),
    ])
    setPriorLoans(loans)
    setCases(appCases)
    setDocuments(docs)
    setEdocLinks(edocs)
  }, [token, selectedId])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    void reloadProfiles()
      .catch((e) => setError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [token, reloadProfiles])

  useEffect(() => {
    void reloadDetail()
  }, [reloadDetail])

  const saveProfile = useCallback(
    async (profileId: string, patch: Partial<GovSupportProfile>) => {
      if (!token || !profileId) return null
      const next = await patchGovProfile(token, profileId, patch)
      setProfiles((prev) => prev.map((p) => (p.id === next.id ? next : p)))
      setFeedback('저장했습니다.')
      return next
    },
    [token],
  )

  const removeProfile = useCallback(
    async (profileId: string) => {
      if (!token || !profileId) return
      if (!canDeleteProfile) {
        setError('사업장을 삭제할 권한이 없습니다.')
        return
      }
      await deleteGovProfile(token, profileId)
      setProfiles((prev) => prev.filter((p) => p.id !== profileId))
      if (selectedId === profileId) {
        setSelectedId(null)
      }
      setFeedback('사업장을 삭제했습니다.')
      onProfilesChanged?.()
    },
    [token, selectedId, onProfilesChanged, canDeleteProfile],
  )

  const createProfileFromForm = useCallback(
    async (
      patch: Partial<GovSupportProfile>,
      ownerUserId?: string | null,
    ): Promise<GovSupportProfile | null> => {
      if (!token) {
        return null
      }
      if (!canCreateProfile) {
        setError('사업장을 등록할 권한이 없습니다.')
        return null
      }
      setError(null)
      try {
        const row = createProfileFn
          ? await createProfileFn(token, defaultTenantId, ownerUserId ?? null, patch)
          : await createGovProfile(token, defaultTenantId, { ...patch, ownerUserId: ownerUserId ?? undefined })
        setProfiles((prev) => [row, ...prev])
        setSelectedId(row.id)
        setFeedback('사업장을 등록했습니다.')
        onProfilesChanged?.()
        return row
      } catch (e) {
        setError(e instanceof Error ? e.message : '사업장 등록에 실패했습니다.')
        return null
      }
    },
    [token, defaultTenantId, canCreateProfile, onProfilesChanged, createProfileFn],
  )

  const addPriorLoan = useCallback(async () => {
    if (!token || !selectedId) return
    await createGovPriorLoan(token, selectedId, { hasPrior: 'Y', lenderName: '', remainingAmount: '' })
    await reloadDetail()
  }, [token, selectedId, reloadDetail])

  const updatePriorLoan = useCallback(
    async (loanId: string, patch: Partial<GovPriorLoan>) => {
      if (!token) return
      await patchGovPriorLoan(token, loanId, patch)
      await reloadDetail()
    },
    [token, reloadDetail],
  )

  const removePriorLoan = useCallback(
    async (loanId: string) => {
      if (!token) return
      await deleteGovPriorLoan(token, loanId)
      await reloadDetail()
    },
    [token, reloadDetail],
  )

  const addApplicationCase = useCallback(async () => {
    if (!token || !selected) return
    await createGovApplicationCase(token, selected.id, {
      productName: selected.productName,
      progressStatus: '서류준비중',
    })
    await reloadDetail()
    setFeedback('신청/청약 건을 추가했습니다.')
  }, [token, selected, reloadDetail])

  const updateCaseStatus = useCallback(
    async (caseId: string, progressStatus: string) => {
      if (!token) return
      await patchGovApplicationCase(token, caseId, { progressStatus })
      await reloadDetail()
      await reloadProfiles()
    },
    [token, reloadDetail, reloadProfiles],
  )

  const updateCaseField = useCallback(
    async (caseId: string, patch: Partial<GovApplicationCase>) => {
      if (!token) return
      await patchGovApplicationCase(token, caseId, patch)
      await reloadDetail()
      await reloadProfiles()
    },
    [token, reloadDetail, reloadProfiles],
  )

  return {
    loading,
    error,
    profiles,
    selected,
    selectedId,
    setSelectedId,
    tab,
    setTab,
    priorLoans,
    cases,
    documents,
    edocLinks,
    reloadDetail,
    feedback,
    setFeedback,
    saveProfile,
    removeProfile,
    createProfileFromForm,
    addPriorLoan,
    updatePriorLoan,
    removePriorLoan,
    addApplicationCase,
    updateCaseStatus,
    updateCaseField,
    reloadProfiles,
    updateProfileCustomerStatus: useCallback(
      async (profileId: string, customerStatusOptionId: string | null) => {
        if (!token) return null
        const next = await patchGovProfileCustomerStatus(token, profileId, customerStatusOptionId)
        setProfiles((prev) => prev.map((p) => (p.id === next.id ? next : p)))
        setFeedback('고객상태를 저장했습니다.')
        return next
      },
      [token],
    ),
  }
}
