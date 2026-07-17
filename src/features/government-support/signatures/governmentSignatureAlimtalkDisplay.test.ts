import { describe, expect, it } from 'vitest'
import {
  addSeoulCalendarDays,
  buildSendResultMessages,
  defaultSignatureExpiryYmd,
  mapAlimtalkErrorCategoryToUserMessage,
  notificationStatusDisplayLabel,
  signatureExpiryYmdToApiExpiresAt,
  validateSignatureExpiryYmd,
} from './governmentSignatureAlimtalkDisplay'

describe('governmentSignatureAlimtalkDisplay', () => {
  const now = new Date('2026-06-25T04:00:00.000Z')

  it('기본 서명기한 7일', () => {
    expect(defaultSignatureExpiryYmd(now)).toBe('2026-07-02')
  })

  it('expiresAt API 변환', () => {
    expect(signatureExpiryYmdToApiExpiresAt('2026-07-02')).toContain('2026-07-02')
  })

  it('30일 초과 검증', () => {
    const r = validateSignatureExpiryYmd('2026-08-01', now)
    expect(r.ok).toBe(false)
  })

  it('알림톡 선택 payload용 expiresAt', () => {
    const ymd = defaultSignatureExpiryYmd(now)
    expect(validateSignatureExpiryYmd(ymd, now).ok).toBe(true)
    expect(addSeoulCalendarDays('2026-06-25', 7)).toBe('2026-07-02')
  })

  it('dry-run skipped 응답 메시지', () => {
    const m = buildSendResultMessages({
      sessionCreated: true,
      notification: {
        status: 'skipped',
        channel: 'kakao_alimtalk',
        provider: 'aligo',
        providerCode: 'DRY_RUN',
        dryRun: true,
      },
    })
    expect(m.sessionLine).toContain('생성')
    expect(m.notificationLine).toContain('테스트 모드')
    expect(m.notificationLine).toContain('발송되지 않았습니다')
    expect(m.tone).toBe('info')
  })

  it('legacy dryRun sent 응답도 테스트 모드 문구', () => {
    const m = buildSendResultMessages({
      sessionCreated: true,
      notification: {
        status: 'sent',
        channel: 'kakao_alimtalk',
        provider: 'aligo',
        providerCode: 'DRY_RUN',
        dryRun: true,
      },
    })
    expect(m.notificationLine).toContain('테스트 모드')
    expect(m.tone).toBe('info')
  })

  it('실발송 sent 응답 메시지', () => {
    const m = buildSendResultMessages({
      sessionCreated: true,
      notification: {
        status: 'sent',
        channel: 'kakao_alimtalk',
        provider: 'aligo',
        providerCode: '0',
        dryRun: false,
      },
    })
    expect(m.notificationLine).toContain('발송했습니다')
    expect(m.tone).toBe('success')
  })

  it('skipped disabled 메시지', () => {
    const m = buildSendResultMessages({
      sessionCreated: true,
      notification: { status: 'skipped', channel: 'kakao_alimtalk', provider: 'aligo', errorCategory: 'disabled' },
    })
    expect(m.notificationLine).toContain('비활성화')
  })

  it('failed missing_verified_phone', () => {
    expect(mapAlimtalkErrorCategoryToUserMessage('missing_verified_phone')).toContain('인증된 휴대폰')
  })

  it('notification status label', () => {
    expect(notificationStatusDisplayLabel({ notificationStatus: 'not_requested' })).toBe('미요청')
    expect(
      notificationStatusDisplayLabel({
        notificationStatus: 'skipped',
        notificationProviderCode: 'DRY_RUN',
        notificationDryRun: true,
      }),
    ).toBe('테스트 모드')
    expect(
      notificationStatusDisplayLabel({
        notificationStatus: 'sent',
        notificationProviderCode: '0',
      }),
    ).toBe('발송 완료')
  })
})
