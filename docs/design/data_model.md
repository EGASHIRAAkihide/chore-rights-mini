# ChoreRights Data Model

**Version:** 1.0  
**Date:** 2025-10-16  
**Owner:** ChoreRights Engineering Team (Data Platform)

---

## 1. Overview

The ChoreRights data model is designed to:

- Support **authorship registration** of choreography.
- Manage **license requests and agreements** between creators and companies.
- Enable **royalty tracking**, **AI detection logging**, and **PoC KPI measurement**.
- Maintain full **RLS (Row Level Security)** compliance using Supabase.

---

## 2. ER Diagram (Mermaid)

```mermaid
erDiagram

    USERS ||--o{ WORKS : owns
    WORKS ||--o{ LICENSE_REQUESTS : subject
    LICENSE_REQUESTS ||--o| AGREEMENTS : results_in
    AGREEMENTS ||--o{ PAYMENTS : generates
    AGREEMENTS ||--o{ FINGERPRINTS : linked
    WORKS ||--o{ FINGERPRINTS : has
    AGREEMENTS ||--o{ EVENTS : logs
    USERS ||--o{ EVENTS : triggers

    USERS {
        uuid id PK
        text email
        text role  "creator | licensee | admin"
        text wallet_address
        timestamptz created_at
    }

    WORKS {
        uuid id PK
        uuid owner_id FK
        text title
        text description
        jsonb metadata
        text icc_code
        text video_url
        uuid fingerprint_id FK
        text status "DRAFT | ACTIVE | ARCHIVED"
        timestamptz created_at
    }

    FINGERPRINTS {
        uuid id PK
        text algo
        text hash
        uuid work_id FK
        uuid created_by FK
        timestamptz created_at
    }

    LICENSE_REQUESTS {
        uuid id PK
        uuid work_id FK
        uuid requester_id FK
        jsonb request_data
        text status "PENDING | APPROVED | REJECTED"
        timestamptz created_at
    }

    AGREEMENTS {
        uuid id PK
        uuid work_id FK
        uuid creator_id FK
        uuid licensee_id FK
        jsonb terms
        text status "DRAFT | SIGNED | FINALIZED"
        text polygon_tx_hash
        timestamptz signed_at
        timestamptz created_at
    }

    PAYMENTS {
        uuid id PK
        uuid agreement_id FK
        numeric amount
        text currency
        text source "stripe | test | manual"
        text status "RECORDED | DISTRIBUTED"
        timestamptz created_at
    }

    EVENTS {
        uuid id PK
        uuid user_id FK
        text kind
        jsonb meta
        timestamptz created_at
    }

    KPI_DAILY {
        date day PK
        int signup_users
        int work_count
        int license_requests
        int agreements
        numeric api_uptime
        numeric ai_precision
        timestamptz updated_at
    }


⸻

3. Table Definitions

3.1 users

Column	Type	Constraints	Description
id	uuid	PK	Supabase Auth UID
email	text	unique	user email
role	text	enum(creator, licensee, admin)	user type
wallet_address	text	nullable	Polygon wallet
created_at	timestamptz	default now()	registration timestamp

Indexes
	•	users_email_idx (unique)
	•	users_role_idx

⸻

3.2 works

Column	Type	Constraints	Description
id	uuid	PK	work ID
owner_id	uuid	FK → users.id	choreographer
title	text	not null	choreography title
description	text	nullable	optional detail
metadata	jsonb	nullable	ICC & categories
icc_code	text	unique	e.g., JP-CRG-000001
video_url	text	nullable	storage URL
fingerprint_id	uuid	FK → fingerprints.id	latest fingerprint
status	text	enum(DRAFT, ACTIVE, ARCHIVED)	lifecycle status
created_at	timestamptz	default now()	timestamp

Indexes
	•	works_owner_idx
	•	works_icc_code_idx (unique)

⸻

3.3 fingerprints

Column	Type	Constraints	Description
id	uuid	PK	fingerprint ID
algo	text	not null	e.g., pose-v1
hash	text	not null	vector hash
work_id	uuid	FK → works.id	linked work
created_by	uuid	FK → users.id	owner
created_at	timestamptz	default now()	timestamp

Triggers
	•	set_created_by() → auto-fill from JWT
	•	set_default_hash() → populate hash if null and vector available

⸻

3.4 license_requests

Column	Type	Constraints	Description
id	uuid	PK	request ID
work_id	uuid	FK → works.id	requested work
requester_id	uuid	FK → users.id	company user
request_data	jsonb	not null	metadata (territory, duration, media)
status	text	enum(PENDING, APPROVED, REJECTED)	request state
created_at	timestamptz	default now()	timestamp


⸻

3.5 agreements

Column	Type	Constraints	Description
id	uuid	PK	agreement ID
work_id	uuid	FK → works.id	linked work
creator_id	uuid	FK → users.id	creator
licensee_id	uuid	FK → users.id	company
terms	jsonb	not null	license metadata
status	text	enum(DRAFT, SIGNED, FINALIZED)
polygon_tx_hash	text	nullable	blockchain TX
signed_at	timestamptz	nullable	timestamp
created_at	timestamptz	default now()	timestamp

Indexes
	•	agreements_work_idx
	•	agreements_creator_licensee_idx

⸻

3.6 payments

Column	Type	Constraints	Description
id	uuid	PK	payment ID
agreement_id	uuid	FK → agreements.id	source agreement
amount	numeric(12,2)	not null	payment amount
currency	text	not null	currency code
source	text	enum(stripe, test, manual)
status	text	enum(RECORDED, DISTRIBUTED)
created_at	timestamptz	default now()	timestamp


⸻

3.7 events

Column	Type	Constraints	Description
id	uuid	PK	event ID
user_id	uuid	FK → users.id	actor
kind	text	e.g., work.register, license.request, agreement.sign
meta	jsonb	additional data
created_at	timestamptz	default now()	timestamp

Usage
	•	For auditing and KPI aggregation.

⸻

3.8 kpi_daily

Column	Type	Constraints	Description
day	date	PK	daily record date
signup_users	int	default 0	new users
work_count	int	default 0	registered works
license_requests	int	default 0	total requests
agreements	int	default 0	total agreements
api_uptime	numeric(5,2)		uptime percentage
ai_precision	numeric(5,2)		AI accuracy
updated_at	timestamptz	default now()	timestamp


⸻

4. Relationships Summary

From	Relation	To	Type
users.id	→	works.owner_id	1:N
works.id	→	fingerprints.work_id	1:N
works.id	→	license_requests.work_id	1:N
license_requests.id	→	agreements.id	1:1
agreements.id	→	payments.agreement_id	1:N
users.id	→	events.user_id	1:N
events	→	kpi_daily	aggregated


⸻

5. RLS Policies Summary

Table	Policy	Rule	Role
works	owner_can_select	owner_id = auth.uid()	creator
fingerprints	created_by_can_select	created_by = auth.uid()	creator
license_requests	own_or_creator	requester_id = auth.uid() OR work.owner_id = auth.uid()	both
agreements	participant_access	creator_id = auth.uid() OR licensee_id = auth.uid()	both
payments	participant_access	agreement.creator_id = auth.uid() OR agreement.licensee_id = auth.uid()	both
events	self_access	user_id = auth.uid()	all
kpi_daily	admin_only	auth.role() = 'admin'	admin


⸻

6. Stored Procedures (Supabase RPC)

Function	Description	Return Type
create_work_with_icc()	Insert work + ICC generation + fingerprint insert	uuid
approve_license_request()	Move request → agreement + notify	uuid
log_event(kind text, meta jsonb)	Insert into events	void
aggregate_kpi_daily()	Cron function for KPI rollup	void


⸻

7. Audit & Compliance
	•	Audit Trail: all mutations logged in events.
	•	Data Retention: 5 years (or as required by local copyright law).
	•	GDPR / 個人情報保護: anonymize meta for deleted users.
	•	Blockchain Linking: store only tx_hash, never private keys.
	•	Encryption: sensitive fields (wallets, emails) stored encrypted-at-rest.

⸻

8. Scalability Notes
	•	PostgreSQL partitioning for events and payments (daily/monthly).
	•	Supabase realtime for admin KPI dashboards.
	•	Use S3-compatible storage for video blobs, referencing via video_url.
	•	Index icc_code, hash, and status for API queries.

⸻

9. Example Data Snapshot

{
  "users": [
    {
      "id": "u_001",
      "email": "creator@example.com",
      "role": "creator"
    }
  ],
  "works": [
    {
      "id": "w_001",
      "title": "Blue Bird Motion",
      "icc_code": "JP-CRG-000001",
      "owner_id": "u_001"
    }
  ],
  "agreements": [
    {
      "id": "a_001",
      "work_id": "w_001",
      "creator_id": "u_001",
      "licensee_id": "u_002",
      "status": "SIGNED"
    }
  ]
}


⸻

10. Versioning & Migration Strategy

Version	Change Summary	File
v1.0	Initial schema for PoC (core 8 tables)	/supabase/migrations/20251016_init.sql
v1.1	Add KPI & audit tables	/supabase/migrations/20251020_kpi_audit.sql
v1.2	Add RLS + triggers	/supabase/migrations/20251022_rls_policies.sql


⸻

Approved by:
ChoreRights Product Management Office
Last Updated: 2025-10-16
```
