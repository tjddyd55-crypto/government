# 정부지원 CRM — production/main merge 전 점검 체크리스트

> **스냅샷:** develop `8e18a39` (2026-05-24)  
> **develop URL:** `https://app-develop-9663.up.railway.app`  
> **production/main:** **미변경** — merge·배포는 **사용자 별도 승인** 후에만  
> **관련 문서:** [1차 운영 체크리스트](./government-support-phase1-ops-checklist.md) · [E2E](./government-support-e2e.md) · [아키텍처](./architecture/government-crm-architecture.md)

---

## 판단 요약 (2026-05-24)

| 항목 | 판정 |
|------|------|
| develop 기능·E2E 검증 | **충분** (test 204, join-code 29, user-workspace 136, signatures 49) |
| 기술적 main merge 준비 | **가능** (develop↔main diff: government namespace 중심, 보험 원본 미수정) |
| **지금 main merge** | **권장하지 않음** — 운영 게이트(§1·§2) 완료 전 |
| **지금 production 배포** | **하지 않음** — main push = production 자동 배포 |
| main merge / production | **사용자 명시 승인** 후 `AGENTS.md` ff-only 절차 |

**절대 금지 (본 문서 작성·운영 공통):** secret 값·비밀번호·토큰·DB URL·R2 key·ALIGO key를 문서·커밋·로그에 기록하지 않는다.

---

## 1. 실기기 모바일 스모크 (미완 — merge 전 필수)

> DevTools 좁은 창은 **PC View** (`pointer: fine`). 실기기만 `(max-width:768px) and (pointer:coarse)` 로 Mobile View가 적용된다.

**대상:** develop URL, 실제 iOS/Android 브라우저 또는 WebView.

### 1.1 공통 (모든 화면)

- [ ] 햄버거/드로어 열림·닫힘, 본문 밀림 없음
- [ ] 입력 라벨·placeholder 가독성 (다크 테마)
- [ ] 주요 버튼 가로 overflow·키보드 가림 없음
- [ ] 모달/시트 스크롤·닫기·백드rop
- [ ] **보험 CRM 문구**(고객관리·청구·계약 등) **미노출**

### 1.2 인증

| 경로 | 확인 |
|------|------|
| `/government/login` | 로그인·회원가입·코드 가입 링크 |
| `/government/signup` | 기관 코드·SMS·가입 |
| `/government/join/{code}` | 코드 프리필·가입 (예: GOVA001) |

### 1.3 이용자 workspace

| 경로 | 확인 |
|------|------|
| `/government/my-applications` | 사업장 리스트·선택 |
| `…/:profileId/basic` | 기본정보 조회·수정 |
| `…/:profileId/files` | 업로드·목록 |
| `…/:profileId/consultations` | 상담 CRUD |
| `…/:profileId/memos` | 메모 CRUD |
| `…/:profileId/progress` | 진행 CRUD |
| `…/:profileId/signatures` | 발송 내역 링크 |

### 1.4 고객앱

| 경로 | 확인 |
|------|------|
| `/government/app/requests` | 목록·상세·항목별 업로드 |
| `/government/app/progress` | 진행 이력 |
| `/government/app/inquiries` | 목록·작성·상세·타임라인 |
| `/government/app/signatures` | 내역·PDF 다운로드 |

### 1.5 admin (역할별)

| 경로 | 역할 | 확인 |
|------|------|------|
| `/government/admin/document-requests` | staff, agency | 목록·모바일 상세·제출 파일 |
| `/government/admin/inquiries` | staff, agency | 답변·상태 |
| `/government/admin/users` | agency | 직원 관리·라벨 |
| `/government/admin/agencies` | industry | 대행사·기관 코드 |
| `/government/admin/notices` | staff+ | CRUD |
| `/government/admin/resources` | staff+ | presign·업로드 |

### 1.6 전자서명 public

| 경로 | 확인 |
|------|------|
| `/government/sign/:token` | OTP·입력·서명·완료 |

---

## 2. production ENV/secret 점검 (merge 전 Railway에서 확인)

> **값은 Railway Dashboard에서만 확인.** 아래는 **키 이름·필수 여부**만. production에 **아직 적용·변경하지 않는다.**

### 2.1 필수

| ENV | 용도 | production |
|-----|------|------------|
| `DATABASE_URL` | government 전용 Postgres | **필수** (보험 DB와 분리) |
| `JWT_SECRET` | JWT 서명 | **필수** |
| `R2_ACCOUNT_ID` | R2 | **필수** |
| `R2_ACCESS_KEY_ID` | R2 | **필수** |
| `R2_SECRET_ACCESS_KEY` | R2 | **필수** |
| `R2_BUCKET_NAME` 또는 `R2_BUCKET` | R2 버킷 | **필수** |
| `CRM_R2_OBJECT_ROOT` | government R2 prefix | **필수** (develop과 **경로 분리**) |
| `APP_PRODUCT` | 제품 식별 | **필수** = `government` |
| `VITE_API_BASE_PATH` | 웹 API | **필수** = `/backend` |
| `NODE_ENV` | 런타임 | `production` |

### 2.2 R2/CDN (권장)

| ENV | production |
|-----|------------|
| `R2_PUBLIC_CDN_BASE` | **권장** |
| `R2_ENDPOINT` | 선택 |

### 2.3 SMS / OTP

| ENV | production |
|-----|------------|
| `ALIGO_API_KEY`, `ALIGO_USER_ID`, `ALIGO_SENDER` | **필수** (실 SMS) |
| `ALIGO_TEST_MODE` | **N** (테스트 모드 off) |
| `SMS_HTTP_GATEWAY_URL` | 선택 |
| `GOV_SIGNATURE_OTP_PEPPER` | **필수** (16자+, 미설정 시 기동 실패) |
| `GOV_SIGNATURE_TARGET_PHONE_ENCRYPTION_KEY` | **필수** |
| `GOV_SIGNATURE_OTP_SMS_MOCK` | **미설정** |
| `GOV_SIGNATURE_OTP_*` (expires, cooldown, max) | 선택 |

### 2.4 admin bootstrap (정상 운영)

| ENV | production 권장 |
|-----|-----------------|
| `GOVERNMENT_ADMIN_BOOTSTRAP_ENABLED` | **false** |
| `GOVERNMENT_ADMIN_RESET_PASSWORD_ON_BOOTSTRAP` | **false** |
| `GOVERNMENT_ADMIN_PASSWORD` | **미설정(삭제)** |
| `GOVERNMENT_ADMIN_LOGIN_ID` | bootstrap 후 아이디만 유지 가능 |

### 2.5 웹 빌드·E2E

| ENV | production |
|-----|------------|
| `VITE_API_URL` / `VITE_BASE_URL` | **미설정** (same-origin, `AGENTS.md`) |
| `E2E_GOVERNMENT_PASSWORD` | **Railway 추가 금지** (로컬 E2E만) |

### 2.6 merge 후 기동 확인

- [ ] `GET /backend/health` → 200
- [ ] bootstrap/reset 로그 **없음**
- [ ] `[gov signature OTP]` pepper 미설정 **에러 없음**

예시 키 목록: `.env.railway.development.example` · [admin-password-ops](./government-support-admin-password-ops.md)

---

## 3. main merge 전 diff 점검 (2026-05-24 기록)

| 항목 | 결과 |
|------|------|
| develop vs main | **55 commits**, 256 files (+50,678 / −637) |
| 중심 | `government-support/**`, `server/lib/governmentSupport/**`, `server/apis/government*`, E2E |
| 문서·테스트 | `docs/government-*`, `*.test.js`, `e2eGovernment*.mjs` |
| `dist/`, `.env` 실값, secret | diff **없음** |

### 보험 원본

| 경로 | vs main |
|------|---------|
| `src/features/customers/**` | **변경 0** |
| `src/features/contracts/**` | **변경 0** |
| `src/features/customer-app/**` (보험) | **변경 0** |

공유 wiring만 소량: `appRouter.tsx`, `AppLayout.tsx`, `platformRbac.js`, `server/index.js` 등.

---

## 4. develop 테스트 데이터 (자동 삭제 안 함)

| 대상 | 권장 |
|------|------|
| `e2e_staff_user`, `e2e_agency_admin` | **유지** (staff E2E) |
| `e2e_ua_dev`, `e2e_ub_dev` | 시드 시 **유지** |
| `e2e_sig_*`, `e2e_join_*` | E2E 누적 — **선택 정리** |
| E2E 공지·자료·요청서류·문의·서명 | develop 노이즈 — **선택 정리** |
| R2 `government/*` 테스트 객체 | lifecycle 정책 별도 합의 |

---

## 5. develop 자동 검증 (완료)

| 항목 | 결과 |
|------|------|
| `npm run build` | ✅ |
| `npm test` | **204 pass** |
| `e2e:government:join-code` | **29 pass** |
| `e2e:government:user-workspace` | **136 pass** |
| `e2e:government:signatures` | **49 pass** |

SMS 429 발생 시: 60~90초 cooldown 후 재실행 (rate limit ≠ 코드 결함).

---

## 6. 남은 이슈

1. **실기기 모바일** 전체 탭 스모크 (§1)
2. **production Railway Variables** 실측 (§2)
3. **문의 첨부파일** HTTP E2E 미포함
4. **develop `e2e_*` 데이터** 정리 정책 (선택)
5. **main merge / production 배포** — 사용자 명시 승인 + §1·§2 완료 후

---

## 7. merge / 배포 게이트 (체크리스트)

main merge 또는 production 배포 **직전** 모두 충족:

- [ ] §1 실기기 모바일 스모크 완료
- [ ] §2 production ENV/secret Dashboard 확인
- [ ] §3 diff·보험 원본 무결성 재확인
- [ ] develop E2E·test green 재확인
- [ ] 사용자 **명시 지시** (`AGENTS.md` develop → main ff-only)
- [ ] bootstrap ENV 삭제 상태·보험 DB 미접근 확인

**현재 결론 (2026-05-24):**

- **지금 main merge 하지 않는다.**
- **지금 production 배포 하지 않는다.**
- develop에서 §1·§2 완료 후 승인을 받고 merge한다.
