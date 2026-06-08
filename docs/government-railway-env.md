# Government CRM — Railway / ENV 분리 가이드

보험 CRM(`insurance` Railway project)과 **완전히 별도**로 운영한다.

## 필수 분리

| 항목 | Government | 보험 CRM |
|------|------------|----------|
| GitHub repo | `tjddyd55-crypto/government` | `insurance` (별도) |
| Railway project | **전용 project** | CRM-Platform 등 |
| PostgreSQL | **전용 DB** | 별도 인스턴스 |
| `DATABASE_URL` | government DB만 | insurance DB만 |

## R2 (파일)

- `CRM_R2_OBJECT_ROOT` 예: `crm-platform/development/government/tenants/{agencyCode}`
- 서류 업로드 키: `government/tenants/{tenantId}/profiles/{profileId}/documents/...`
- 보험 `files/`, `insurer/` prefix와 **혼용하지 않음**

## API

- Government 전용: `/api/government-support/*`
- 보험 `/api/customers`, `/api/storage` 를 government 화면에서 호출하지 않음

## 웹 라우트

- 진입: `/government/login`, `/government/workspace`
- 보험 `/customers`, `/contracts/*` 와 UI 링크로 연결하지 않음
