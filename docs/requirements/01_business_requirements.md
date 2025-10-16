# ChoreRights Business Requirements Document (BRD)

**Version:** 1.0  
**Date:** October 2025  
**Author:** GASHI / Product Management Office

---

## 1. Business Overview

**ChoreRights** is a blockchain-powered intellectual property (IP) management platform focused on protecting and monetizing **dance choreography**.  
The platform enables creators (choreographers, dancers) to **register**, **license**, and **receive royalties** for their works, while allowing companies, event organizers, and content platforms to **obtain legal permission** for choreography usage.

The core concept:

> “To turn choreography into recognized, traceable, and monetizable intellectual property.”

---

## 2. Purpose of the Project

### 2.1 Problem Statement

In Japan and across Asia, dance content is rapidly shared and reused across platforms (YouTube, TikTok, Reels, etc.), but:

- There is **no standardized way** to register choreography as intellectual property.
- Creators **do not receive royalties** when their work is reused.
- Companies face **legal ambiguity** in using popular choreography commercially.

### 2.2 Goal

Create a unified system to:

- Protect dance creators’ rights via digital registration and blockchain proof.
- Provide a transparent licensing process for commercial users.
- Enable automated royalty calculation and distribution.

---

## 3. Target Market & Segmentation

| Segment                       | Description                               | Pain Point                                 | Value Provided                                  |
| ----------------------------- | ----------------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| **Choreographers / Dancers**  | Independent or agency-affiliated creators | Cannot prove authorship; no royalty income | IP registration + royalty distribution          |
| **Entertainment Companies**   | TV, music labels, production houses       | Unclear licensing procedures               | Simplified license management + legal assurance |
| **Event Organizers / Brands** | Commercial events, PR campaigns           | Lack of standardized contracts             | Streamlined licensing + copyright clearance     |
| **Video Platforms / SNS**     | YouTube, TikTok, etc.                     | IP disputes with creators                  | Integratable license verification API           |

---

## 4. Stakeholders

| Role                        | Description                         | Interest / Expectation          |
| --------------------------- | ----------------------------------- | ------------------------------- |
| **Choreographer (Creator)** | Registers works, receives royalties | Fair credit & income            |
| **Platform User (Company)** | Requests choreography license       | Legal clarity & simplicity      |
| **Cultural Affairs Agency** | Government regulator                | Compliance and legal control    |
| **Investors / VC**          | Provides seed funding               | Scalable IP tech business       |
| **Legal Advisors**          | IP & copyright consultants          | Proper legal frameworks         |
| **Engineering Team**        | Builds platform                     | Clear requirements & milestones |

---

## 5. Key Business Requirements (Top-Level)

| ID    | Requirement                     | Description                                                                    | Priority |
| ----- | ------------------------------- | ------------------------------------------------------------------------------ | -------- |
| BR-01 | Authorship Registration         | Allow creators to register choreography and prove authorship using blockchain. | High     |
| BR-02 | License Management              | Enable users to request, approve, and manage usage licenses.                   | High     |
| BR-03 | Royalty Calculation             | Implement transparent distribution logic based on usage data.                  | High     |
| BR-04 | Legal Compliance                | Align data handling and contract formats with copyright law.                   | High     |
| BR-05 | Multi-language / Region Support | Prepare for multilingual, multi-jurisdiction use.                              | Medium   |
| BR-06 | AI Detection Integration        | Enable automatic detection of choreography usage via video analysis.           | Medium   |
| BR-07 | Reporting / KPI Dashboard       | Provide performance metrics for internal and investor review.                  | Medium   |

---

## 6. Business Goals & Success Metrics

### 6.1 KGI (Key Goal Indicators)

| Category               | KGI                                        | Target by Q2 2026 |
| ---------------------- | ------------------------------------------ | ----------------- |
| **Market Adoption**    | 200+ registered creators                   | ✅ 200            |
| **Licensing Activity** | 100+ approved license contracts            | ✅ 100            |
| **Revenue Generation** | ¥3M total transaction volume               | ✅ ¥3,000,000     |
| **Brand Recognition**  | Partnership with 2+ entertainment agencies | ✅ 2 partnerships |

### 6.2 KPI (Key Performance Indicators)

| Category                  | KPI                                 | Metric        | Frequency |
| ------------------------- | ----------------------------------- | ------------- | --------- |
| **Creator Engagement**    | Number of new registrations         | 50/month      | Monthly   |
| **License Flow**          | Request → Agreement conversion rate | ≥40%          | Weekly    |
| **AI Detection Accuracy** | Match precision                     | ≥90%          | Monthly   |
| **User Retention**        | Monthly active users                | 60% retention | Monthly   |
| **Platform Stability**    | Uptime (API)                        | ≥99.5%        | Daily     |
| **Support Response**      | Ticket resolution time              | <24h          | Weekly    |

---

## 7. Business Assumptions

- Creators are **willing to pay** small fees (¥300–¥500) for proof-of-authorship tokens.
- Enterprises will prefer **annual license subscriptions** rather than one-off payments.
- Blockchain evidence will be accepted as **legal support material** under the Cultural Affairs Agency.
- AI-based detection will act as a **compliance support tool**, not a punitive measure.

---

## 8. Risks & Mitigation

| Risk                     | Description                                | Mitigation Strategy                               |
| ------------------------ | ------------------------------------------ | ------------------------------------------------- |
| **Low Creator Adoption** | Creators do not see immediate ROI.         | Incentivize early adopters via grants / exposure. |
| **Legal Delays**         | Agency approval takes months.              | Operate under “registry simulation” PoC.          |
| **Technical Complexity** | Blockchain/AI integration too heavy.       | Modular API approach, start minimal.              |
| **Revenue Delay**        | License monetization slower than expected. | Freemium + enterprise pilot licensing.            |

---

## 9. Success Criteria

The PoC is considered successful if:

1. At least **50 creators** register original choreography.
2. At least **20 licensing transactions** occur within the test period.
3. AI detection successfully identifies **90%+ reuse accuracy**.
4. Legal advisors confirm alignment with copyright frameworks.
5. Investors acknowledge the model as **scalable and investable**.

---

## 10. Timeline Alignment with PoC

| Phase                      | Description                        | Duration | Deliverable             |
| -------------------------- | ---------------------------------- | -------- | ----------------------- |
| **Phase 1 (Oct–Dec 2025)** | MVP development & closed beta      | 3 months | Demo-ready prototype    |
| **Phase 2 (Jan–Mar 2026)** | PoC validation & user testing      | 3 months | User/usage data         |
| **Phase 3 (Apr–Jun 2026)** | Investor pitch & registration prep | 3 months | Business license filing |

---

## 11. Conclusion

ChoreRights bridges the gap between dance culture and legal IP infrastructure.  
This Business Requirements Document defines the **strategic purpose, user needs, and measurable outcomes** of the MVP and PoC.  
It ensures that every technical feature and design choice aligns directly with business value, laying the foundation for a future copyright management entity for choreography.

---

**Approved by:**  
ChoreRights Product Management Office  
**Last Updated:** 2025-10-16
