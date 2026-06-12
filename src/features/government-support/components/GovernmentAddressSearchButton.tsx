import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { BaseDialog } from '../../../components/dialog/BaseDialog'
import { FormButton } from '../../../components/form'
import { formatAddressForSave } from '../../../components/form/addressSearchUtils'
import {
  loadKakaoPostcode,
  type DaumPostcodeData,
  type DaumPostcodeInstance,
} from '../../../lib/kakaoPostcode/loadKakaoPostcode'

type Props = {
  onAddressSelect: (address: string) => void
  disabled?: boolean
  className?: string
  /** 검색 후 포커스를 옮길 대상 (상세주소·textarea 등) */
  focusTargetRef?: RefObject<HTMLElement | null>
}

function buildBaseAddress(data: DaumPostcodeData): string {
  const primary =
    data.addressType === 'R' ? data.roadAddress || data.jibunAddress : data.jibunAddress || data.roadAddress
  const building = data.buildingName?.trim()
  if (data.addressType === 'R' && building) {
    return `${primary} (${building})`
  }
  return primary
}

/** 카카오(다음) 우편번호 검색 — 정부지원 단일 주소 필드용 (ENV 불필요) */
export default function GovernmentAddressSearchButton({
  onAddressSelect,
  disabled = false,
  className = '',
  focusTargetRef,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const embedRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<DaumPostcodeInstance | null>(null)

  const handleSelect = useCallback(
    (data: DaumPostcodeData) => {
      const formatted = formatAddressForSave({
        zonecode: data.zonecode ?? '',
        baseAddress: buildBaseAddress(data),
        detailAddress: '',
      })
      onAddressSelect(formatted)
      setOpen(false)
      window.setTimeout(() => {
        focusTargetRef?.current?.focus()
      }, 0)
    },
    [focusTargetRef, onAddressSelect],
  )

  useEffect(() => {
    if (!open) {
      instanceRef.current = null
      return
    }
    let cancelled = false
    loadKakaoPostcode()
      .then((Postcode) => {
        if (cancelled || !embedRef.current) return
        embedRef.current.innerHTML = ''
        const instance = new Postcode({
          oncomplete: handleSelect,
          width: '100%',
          height: '100%',
        })
        instance.embed(embedRef.current)
        instanceRef.current = instance
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('주소 검색을 불러오지 못했습니다. 직접 입력해 주세요.')
      })
    return () => {
      cancelled = true
    }
  }, [open, handleSelect])

  const rootClass = ['government-address-search', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      <FormButton
        htmlType="button"
        variant="secondary"
        className="gov-btn gov-btn--secondary government-address-search-button"
        disabled={disabled}
        onClick={() => {
          setLoadError(null)
          setOpen(true)
        }}
      >
        주소 검색
      </FormButton>

      <BaseDialog
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="주소 검색"
        closeOnBackdrop
        panelClassName="government-address-search-dialog"
      >
        {loadError ? (
          <p className="government-address-search-dialog__error" role="alert">
            {loadError}
          </p>
        ) : (
          <div ref={embedRef} className="government-address-search-dialog__embed" />
        )}
      </BaseDialog>
    </div>
  )
}
