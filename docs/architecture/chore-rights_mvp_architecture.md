# ChoreRights MVP Architecture Document

**Version:** 1.0  
**Date:** October 2025  
**Author:** GASHI / ChoreRights PM Office

---

## 1. Overview

ChoreRights is an MVP platform designed to register, license, and transparently distribute royalties for dance choreography using modern web and blockchain technologies.  
The MVP leverages **Next.js 14 (App Router)** as the frontend, **Supabase** as the backend service for database + authentication, and **Polygon blockchain** for immutable proof of authorship and license transactions.

This document outlines the technical architecture, key design decisions, and system components used in the PoC (Proof of Concept) and MVP phases.

---

## 2. System Goals

- **Transparency:** Provide verifiable proof of choreography authorship and usage.
- **Automation:** Enable automatic license issuance and royalty distribution.
- **Scalability:** Use modular services that can expand to global operations.
- **Compliance:** Align with Japan’s copyright law and future international frameworks.

---

## 3. Architecture Diagram

```mermaid
graph TD
  A[Frontend: Next.js App (apps/web)] --> B[Supabase Auth & DB]
  A --> C[Polygon Blockchain (License Registry)]
  A --> D[Storage: Supabase/S3 for Videos]
  B --> E[API Gateway: Edge Functions]
  C --> F[Smart Contract: License NFT]
  E --> G[AI Service: Pose Detection (AWS Rekognition)]
  E --> H[Analytics & KPI Tracker]
```

⸻

## 4. Component Breakdown

4.1 Frontend (Next.js 14)
• Stack: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
• Functions:
• User onboarding (auth via Supabase)
• Choreography registration form
• License request workflow
• Dashboard (royalty, usage analytics, KPI)
• Admin console for PoC evaluation

4.2 Backend (Supabase)
• PostgreSQL DB:
• Tables: works, fingerprints, license_templates, license_requests, agreements, payouts
• RLS Policies: Secure per-user access control (auth.uid() = owner_id)
• Auth: Magic link & OAuth login (Google, Apple)
• Edge Functions: Contract minting, AI verification, KPI logging
• Storage: Supabase Buckets for video and metadata

4.3 Blockchain (Polygon)
• Smart Contracts:
• AuthorshipNFT.sol: Registers choreography ownership
• LicenseNFT.sol: Issues transferable license tokens
• Network: Polygon PoS / Mumbai testnet
• Gas Abstraction: Future integration with account abstraction (ERC-4337)
• API Integration: via Alchemy SDK or ethers.js

4.4 AI Detection (AWS Rekognition)
• Purpose: Detect similarity or usage of registered choreography from uploaded videos.
• Workflow:
• Convert pose data into vector hash (OpenPose format)
• Compare to stored fingerprints.hash
• Confidence score ≥ threshold triggers potential match.

4.5 Analytics & KPI System
• Goal: Track registrations, license flow, agreements, and revenue KPIs.
• Implementation:
• Edge function aggregates events table nightly.
• kpi_daily → /admin/kpi dashboard.

⸻

## 5. Security Design

    •	Auth-based RLS: All tables enforce Supabase RLS.
    •	Encryption: Supabase KMS + Secrets Manager for private keys.
    •	Blockchain Key Management: Server-side custodial wallet (PoC phase), user wallets in later versions.
    •	Data Integrity:
    •	Each choreography → IPFS hash
    •	Linked with blockchain transaction ID.

⸻

## 6. Scalability & Future Integration

Layer Current (MVP) Future (V2+)
DB Supabase (Postgres) Multi-region DB + caching
Blockchain Polygon testnet Polygon mainnet / Layer2 (Arbitrum)
AI AWS Rekognition Custom fine-tuned pose model
Auth Supabase DID + wallet-based auth
License NFT-based Smart contract–based auto renewal

⸻

## 7. Deployment Environment

Component Provider Notes
Web App Vercel Auto CI/CD via GitHub
Database Supabase Cloud RLS active
AI Service AWS Rekognition API
Blockchain Polygon Mumbai via Alchemy RPC
CI/CD GitHub Actions Lint, test, build
Monitoring CloudWatch + Supabase Logs Error tracking

⸻

## 8. Conclusion

This MVP architecture demonstrates how ChoreRights can bridge dance IP management and blockchain transparency. The system ensures both legal compliance (authorship proof) and technical scalability, paving the way for international licensing frameworks and AI-assisted content verification.
