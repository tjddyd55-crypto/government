# 정부지원 CRM — 저장 키·R2 object key SSOT

> **코드 SSOT:** `server/lib/governmentSupport/governmentR2Keys.js`  
> **프론트 route/tab:** `src/features/government-support/constants/`  
> **알림:** `server/lib/governmentSupport/governmentNotificationKeys.js`

---

## R2 bucket vs object key

| 구분 | 값 |
|------|-----|
| **Bucket (ENV)** | `platform-assets` (`CRM_R2_BUCKET` 등) |
| **Object key root** | `government/` |

**금지**

- object key에 `platform-assets` 포함
- `platform-assets/government/...` 형태
- `government/platform-assets/...` 형태
- PII(이름·전화·주민번호·기관코드)를 key segment로 사용
- `CRM_R2_OBJECT_ROOT=platform-assets` (bucket name 오설정)

**허용**

- `CRM_R2_OBJECT_ROOT` 미설정 (prod 기본) — key는 `government/...` 그대로
- `CRM_R2_OBJECT_ROOT=government` — 중복 방지 후 `government/...` 유지

---

## Object key 트리 (신규 업로드)

```
government/
  agencies/{tenantId}/
    users/{userId}/
      profiles/{profileId}/
        files/{fileId}/{uuid}_{safeFileName}
        document-requests/{requestId}/{fileId}/{uuid}_{safeFileName}
        documents/{docId}/{uuid}_{safeFileName}
        edocs/{edocId}/{uuid}_{safeFileName}
        signatures/{sendSessionId}/{documentId}/{uuid}_{safeFileName}
      inquiries/{inquiryId}/{fileId}/{uuid}_{safeFileName}
    shared/
      resources/{resourceId}/{fileId}/{uuid}_{safeFileName}
      pdf-templates/{pdfTemplateId}/{uuid}_{safeFileName}
      signature-templates/{templateId}/{uuid}_{safeFileName}
  global/
    shared/resources/{resourceId}/{fileId}/{uuid}_{safeFileName}
  tmp/uploads/{uuid}_{safeFileName}
  signatures/sessions/{sendSessionId}/documents/{documentId}/…  (전자서명 런타임·legacy 호환)
  signatures/send-attachments/{userId}/{uuid}/{safeFileName}
```

---

## Legacy key (DB·R2 기존 데이터 — migration 없음)

다운로드·삭제·assert는 아래 legacy prefix도 허용한다.

| 영역 | Legacy prefix 예 |
|------|------------------|
| 프로필 파일 | `government/profile-files/{userId}/{profileId}/{fileId}/…` |
| 요청서류 | `government/request-documents/{userId}/{profileId}/{requestId}/{itemId}/{fileId}/…` |
| 문의 | `government/inquiries/{userId}/{inquiryId}/{messageId\|root}/{fileId}/…` |
| 자료실 | `government/resources/{tenantId\|global}/{resourceId}/…` |
| 서류 checklist | `government/tenants/{tenantId}/profiles/{profileId}/documents/…` |
| PDF 템플릿 | `pdf-templates/gov-user-{owner}/…` (**신규 업로드 금지** — 읽기 호환만) |
| PDF 템플릿 (tenant 없음, 신규) | `government/tmp/pdf-templates/{userId}/{uuid}_{code}.pdf` |

---

## 프론트 정책

- R2 object key는 **presign API 응답만** 사용 (`objectKey` / `storageKey`)
- localStorage/sessionStorage는 `governmentStorageKeys.ts` 상수만 사용
- workspace tab id/path/label은 `governmentProfileWorkspaceTabs.ts` + `governmentWorkspaceKeys.ts`

---

## 알림 SSOT

- eventType: `document_request_submitted`, `inquiry_created`, … (`governmentNotificationKeys`)
- targetType: `document_request`, `inquiry`, `signature_session`, `program_user`
- targetUrl: `/government/admin/document-requests` 등 (`GOV_NOTIFICATION_TARGET_URLS`)

DB에 이미 저장된 status/target_type 값은 변경하지 않는다.
