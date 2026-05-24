# 정부지원 CRM — develop HTTP E2E

> **대상:** Railway `CRM-government` / **develop** / `app`  
> **URL:** `https://app-develop-9663.up.railway.app`  
> **production/main·보험 CRM에서 실행 금지**

---

## 1. 사전 조건

1. develop 배포 SUCCESS, `GET /backend/health` → 200
2. 테스트 계정 시드(선택, 최초 1회):  
   `railway run -e develop -s app npm run e2e:government:seed-program-users`  
   (`e2e_ua_dev`, `e2e_ub_dev` program user)
3. 환경변수 (값은 **커밋·문서·로그·Railway Variables 추가 금지**):

| 변수 | 필수 | 설명 |
|------|------|------|
| `E2E_GOVERNMENT_PASSWORD` | staff/admin E2E 시 **예** | develop 테스트 비밀번호 — **로컬 터미널 env만** |
| `E2E_BASE_URL` | 아니오 | 기본 `https://app-develop-9663.up.railway.app` |
| `E2E_GOVERNMENT_ADMIN_LOGIN_ID` | 아니오 | 기본 `admin` |
| `E2E_GOVERNMENT_USER_A` | 아니오 | 기본 `e2e_ua_dev` |
| `E2E_GOVERNMENT_USER_B` | 아니오 | 기본 `e2e_ub_dev` |
| `E2E_GOVERNMENT_STAFF_USER` | 아니오 | 기본 `e2e_staff_user` |
| `E2E_GOVERNMENT_AGENCY_ADMIN` | 아니오 | 기본 `e2e_agency_admin` |

PowerShell 예 (비밀번호는 팀 비밀 저장소에서 복사):

```powershell
$env:E2E_GOVERNMENT_PASSWORD = '<from-team-secret-store>'
npm run e2e:government:user-workspace
Remove-Item Env:E2E_GOVERNMENT_PASSWORD -ErrorAction SilentlyContinue
```

**비밀번호 없이** 실행 가능: program user HTTP self-seed, A/B 격리, 번들 마커.  
**staff/admin 운영 흐름**(요청서류·문의 답변·`/my/*` 403 등)은 `E2E_GOVERNMENT_PASSWORD` 설정 시에만 PASS (미설정 시 SKIP).

**staff API 비밀번호 길이:** admin user 생성 API는 8자 이상. `resolveE2eStaffPassword()`가 짧은 env 값을 API 규격에 맞게 변환한다 (industry bootstrap admin 로그인과 분리).

---

## 2. npm scripts

| 명령 | 용도 |
|------|------|
| `npm run e2e:government:operations` | 공지·자료 HTTP E2E (DB 불필요) |
| `npm run e2e:government:user-workspace` | 이용자 workspace·staff/admin 운영·A/B 격리 E2E |
| `npm run e2e:government:signatures` | 전자서명 HTTP E2E |
| `npm run e2e:government:join-code` | 기관 코드 가입·join-link·직접 입력 E2E |
| `npm run e2e:government:operations:db` | DB+HTTP 통합 E2E (`railway run` 필수) |
| `npm run e2e:government:seed-program-users` | develop program user 시드 |
| `npm run e2e:government:reset-admin-password` | develop admin `password_hash` 임시 갱신 (E2E용) |

---

## 3. 스크립트 파일

| 파일 | DB | 설명 |
|------|-----|------|
| `server/scripts/e2eGovernmentOperationsHttp.mjs` | 없음 | 공지·자료·tenant 격리 |
| `server/scripts/e2eGovernmentUserWorkspaceHttp.mjs` | 없음 | workspace·요청서류·문의·staff/admin·A/B |
| `server/scripts/e2eGovernmentSignaturesHttp.mjs` | 없음 | PDF·템플릿·발송·공개서명·staff 차단 |
| `server/scripts/e2eGovernmentJoinCodeHttp.mjs` | 없음 | 가입 코드·join-link·signup |
| `server/scripts/e2eGovernmentOperationsDevelop.mjs` | **있음** | railway develop 전용 풀 E2E |
| `server/scripts/e2eSeedProgramUsers.mjs` | **있음** | `e2e_ua_dev` / `e2e_ub_dev` |
| `server/scripts/e2eResetAdminPassword.mjs` | **있음** | admin 비밀번호 hash 갱신 |
| `server/scripts/lib/e2eGovernmentHttpEnv.mjs` | — | develop 가드·env·`resolveE2eStaffPassword` |

---

## 4. production 안전장치

- HTTP: 호스트가 `app-develop-9663` / localhost 외면 **즉시 종료**
- `insurance-production` 등 production 패턴 호스트 **차단**
- DB 스크립트: `DATABASE_URL` 없거나 production 패턴이면 **종료**
- 우회: `E2E_GOVERNMENT_ALLOW_NON_DEVELOP=1` (로컬 디버그만, CI/production 금지)

---

## 5. admin 비밀번호

ENV `GOVERNMENT_ADMIN_PASSWORD`는 **삭제 상태 유지**.  
운영·E2E 후속: [government-support-admin-password-ops.md](./government-support-admin-password-ops.md)

---

## 6. 기대 결과 (develop `f63c174`, 2026-05-24)

| 스크립트 | 기준 (password env 설정 시) |
|----------|-----------------------------|
| `npm test` | **204 pass** / 0 fail |
| `e2e:government:operations` | 25 pass / 0 fail |
| `e2e:government:user-workspace` | **136 pass** / 0 fail |
| `e2e:government:signatures` | **49 pass** / 0 fail |
| `e2e:government:join-code` | **29 pass** / 0 fail |

**SMS 429:** 연속 HTTP 가입 E2E 시 develop rate limit. **60~90초 cooldown** 후 재실행.

운영 전 수동 항목: [government-support-phase1-ops-checklist.md](./government-support-phase1-ops-checklist.md)

---

## 7. E2E 데이터 정리

- `e2e_*` 동적 계정·공지·자료는 develop DB에 누적될 수 있음
- 고정 운영 테스트 계정: `e2e_staff_user`, `e2e_agency_admin` (tenant는 program user A와 sync)
- 주기적 정리 정책은 팀 합의 후 별도 수행 (production 영향 없음)
