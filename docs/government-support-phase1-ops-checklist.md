# 정부지원 CRM — 1차 운영 전 체크리스트

> **스냅샷:** develop `f63c174` (2026-05-24)  
> **배포:** Railway CRM-government / **develop** / app — `https://app-develop-9663.up.railway.app`  
> **production/main:** 미변경 (`c4fc790`)  
> **상세 아키텍처:** [`architecture/government-crm-architecture.md`](architecture/government-crm-architecture.md)  
> **1차 완료 기능 목록:** [`government-support-dev-progress.md`](government-support-dev-progress.md) §1차 완료

---

## A. 자동 검증 (완료 기록)

| # | 항목 | 기준 | 결과 |
|---|------|------|------|
| A1 | 프론트 빌드 | `npm run build` | ✅ |
| A2 | 단위 테스트 | `npm test` — **204 pass** | ✅ |
| A3 | 이용자 workspace E2E | `npm run e2e:government:user-workspace` — **136 pass** (staff/admin 운영 흐름 포함) | ✅ |
| A4 | 전자서명 E2E | `npm run e2e:government:signatures` — **49 pass** | ✅ |
| A5 | 기관 코드 가입 E2E | `npm run e2e:government:join-code` — **29 pass** | ✅ |
| A6 | develop Railway 배포 | develop push 시 자동 재배포 | ✅ |
| A7 | production/main 미푸시 | main 브랜치 미변경 | ✅ |

---

## B. 수동 확인 — 이용자 (`government_user`)

### B1. 로그인·가입

- [x] `/government/join/:agencyCode` — 기관 코드 가입 → tenant 멤버십 (**join-code E2E 29 pass**)
- [x] 직접 코드 입력 가입 — 공백·대소문자 정규화 (**join-code E2E**)
- [ ] `/government/login` — 폼·회원가입·코드 가입 링크 정상 (브라우저 UX)
- [ ] 로그인 후 `/government/workspace` 홈 진입

### B2. workspace (`/government/my-applications`)

- [ ] 좌측 사업장 목록 — **본인 `owner_user_id`만** 표시
- [ ] 사업장 선택 → 기본 탭 **기본정보** (`/basic`)
- [ ] **기본정보** — 조회·수정·저장 후 리스트/헤더 반영
- [ ] **서류/파일** — presign → R2 PUT → 저장 → 목록·다운로드·삭제
- [ ] **메모** — CRUD
- [ ] **상담 이력** — CRUD
- [ ] **진행상황** — CRUD, `progressStatus` 연동
- [ ] **전자서명** — workspace 탭(발송 내역 링크) 정상
- [ ] **신청 관리** — CRUD (workspace 전용, 고객앱 CRUD 아님)
- [ ] **고객앱 보기** → `/government/app/requests`

### B3. 전자서명 (이용자 메뉴)

- [ ] `/government/signatures` — 발송 내역
- [ ] `/government/signatures/send` — 사업장 검색 → 템플릿 → 발송
- [ ] 공개 링크 `/government/sign/:token` — OTP → 서명 → 완료 PDF

### B4. A/B 격리 (수동 또는 E2E 재확인)

- [ ] user B가 user A `profileId` 상세/수정/하위 API → **403 또는 404**

---

## C. 수동 확인 — 고객앱 (`/government/app/*`)

> **역할:** 신청접수 앱 **아님**. 요청서류·진행·문의·전자서명 **조회/제출** 전용.

- [ ] `/government/app/requests` — 대행사 요청서류 목록
- [ ] 요청서류 상세 — 항목별 파일 업로드(presign → PUT → confirm)
- [ ] `/government/app/progress` — 진행 이력 조회
- [ ] `/government/app/inquiries` — 문의 목록·작성·상세·추가 메시지
- [ ] `/government/app/signatures` — 전자서명 내역·다운로드
- [ ] 고객앱에 **신청접수 CRUD 없음** 확인

---

## D. 수동 확인 — 대행사 staff / agency admin

> **HTTP E2E 자동 검증 완료** (`f63c174`): 요청서류 생성→고객앱 업로드→제출 확인·다운로드, 문의 작성→staff 답변, `/my/*` 403, A/B·tenant 격리, industry admin 403.  
> `E2E_GOVERNMENT_PASSWORD`는 **로컬 터미널 env만** (Railway Variables 추가 금지). 아래는 **브라우저 UX·실기기** 보완용.

### D1. staff (`government_staff`)

- [x] 요청서류 생성·목록·제출 확인·파일 다운로드 — **user-workspace E2E**
- [x] 문의 목록·답변·상태 변경 — **user-workspace E2E**
- [x] `/government-support/my/inquiries` → **403** — **E2E**
- [ ] `/government/admin/document-requests` — UI 목록·상세·다운로드 버튼
- [ ] `/government/admin/inquiries` — UI 답변·상태
- [ ] `/government/admin/notices`, `/resources` — CRUD (tenant scope)
- [ ] user A profile PATCH/메모/파일 API → **403** (E2E API 검증 완료, UI 확인 선택)

### D2. agency admin (`government_agency_admin`)

- [x] 요청서류·문의 admin API — **user-workspace E2E** (staff와 동일 tenant)
- [x] `/government-support/my/document-requests` → **403** — **E2E**
- [ ] `/government/admin/users` — **대행사 직원** 생성·상태 (UI)
- [ ] `/government/admin/program-users` — 이용자 계정·상태(메타만)
- [ ] user 소유 profile 직접 수정 API → **403** (E2E API 검증 완료)

### D3. industry admin (`government_industry_admin`)

- [ ] `/government/admin/agencies` — 대행사·기관 코드 (UI)
- [ ] global scope 공지·자료 (UI)
- [x] `/government/admin/document-requests`, `/inquiries` → **403** — **E2E**

---

## E. 모바일 (실기기)

> DevTools 좁은 창은 **PC View** (`pointer: fine`). 실기기는 `(max-width:768px) and (pointer:coarse)`.

- [ ] 로그인·가입 링크
- [ ] workspace — 리스트·탭 모달·기본정보 수정
- [ ] 고객앱 — 4탭·업로드·문의 작성
- [ ] admin — 요청서류/문의 리스트→모바일 상세 모달

---

## F. 알려진 잔여 이슈 (운영 전 인지)

| # | 이슈 | 조치 |
|---|------|------|
| F1 | **실기기 모바일** 전체 탭 스모크 | §E — coarse pointer 실기기 필수 |
| F2 | **문의 첨부파일** E2E | API·UI 구현됨, HTTP E2E 시나리오 추가 가능 |
| F3 | **SMS 429** (연속 HTTP 가입) | E2E 간 **60~90초 cooldown** 또는 시드 계정(`e2e_ua_dev`) 사용 |
| F4 | **production 배포 전** secret/ENV 점검 | bootstrap `GOVERNMENT_ADMIN_PASSWORD` 삭제 유지, R2·ALIGO·JWT Railway만 |
| F5 | **main merge** | 사용자 **명시 승인** 시에만 develop → main ff-only |
| F6 | BasicInfoPanel `statusText` / `ws.feedback` 중복 표시 | 표시 정리 (후속, 기능 무관) |
| F7 | develop DB `e2e_*` 테스트 데이터 | 정리 정책 수립 (선택) |
| F8 | assignment 기반 staff profile 접근 | 미구현 — staff는 profile 원본 **접근 불가** 유지 |

---

## G. production 반영 전 (사용자 명시 지시 시에만)

- [ ] develop에서 §A~§E 체크 완료
- [ ] `AGENTS.md` — develop → main **ff-only** merge
- [ ] main push → Railway **production** + Electron + 모바일 OTA 동시 반영 인지
- [ ] bootstrap ENV `GOVERNMENT_ADMIN_PASSWORD` 삭제 상태 유지
- [ ] 보험 CRM / 보험 DB **미접근** 확인

---

## H. 빠른 헬스

```text
GET https://app-develop-9663.up.railway.app/backend/health  → 200 {"ok":true}
GET https://app-develop-9663.up.railway.app/government/login → 200 (SPA)
```

E2E (로컬, 비밀번호는 팀 저장소에서만 — **Railway Variables 추가 금지**):

```powershell
$env:E2E_GOVERNMENT_PASSWORD = '<from-team-secret-store>'
npm run e2e:government:user-workspace   # staff/admin 운영 흐름 포함 → 136 pass
npm run e2e:government:signatures       # 49 pass
npm run e2e:government:join-code        # 29 pass
Remove-Item Env:E2E_GOVERNMENT_PASSWORD -ErrorAction SilentlyContinue
```

비밀번호 없이도 program user·A/B 격리·번들 검증은 실행되나, staff/admin 구간은 SKIP된다.
