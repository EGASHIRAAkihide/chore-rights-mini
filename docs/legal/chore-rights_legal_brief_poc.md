# ChoreRights Legal Brief for PoC

**Version:** 1.0  
**Date:** October 2025  
**Author:** GASHI / ChoreRights Legal Research Team

---

## 1. Purpose of This Document

This legal brief summarizes the initial findings, constraints, and actionable guidance derived from legal consultations conducted with the **Tokyo Metropolitan Intellectual Property Center (東京都知的財産総合センター)** and external counsel specializing in copyright law and blockchain IP management.  
It is intended to guide the Proof of Concept (PoC) for ChoreRights — a choreography copyright management and licensing platform — ensuring that the service complies with Japanese copyright law while exploring the feasibility of blockchain-based rights registration.

---

## 2. Legal Context

### 2.1 Japanese Copyright Law Overview

- **Relevant Law:** Copyright Act of Japan (著作権法, Act No. 48 of 1970)
- **Key Principle:** Protection arises automatically upon creation — no formal registration required.
- **Choreography as Work:**  
  According to Article 10(1)(vi) and (viii), “舞踊・無言劇等の著作物” (choreographic works and pantomime) are explicitly recognized as protected works.
- **Registration Authority:**  
  Voluntary registration can be conducted through the **Agency for Cultural Affairs (文化庁)** or a delegated **copyright management organization** approved under Article 12 of the Act.

### 2.2 Blockchain Evidence Recognition

- Blockchain timestamps are not formal registrations, but under Japanese law they can serve as **“補助的証拠 (auxiliary evidence)”** of authorship and creation date.
- This aligns with court precedents recognizing **hash values and blockchain proofs** as admissible evidence when corroborated with off-chain documentation.

### 2.3 Management Organization Registration

- To act as an intermediary collecting royalties (similar to JASRAC or NexTone), an entity must be:
  1. Incorporated (e.g., 株式会社 or 一般社団法人)
  2. Obtain authorization as a **copyright management service provider (著作権等管理事業者)**
  3. Report regularly to the Agency for Cultural Affairs regarding usage and distribution

---

## 3. Key Legal Questions for PoC

| Question                                                                     | Legal View                                                                                                 | Status / Action                           |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Is choreography copyrightable?**                                           | Yes. Dance choreography is explicitly listed as a protected work under Japanese law.                       | ✅ Confirmed                              |
| **Can blockchain-based registration substitute for copyright registration?** | No, but it can serve as supplementary evidence.                                                            | ⚠️ Must still support off-chain registry  |
| **Can ChoreRights collect royalties like JASRAC?**                           | Only after registration as a “copyright management service provider” with the Agency for Cultural Affairs. | ⏳ For post-PoC consideration             |
| **Can a choreography video serve as the proof of creation?**                 | Yes, provided that the video clearly represents original choreography and can be linked to the author.     | ✅ Confirmed                              |
| **Is NFT licensing legally binding?**                                        | Yes, if accompanied by explicit terms in a smart contract or linked legal agreement.                       | ⚠️ Must ensure contractual enforceability |

---

## 4. Legal Structure for PoC Phase

### 4.1 Limited Legal Scope

During the PoC, ChoreRights will **not act as an official collecting agency**.  
Instead, the service will:

1. Allow creators to **self-register** their choreography.
2. Issue **proof of authorship (ICC code)** on-chain and off-chain.
3. Simulate **license issuance** using mock smart contracts.
4. Record mock “usage” data for demonstration purposes.

### 4.2 Data Protection & Privacy

- **Personal Data:** Follows GDPR-equivalent standards; user consent required.
- **Video Data:** Stored in Supabase (EU region) or AWS S3 (Japan region).
- **Blockchain Data:** Publicly visible; avoid embedding personal identifiers.
- **Legal Retention:** Maintain metadata & hashes for 5 years for evidence continuity.

### 4.3 Copyright Assignment Flow

```mermaid
flowchart LR
A[Choreographer (Creator)] --> B[ChoreRights Platform]
B --> C[Blockchain Registration (ICC Token)]
C --> D[License Issuance (NFT or Contract)]
D --> E[Usage Tracking + Royalty Simulation]


⸻

5. International Expansion Considerations

Region	Legal Recognition of Dance IP	Blockchain Evidence Status	Licensing Potential
Japan	Explicitly recognized	Admissible as auxiliary proof	High (regulated)
United States	Recognized under “Choreographic Works” (17 USC §102(a)(4))	Increasing acceptance in courts	Very High
EU	Recognized as “Artistic Works”	Blockchain admissibility varies by member state	Moderate
South Korea	Recognized; strong K-pop dance industry	Blockchain evidence accepted in IP trials	Very High
Singapore	Recognized; IPOS-friendly regulatory environment	Official blockchain IP registry pilot	High


⸻

6. Legal Risk Assessment (PoC Phase)

Risk	Description	Mitigation
Unauthorized Registration	A user registers choreography they didn’t create.	Implement digital fingerprinting & verification.
Privacy Breach	Public exposure of performer identity via videos.	Use anonymization / consent-based submission.
Smart Contract Misinterpretation	NFT license terms unclear or non-binding.	Include human-readable legal layer (off-chain).
Cross-border Disputes	Global licensing without jurisdiction clarity.	Restrict to Japan/KR/US during PoC.
Data Evidence Invalidity	Blockchain proof rejected in court.	Maintain dual proof (on-chain + timestamped video).


⸻

7. Next Legal Actions
	1.	Prepare “ChoreRights 著作権等管理事業者申請書” draft for future submission to the Agency for Cultural Affairs.
	2.	Establish internal terms of service, privacy policy, and copyright assignment clause (弁護士監修).
	3.	Define royalty distribution logic based on transparent algorithms.
	4.	Initiate memorandum of understanding with external dance associations for pilot participation.

⸻

8. Summary

The PoC phase of ChoreRights will operate in a legally compliant sandbox.
It validates three essential hypotheses:
	1.	Blockchain-authored proofs can support choreography IP claims.
	2.	Creators and companies desire transparent licensing channels.
	3.	The model can evolve into a registered management business under the Cultural Affairs Agency.

The long-term goal is to position ChoreRights as a next-generation JASRAC for choreography, bridging law, blockchain, and the performing arts.

⸻

Prepared for:
ChoreRights Legal / IP Division
Reviewed by:
Legal Counsel (Tokyo Bar, 2025.09 Meeting)
```
