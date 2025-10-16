# ChoreRights API Contracts

**Version:** 1.0  
**Date:** 2025-10-16  
**Owner:** ChoreRights Engineering (API Platform)

---

## 0. Conventions

- **Base URL (App Router / Edge Functions)**:
  - Web (Next.js API routes): `/api/...`
  - Supabase REST (PostgREST): `/rest/v1/...`
- **Auth**: Supabase JWT in `Authorization: Bearer <token>`
- **Content-Type**: `application/json; charset=utf-8`
- **Idempotency**: For mutating endpoints, support `Idempotency-Key` header (UUID v4).
- **Errors**: Problem+JSON style

  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "field X is required", "details": {...} } }

  •	Dates: ISO8601 YYYY-MM-DDTHH:mm:ss.sssZ (UTC)
  •	Pagination: Cursor based — ?limit=50&cursor=<opaque> returns next_cursor
  •	RLS: All data access enforced by Supabase Row Level Security.
  ```

⸻

1. Authentication & Session (Test Utilities)

1.1 POST /api/test/set-auth (E2E helper)

Establish SSR session during Playwright tests (non-prod).
• Auth: none (guarded by NODE_ENV !== 'production')
• Body

{ "email": "tester@example.com", "role": "creator" }

    •	Response

{ "ok": true, "userId": "<uuid>" }

⸻

2. Choreography Registration

2.1 POST /api/works/register

Create a choreography “Work”, generate ICC code, persist fingerprint & on-chain proof.
• Auth: required (creator)
• Body

{
"title": "Wave Motion 2025",
"description": "Hip-hop isolation combo",
"categories": ["hiphop","isolation"],
"video": { "storageKey": "public/works/vid_12345.mp4" },
"icc": {
"country": "JP",
"registrant": "CRG",
"serial": "000001"
},
"fingerprint": {
"algo": "pose-v1",
"hash_or_vector": "9b3d...e1"
},
"delegation": {
"isDelegated": true,
"scope": ["license_collect","license_enforce"]
},
"termsAccepted": true
}

    •	Validation (Zod shape—reference)

createWorkPayload = {
title: string(min 2, max 120),
description?: string(max 2000),
categories?: string[] (<=5),
video: { storageKey: string },
icc: { country: /^[A-Z]{2}$/, registrant: /^[A-Z0-9]{3,5}$/, serial: /^[0-9]{6}$/ },
fingerprint?: { algo: string; hash_or_vector: string },
delegation?: { isDelegated: boolean; scope?: ('license_collect'|'license_enforce')[] },
termsAccepted: true
}

    •	Response

{
"id": "e691126e-8c5a-45f1-89c6-ebf9ded115b4",
"icc": "JP-CRG-000001",
"fingerprint": { "id": "fgr_01H...", "algo": "pose-v1", "hash": "9b3d...e1" },
"polygon": { "txHash": "0xabc...def", "network": "mumbai" },
"createdAt": "2025-10-16T06:10:42.100Z"
}

    •	Errors
    •	400 VALIDATION_ERROR invalid ICC format / missing video
    •	403 RLS_DENIED creator does not own resource
    •	500 ONCHAIN_ERROR polygon mint failure (include txDebugId)

⸻

3. Work Retrieval

3.1 GET /api/works/:id
• Auth: owner or public (PoC: owner-only)
• Response

{
"id": "e691126e-8c5a-45f1-89c6-ebf9ded115b4",
"title": "Wave Motion 2025",
"icc": "JP-CRG-000001",
"ownerId": "u_01H...",
"video": { "url": "https://..." },
"status": "ACTIVE",
"createdAt": "2025-10-16T06:10:42.100Z"
}

3.2 GET /api/works?limit=20&cursor=...&q=wave
• Auth: required
• Response

{ "items": [ { "id": "...", "title":"..." } ], "next_cursor": "opaque" }

⸻

4. License Flow

4.1 POST /api/license/request

Create a license request from a company (licensee) for a given work.
• Auth: required (licensee)
• Body

{
"workId": "e691126e-8c5a-45f1-89c6-ebf9ded115b4",
"territories": ["JP"],
"durationDays": 30,
"media": ["sns","web"],
"exclusivity": "non-exclusive",
"startDate": "2025-11-01",
"contact": { "company": "Acme Ltd.", "email": "legal@acme.co.jp" }
}

    •	Response

{
"id": "lrq_01H...",
"status": "PENDING",
"quote": { "base": 50000, "surcharges": { "media_sns": 5000 }, "total": 55000, "currency": "JPY" }
}

4.2 POST /api/license/calculate

Return a deterministic quote (no DB writes).
• Auth: required
• Body

{ "workId": "e6...b4", "territories": ["JP"], "durationDays": 30, "media": ["sns"] }

    •	Response

{ "base": 50000, "surcharges": { "media_sns": 5000 }, "total": 55000, "currency": "JPY" }

4.3 POST /api/license/approve

Creator approves a request; creates an Agreement draft and (optionally) on-chain record.
• Auth: required (creator who owns the work)
• Body

{ "requestId": "lrq_01H...", "note": "OK. Usage limited to brand's official account." }

    •	Response

{
"agreementId": "agr_01H...",
"status": "APPROVED",
"next": { "signUrl": "https://..." }
}

4.4 POST /api/license/reject
• Auth: creator
• Body

{ "requestId": "lrq_01H...", "reason": "Conflicts with another exclusive deal." }

    •	Response

{ "status": "REJECTED" }

⸻

5. Agreements & Proof

5.1 GET /api/agreements/:id
• Auth: creator or licensee in the agreement
• Response

{
"id": "agr_01H...",
"workId": "e6...b4",
"parties": {
"creatorId": "u_01H...",
"licenseeId": "u_01K..."
},
"terms": {
"territories": ["JP"],
"durationDays": 30,
"media": ["sns","web"],
"fee": 55000,
"currency": "JPY"
},
"status": "SIGNED",
"polygon": { "txHash": "0xabc...def", "network": "mumbai" },
"signedAt": "2025-11-02T03:00:00.000Z"
}

5.2 POST /api/agreements/sign
• Auth: both parties (separately)
• Body

{ "agreementId": "agr_01H...", "signature": "JWS or WebCrypto proof" }

    •	Response

{ "status": "SIGNED_PARTY", "signedAt": "2025-11-02T03:00:00.000Z" }

5.3 POST /api/agreements/finalize

When both have signed, mint the on-chain proof (PoC: mock or real tx).
• Auth: system/creator
• Body

{ "agreementId": "agr_01H..." }

    •	Response

{ "status": "FINALIZED", "polygon": { "txHash": "0xabc...def" } }

⸻

6. Payments & Distribution (PoC)

※ 本MVPでは Stripe の実課金は任意。最低限のレコード生成と自動分配（シミュレーション/テストモード）を定義。

6.1 POST /api/payments/record
• Auth: system/creator
• Body

{ "agreementId": "agr_01H...", "amount": 55000, "currency": "JPY", "source": "stripe_test" }

    •	Response

{ "paymentId": "pay_01H...", "status": "RECORDED" }

6.2 POST /api/payouts/distribute
• Auth: system
• Body

{ "agreementId": "agr_01H...", "split": { "creator": 0.7, "platform": 0.3 } }

    •	Response

{
"payouts": [
{ "to": "creator", "amount": 38500, "currency": "JPY" },
{ "to": "platform", "amount": 16500, "currency": "JPY" }
],
"status": "DISTRIBUTED"
}

⸻

7. KPI / Admin

7.1 GET /api/admin/kpi?from=2025-10-01&to=2025-10-31
• Auth: admin only (RLS)
• Response

{
"daily": [
{ "day": "2025-10-01", "signup_users": 3, "work_count": 7, "license_requests": 2, "agreements": 1, "api_uptime": 99.7, "ai_precision": 0.84 }
],
"targets": [
{ "key": "agreements", "target": 5, "period_start": "2025-10-01", "period_end": "2025-12-31", "unit": "count" }
]
}

7.2 GET /api/admin/kpi/export.csv
• Auth: admin
• Response: text/csv (UTF-8)

day,signup_users,work_count,license_requests,agreements,api_uptime,ai_precision
2025-10-01,3,7,2,1,99.7,0.84

⸻

8. Webhooks

8.1 /api/webhooks/stripe
• Events: payment_intent.succeeded, transfer.created (test mode acceptable)
• Security: Stripe-Signature verification
• Action: upsert to payments table, trigger distribution if configured

8.2 /api/webhooks/polygon
• Events: optional callbacks (Alchemy / custom relayer)
• Action: update agreements.polygon_tx_hash

⸻

9. Security & Compliance
   • AuthN/Z: Supabase JWT, RLS policies per table
   • PII handling: Avoid on-chain PII; store emails/real names only in protected tables
   • Encryption: TLS in transit; KMS for secrets; hashed audit trail
   • Audit: Every mutating route must log to events table with kind & meta
   • Rate limiting: 100 req/min per user (Edge middleware)

⸻

10. Error Model

HTTP code (enum) When Notes
400 VALIDATION_ERROR Zod fails Include field errors
401 UNAUTHORIZED No/invalid JWT Redirect to login in web
403 RLS_DENIED RLS blocks row Do not leak existence
404 NOT_FOUND Resource missing Generic message
409 CONFLICT Idempotency reused with different body Return original result
422 BUSINESS_RULE Violates domain rule e.g., overlapping license
500 INTERNAL Unexpected error incidentId for tracing
502 UPSTREAM RPC/Stripe/Polygon failed Include provider

Problem+JSON Structure

{
"error": {
"code": "BUSINESS_RULE",
"message": "Overlapping license period",
"details": { "agreementId": "agr_01H..." },
"incidentId": "evt_20251016_abc123"
}
}

⸻

11. Versioning
    • Header: X-API-Version: 2025-10-16 (date-based)
    • Breaking changes: introduce new path prefix /api/v2/... or new date version
    • Deprecation: respond with Deprecation: true and Sunset header

⸻

12. OpenAPI (excerpt)

フルOpenAPIは /docs/design/openapi.yaml で別管理。ここでは抜粋のみ。

openapi: 3.0.3
info:
title: ChoreRights API
version: "2025-10-16"
paths:
/api/works/register:
post:
summary: Register choreography and mint ICC proof
security: [{ bearerAuth: [] }]
requestBody:
required: true
content:
application/json:
schema:
$ref: "#/components/schemas/CreateWorkPayload"
responses:
"200":
description: Created
content:
application/json:
schema:
$ref: "#/components/schemas/CreateWorkResponse"
components:
securitySchemes:
bearerAuth:
type: http
scheme: bearer
bearerFormat: JWT

⸻

13. Testing Requirements
    • Unit: Zod schema & tariff calculator
    • Integration: Supabase RPC + RLS access
    • E2E: register → request → approve → finalize happy path (Playwright)
    • Resilience: Retry on UPSTREAM 5xx with exponential backoff

⸻

14. Changelog
    • 1.0 (2025-10-16): Initial contract for MVP/PoC, including licensing, agreements, KPI, and webhook skeletons.

⸻
