# ChoreRights Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** October 2025  
**Author:** GASHI / Product Management Office

---

## 1. Purpose

This Product Requirements Document (PRD) defines the **core features**, **user experience**, and **technical constraints** for the ChoreRights MVP application.  
The MVP aims to demonstrate the feasibility of choreography registration, blockchain-based licensing, and automatic royalty distribution during the PoC phase.

---

## 2. Scope

The MVP focuses on five primary capabilities:

1. **Choreography Registration** — creators can register original works with metadata and video proof.
2. **License Request & Approval** — companies request and receive usage licenses.
3. **Royalty Distribution** — payments are simulated or recorded through smart contracts.
4. **Blockchain Proof** — authorship is verifiably stored on Polygon.
5. **KPI Dashboard** — internal monitoring of user activity and PoC metrics.

Non-essential features such as public marketplace, social features, and creator monetization tiers are **out of scope for the MVP**.

---

## 3. User Personas

| Persona                     | Description                            | Goal                                       | Primary Pain Point                           |
| --------------------------- | -------------------------------------- | ------------------------------------------ | -------------------------------------------- |
| **Choreographer (Creator)** | Professional or freelance dance artist | Protect their work, gain credit and income | No formal proof of authorship                |
| **Company / Licensee**      | Entertainment or event company         | Legally use choreography                   | Unsure about permission or licensing process |
| **Platform Admin**          | ChoreRights internal user              | Manage user accounts, approve licenses     | Need data for investor/legal reporting       |

---

## 4. Functional Requirements

### 4.1 Registration

| ID    | Feature                | Description                                        | Priority |
| ----- | ---------------------- | -------------------------------------------------- | -------- |
| FR-01 | Work Registration Form | Upload choreography title, description, and video  | High     |
| FR-02 | Blockchain Proof       | Generate ICC code and hash via Polygon             | High     |
| FR-03 | Video Fingerprinting   | Create vector hash (pose data) via AWS Rekognition | Medium   |
| FR-04 | Authorship Dashboard   | List user’s registered works and status            | High     |

### 4.2 Licensing

| ID    | Feature           | Description                                            | Priority |
| ----- | ----------------- | ------------------------------------------------------ | -------- |
| FR-05 | License Request   | Allow companies to request use of a registered work    | High     |
| FR-06 | Approval Workflow | Creator can approve or reject requests                 | High     |
| FR-07 | License Record    | Smart contract issuance on-chain (mock in PoC)         | Medium   |
| FR-08 | Agreement Summary | Display license conditions (duration, fee, usage type) | High     |

### 4.3 Royalty & Distribution

| ID    | Feature                | Description                                   | Priority |
| ----- | ---------------------- | --------------------------------------------- | -------- |
| FR-09 | Transaction Record     | Log simulated payments per agreement          | High     |
| FR-10 | Royalty Split Logic    | Calculate splits (70% creator / 30% platform) | Medium   |
| FR-11 | Distribution Dashboard | Display royalties over time                   | Medium   |

### 4.4 Admin & Reporting

| ID    | Feature        | Description                                    | Priority |
| ----- | -------------- | ---------------------------------------------- | -------- |
| FR-12 | Admin View     | View all registered works, users, and licenses | High     |
| FR-13 | KPI Dashboard  | Track metrics from `kpi_daily`                 | High     |
| FR-14 | Export Reports | Generate CSV/PDF for investor/legal review     | Medium   |

### 4.5 Authentication & User Management

| ID    | Feature            | Description                                 | Priority |
| ----- | ------------------ | ------------------------------------------- | -------- |
| FR-15 | Sign Up / Login    | Supabase auth (Magic Link + OAuth)          | High     |
| FR-16 | Profile Management | Creator info, wallet address, contact       | High     |
| FR-17 | RLS Enforcement    | Ensure users can only access their own data | High     |

---

## 5. Non-Functional Requirements (NFR)

| Category                | Requirement                     | Target          |
| ----------------------- | ------------------------------- | --------------- |
| **Performance**         | Page load under 2 seconds       | < 2s            |
| **Availability**        | System uptime                   | ≥ 99.5%         |
| **Scalability**         | Handle 1000+ concurrent users   | Scalable infra  |
| **Security**            | RLS active, JWT-based auth      | Required        |
| **Data Retention**      | Video & hash stored for 5 years | Legal retention |
| **Blockchain Gas Cost** | ≤ ¥30 per transaction (PoC)     | Polygon testnet |
| **AI Accuracy**         | ≥ 90% match precision           | AWS Rekognition |
| **Compliance**          | GDPR & 個人情報保護法 (Japan)   | Required        |

---

## 6. User Flows

### 6.1 Choreographer Registration Flow

```mermaid
flowchart TD
A[Login] --> B[Upload Video & Metadata]
B --> C[Generate ICC Hash]
C --> D[Store on Supabase]
D --> E[Mint Authorship Token on Polygon]
E --> F[Registration Complete]

6.2 License Request Flow

flowchart LR
A[Licensee Dashboard] --> B[Browse Works]
B --> C[Request License]
C --> D[Creator Approval]
D --> E[Smart Contract Record]
E --> F[Usage + Royalty Log]

6.3 KPI Monitoring Flow

flowchart TD
A[Events Table] --> B[Daily Aggregator Function]
B --> C[KPI_Daily Table]
C --> D[Admin Dashboard (/admin/kpi)]


⸻

7. UI Overview

7.1 Creator Dashboard

Section	Description
My Works	List of all registered choreography with status & hash
Upload Form	Title, Description, File Upload, Generate ICC
License Requests	Pending approval list
Earnings	Simulated royalty earnings
Profile	Edit contact info, wallet, bio

7.2 Licensee Dashboard

Section	Description
Browse Works	Filterable list of choreography
Request Form	Duration, purpose, location, etc.
Contracts	Track approved or pending licenses
Payments	Record of simulated royalties

7.3 Admin Dashboard

Section	Description
User Management	List of all users and roles
Work Registry	View all submissions and ICC codes
License Tracker	Review all agreements
KPI Metrics	Key performance overview
Export Reports	Downloadable CSV/PDF summaries


⸻

8. Technical Constraints

Category	Description
Platform	Web app (Next.js 14 + Supabase + Polygon)
Database	PostgreSQL (Supabase Cloud)
Blockchain	Polygon Mumbai Testnet
Storage	Supabase / AWS S3
AI Service	AWS Rekognition Custom Labels
Hosting	Vercel (Frontend), Supabase (Backend)
Integration	Stripe (future), Alchemy (Polygon RPC)
Environment	.env.local for secrets; CI/CD via GitHub Actions


⸻

9. Future Enhancements (Post-PoC)

Area	Description
Public Marketplace	Allow public browsing and licensing
Automated Payments	Integrate Stripe for real transactions
Smart Royalty Pool	On-chain royalty escrow system
Creator Analytics	Engagement metrics & trend visualization
Internationalization	Multi-language UI and jurisdiction logic
Mobile App	React Native client (Phase 3+)


⸻

10. Acceptance Criteria

The MVP will be deemed complete when the following are met:
	•	Users can register choreography and receive an on-chain ICC proof.
	•	Companies can submit license requests and view agreements.
	•	Admins can monitor KPI metrics and export reports.
	•	RLS and authentication are fully enforced.
	•	All features are stable in production and pass E2E tests.

⸻

Approved by:
ChoreRights Product Management Office
Last Updated: 2025-10-16
```
