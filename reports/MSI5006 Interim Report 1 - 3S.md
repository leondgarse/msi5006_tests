**II2610-0002**  
 **Auditing AI and Improving the Explainability of AI Decision Making**&nbsp;

&nbsp;

*Submitted by*

Moo Guo Sheng, James, \<Student ID\>&nbsp;

Wang Guowei, \<Student ID\>&nbsp;

Ding Wei, \<Student ID\>&nbsp;

&nbsp;

&nbsp;

*(Team 3S)*&nbsp;

&nbsp;

&nbsp;

*Supervised by*&nbsp;

Associate Professor Brian Lim Youliang&nbsp;

\<Department\>, School of Continuing and Lifelong Education, NUS&nbsp;

&nbsp;

&nbsp;

*Project Sponsor*&nbsp;

Staple AI Pte Ltd&nbsp;

&nbsp;

&nbsp;

*Submitted on*&nbsp;

11 September 2026&nbsp;

&nbsp;

1\.     Introduction

Staple AI is a Singapore-based AI document-processing company serving regulated enterprises, with a three-layer architecture: Document Layer (file authenticity), Data Layer (extraction, verification, reconciliation), and Trust Layer (audit-ready traceability). The core problem: AI models are transient, but their outputs persist in downstream compliance systems, making it difficult to verify where a value came from, which model produced it, and whether it was altered. Staple's solution is **MSD (Meta Structured Data)** — formerly .salt in the project definition document — which cryptographically binds audit metadata to structured outputs, implementing the Trust Layer.

The original project scope focused on developing MSD promotion materials. However, the first project meeting identified **C2PA (Coalition for Content Provenance and Authenticity)** as a significant existing provenance standard backed by Adobe, Microsoft, Google, and others. This raised a critical question: what role should MSD play in a market where a well-supported standard already exists? A second question followed: can MSD credibly be positioned as independent of Staple, or do their ties fundamentally shape its market positioning? The project was therefore refined into an evidence-based assessment of technology differentiation, competitive positioning, and commercial feasibility — a necessary foundation for credible promotion materials.

2\.     Project Formulation

The choice of a promotional-materials focus was a risk-based decision, but the team determined that credible materials required first validating strategic assumptions.

**Team roles**: Ding Wei (Team Leader) — market-strategic deliverables (framing key strategic questions, competitive positioning, GTM strategy) and project management (alignment, facilitation, stakeholder coordination, documentation, milestone oversight); James Moo — competitive analysis, literature review, report consolidation; Wang Guowei — technical validation (SDK trials, defect identification, hybrid architecture feasibility).

Sponsor participants: Dr Joshua Kettlewell (CTO), Li Zhuchao (Pre-sale technical consultant), Ulf Bissbort (MSD creator and maintainer).

3\.     Project Schedule

| Phase&nbsp; | Timeline | Key Deliverables |
| :---- | :---- | :---- |
| Onboarding & Scope Lock | Weeks 1–2 | Team formation, scoping, C2PA identified as key competitive factor |
| Core Build & Validation | Weeks 3–5 | Technical validation, MSD–Staple relationship assessment, strategic positioning |
| Engage & Iterate | Weeks 6–9 | Strategic direction confirmation, promotion material design and launch |
| Polish & Hand-over | Weeks 10–14 | Campaign analysis, final report and presentation, handover |

**Current status (end of Week 5):** Technical validation and strategic analysis complete; promotion materials in progress, pending Staple's strategic direction confirmation.

Communication: weekly Josh meetings; periodic Professor Brian reviews as needed; Saturday 10:00 a.m. internal meetings. Shared workspace (Notion \+ OneDrive) ensures one aligned position before external sharing.

4\.     Literature Review and Industry Background

Academic literature treats explainability and auditability as inseparable for AI accountability (Zhang et al., 2022; Gu et al., 2026; Zhong & Goel, 2024), and distinguishes provenance from the security guarantees (integrity, non-repudiation) a scheme must provide for audit use (Pan et al., 2023). These frameworks map directly onto Staple's distinction between an output and its audit metadata.

**C2PA** is the leading open standard for content-level provenance, under the Linux Foundation with founders including Adobe, Microsoft, BBC, Intel, and Google on its steering committee. Adoption is growing, but current production adoption is concentrated in media formats (image, video); no vendor signs PDF or Office documents with C2PA in production. C2PA is an open standard, but its trust model relies on a controlled trust list (\~30 root CAs across 17 organisations) and conformance process. Regulatory drivers include the EU AI Act, GDPR, HIPAA, and Singapore's AI Verify Foundation.

C2PA and MSD are complementary, not substitutes: C2PA is an asset/file-level "attestation engine" (what happened to a file); MSD is a data-element-level "reconciliation engine" (what computation produced each value). Neither guarantees truth alone — C2PA's failure mode is silence; MSD's is a confidently wrong score if a forgery is internally consistent.

5\.     Analysis

5.1 **Current Complementarity and Emerging Competitive Overlap**

C2PA provides asset/file-level provenance, while MSD provides data-element-level provenance and file linking. However, this complementarity may not be permanent. C2PA is expanding its support for additional file formats, which may increase future competitive overlap with MSD.

5.2 MSD's Relationship with Staple and Ulf/zef: Known and Unverified

**Publicly verifiable:**

* Ulf Bissbort, Co-founder/CTO of ZefHub, is the creator and sole maintainer of msd-sdk (PyPI) and sole contributor to the public GitHub repo (3 stars, 1 fork).  
* MSD depends on zef, a Rust library by Ulf. The newer zef (post-ZefHub) is **not publicly available**; older versions were removed from PyPI in April 2026\.  
* MSD is **not designed from scratch**: it is built on zef's graph data model. Only a Python wrapper is public; core implementation (signing, file embedding, trust chain) resides in the non-public zef binary and cannot be independently audited.  
* **Staple is the only known production user.** This creates a strong practical link between MSD and Staple's commercial deployment.  
* These public information indicates that MSD's technical maintenance and its commercial deployment are closely connected but not organisationally identical.

**Stated by Staple but not independently verifiable:**

* Staple describes MSD as initiated by Josh Kettlewell and Ulf Bissbort; respective technical contributions could not be independently established.  
* A managing committee exists, but no external members confirmed.  
* Open-sourcing is a stated direction but not a final decision; the original brief's .salt name, CLI, and pipeline are not publicly released.

5.3 Is MSD Independent of Staple?

**MSD's independence is, at this stage, more intention than established fact.** While it may be framed as independent in governance terms, its practical operation is tied to the Staple line: sole production user, single-individual maintenance, and non-public core library. Positioning MSD as an operationally independent standard is premature without further clarification. The assessment of MSD's independence was discussed with Li Zhuchao on 7 September, who acknowledged the practical challenges of separating MSD from Staple in go-to-market positioning.

5.4 Strategic Risks and Core Insight

Three risks: (1) **C2PA ecosystem expansion** — format coverage is growing (PR \#499 on Office/ZIP), and extension to data-level verification is structurally possible; "building MSD first" is not a sustainable moat. (2) **Single-vendor/single-individual dependency** — security-critical components in a non-public library create enterprise adoption barriers. (3) **Upstream format control** — PDF/Office formats are controlled by C2PA members.

**Core insight: Staple's real first-mover advantage is regulatory, not technical.** MSD lacks broad user base, operational independence, auditable core, and C2PA's market recognition. Staple's established relationships with regulated enterprises and existing compliance-oriented workflows may provide a stronger commercial entry point for MSD than competing as a standalone technology.

Staple's genuine moat is existing regulatory relationships and industry-specific acceptance in financial services, healthcare, legal, government, and cross-border trade — far harder for C2PA to replicate than technical feature parity. Regardless of technology direction, Staple should deepen regulatory cooperation and standard integration.

6\.     Technical Findings (Summary; details in Appendix A)

Table 1 summarises the resulting comparison.

| Dimension&nbsp; | C2PA&nbsp; | .salt / MSD&nbsp; |
| :---- | :---- | :---- |
| Primary object&nbsp; | Media asset (bytes)&nbsp; | Data structure / element&nbsp; |
| Granularity&nbsp; | Whole file&nbsp; | Arbitrary (field-level)&nbsp; |
| Container&nbsp; | Binary JUMBF&nbsp; | JSON-native&nbsp; |
| Content hash&nbsp; | SHA-256 hard binding&nbsp; | BLAKE3 Merkle&nbsp; |
| Identity / trust chain&nbsp; | X.509 \+ C2PA Trust List&nbsp; | Not yet implemented&nbsp; |
| Can write PDF / Office&nbsp; | No (media-only in current tooling)&nbsp; | Yes&nbsp; |
| Numeric-array fidelity&nbsp; | Corrupts large/negative/float arrays&nbsp; | Exact&nbsp; |
| Governance&nbsp; | Linux Foundation JDF, ISO&nbsp; | Staple-led; no confirmed external committee members&nbsp; |

* **C2PA custom-data defect**: In the tested custom JSON assertion workflow, numerical arrays were corrupted during JSON-to-CBOR conversion, unless serialised as JSON strings. The file could still pass verification despite the corrupted values. This raises a significant limitation for Staple's structured-data use cases.  
* **C2PA does not currently support the document workflows tested by the team**: write support is media-focused; PDF was closed as “not planned” (Issue \#527), while Office was blocked by a CRC32 conflict (PR \#499). MSD supports PDF/Office. *Implication*: within the tooling and formats tested by the team, MSD was the only tested option that successfully supported these document workflows.  
* **Hybrid MSD+C2PA is feasible**: nesting a signed MSD envelope in a C2PA custom assertion preserves both signatures (media formats only). *Implication*: a format-partitioned hybrid approach is viable.  
* **MSD has native computational-verification capability (from zef)**: zef's content-addressable functions and entity identity provide primitives for verifying computational operations (OCR, reconciliation) — not yet fully exposed at the SDK level. C2PA has no equivalent. *Implication*: verifying *what was done* (not just *what happened to a file*) is a meaningful differentiator, but tied to the non-public core.  
* **MSD trust chain not implemented; offline-signing claims inconsistent**: dictionary-embedding depends on an unavailable network service. These components reside in the non-public zef  
  7\.     Findings and GTM Recommendation

**Summary findings:** (1) C2PA and MSD are complementary at different layers, not direct competitors. (2) MSD's independence is intention, not fact — sole production user, single maintainer, non-public core. (3) MSD has near-term advantages in document formats and computational verification; C2PA has structural ecosystem advantages.

**Three GTM options:**

**Option 1 — MSD as Independent Platform**: clearest independent identity, but requires resolving governance, maintenance, and ecosystem questions; places MSD directly against C2PA. *Assessment: attractive long-term, difficult to substantiate immediately.*

**Option 2 — C2PA as the Primary Standard**: Adopt C2PA as the sole verification standard and deprecate MSD-specific development. Aligns with the dominant industry standard, but means MSD's existing investments in document-format support and computational verification are not leveraged. *Assessment: not recommended at present, as C2PA currently cannot support Staple's core PDF/Office workflows.*

**Option 3 — MSD+C2PA Hybrid (Recommended)**: C2PA for recognised provenance and interoperability, MSD for deeper structured-data/computational provenance, Staple as enterprise delivery layer. Avoids direct competition while preserving MSD's differentiated role. *Assessment: most strategically promising; allows Staple to capture value from both ecosystems.*

**Recommendation: Option 3, initially commercialised through a Staple-led model.** This approach preserves the value of MSD's existing capabilities, particularly structured-data provenance and file linking, while leveraging C2PA's stronger ecosystem and broader interoperability. It also reduces the need for MSD to compete directly with C2PA on areas where C2PA is rapidly expanding.

For near-term commercialisation, the hybrid approach could be delivered through Staple's existing enterprise relationships and regulated-industry workflows, subject to sponsor confirmation.

Supporting actions: (1) confirm strategic direction as the immediate next step, which fundamentally determines GTM design; (2) **Clarify which technical and governance claims can be externally communicated, particularly regarding document support, computational verification, file linking, and the trust model**; (3) Align the proposed positioning with Staple's existing regulatory relationships and customer workflows.

8\.     Further Work

**Week 6:** Prepare a concise decision brief for Josh/Staple to confirm strategic direction (Option 1/2/3).

**Weeks 6–9 (before Interim Report 2):** Complete first version of promotion materials and begin targeted deployment, once direction is confirmed. Document which MSD capabilities are publicly reproducible and which remain dependent on private components, so that promotion materials accurately reflect the current product and technology scope.

**Weeks 10–14 (before Final Report):** Execute marketing campaign, analyse deployment data, iterate materials. Pursue Staple's stakeholder introductions; monitor C2PA PR \#499; validate GTM positioning with regulators and enterprises.

9\.     Project Management

The team used a workstream-based approach (technical validation, competitive research, strategic analysis) with the Team Leader coordinating stakeholder communication, scope refinement, and GTM synthesis. The principal challenge was scope refinement under incomplete information: The original project scope focused on developing promotional materials, but credible materials required validating assumptions about MSD's relationship with Staple, differentiation from C2PA, and open-source claims. The team prioritised investigation by impact on the final business decision, avoiding open-ended technical research.

Project Dependencies and Required Sponsor Support

The team has advanced as far as possible with publicly available information and sponsor discussions. Finalising credible external-facing materials now depends on Staple providing clarity in the following areas:

1. **Strategic direction confirmation** — selection among the three GTM options (Independent Platform / Staple Differentiator / MSD+C2PA Hybrid), which fundamentally determines messaging, audience, and material design.  
2. **MSD–Staple relationship clarification** — what can be publicly stated about MSD's governance and its relationship with Staple.  
3. **Externally disclosable technical claims** — clarification of the scope of current open-source claims and the distinction between publicly reproducible and private-core-dependent components.

Further technical testing should proceed where it materially affects these deliverables.

Appendix A: Detailed Technical Testing Procedures and Evidence

Appenix B: Meeting and Correspondence Log

| Date&nbsp; | With&nbsp; | Purpose / Outcome&nbsp; |
| :---- | :---- | :---- |
| 13 Aug 2026&nbsp; | Professor Brian (email)&nbsp; | Kick-off email requesting an in-person briefing to align academic and company expectations after the team's first meeting with Josh.&nbsp; |
| 20 Aug 2026&nbsp; | Josh, Li Zhuchao (call)&nbsp; | Strategic alignment on provenance standards; team's AI Verify Foundation suggestion corrected by Josh (LLM-evaluation body, not document-provenance); agreed to trial transitioning to C2PA where it meets data requirements.&nbsp; |
| 20 Aug 2026&nbsp; | Josh (Staple, email)&nbsp; | Follow-up/thank-you email clarifying the team's own use of AI tools (logic-checking, grammar, and formatting only; core content independently developed) and confirming an internal weekend review meeting.&nbsp; |
| 24 Aug 2026&nbsp; | Professor Brian (email)&nbsp; | Inquiry ahead of Interim Report 1, requesting clarification on report format, scope and whether a presentation is required, and proposing a concise progress update ahead of a Zoom call.&nbsp; |
| 26 Aug 2026&nbsp; | Li Zhuchao (call)&nbsp; | Discussion of Trust Layer positioning, the MSD-vs-C2PA decision gate, and technology-agnostic go-to-market work the team can begin regardless of that decision.&nbsp; |
| 28 Aug 2026&nbsp; | Josh, Li Zhuchao, Ulf Bissbort (call)&nbsp; | Reviewed C2PA technical findings and MSD's cross-file interlinkability; decided to prioritise visual, non-technical tooling for adoption; flagged MSD-vs-C2PA positioning and MSD's core value proposition as still undecided.&nbsp; |
| 31 Aug 2026&nbsp; | SCALE / Capstone team (email)&nbsp; | Follow-up inquiry on Interim Report 1 format and presentation requirements ahead of the 11 September submission.&nbsp; |
| 7 Sep 2026&nbsp; | Li Zhuchao (call)&nbsp; | Confirmed Staple's three-layer architecture and MSD's Staple-led governance; corroborated the MSD+C2PA hybrid recommendation and identified regulatory relationships as Staple's real first-mover advantage.&nbsp; |

Appendix C: References

C2PA. (2025). Guiding principles. Coalition for Content Provenance and Authenticity. https://c2pa.org/principles/&nbsp;

C2PA. (2025). Technical specification 2.4. Coalition for Content Provenance and Authenticity. https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA\_Specification.html&nbsp;

C2PA. (n.d.). Specifications. Coalition for Content Provenance and Authenticity. https://spec.c2pa.org/specifications/&nbsp;

Gu, H., Duan, H. K., & Vasarhelyi, M. A. (2026). Challenges for leveraging explainable artificial intelligence in audit procedures. Journal of Emerging Technologies in Accounting, 23(1), 59–70. https://doi.org/10.2308/JETA-2023-044&nbsp;

Microsoft. (2025). Content Credentials in Azure OpenAI. Microsoft Learn. https://learn.microsoft.com/azure/foundry-classic/openai/concepts/content-credentials&nbsp;

Pan, B., Stakhanova, N., & Ray, S. (2023). Data provenance in security and privacy. ACM Computing Surveys, 55(14s), Article 323, 1–35. https://doi.org/10.1145/3593294&nbsp;

Staple AI Pte Ltd. (2026). Company overview&nbsp;

      https://www.staple.ai/ 

Zhang, C. A., Cho, S., & Vasarhelyi, M. (2022). Explainable artificial intelligence (XAI) in auditing. International Journal of Accounting Information Systems, 46, Article 100572\. https://doi.org/10.1016/j.accinf.2022.100572&nbsp;

Zhong, C., & Goel, S. (2024). Transparent AI in auditing through explainable AI. Current Issues in Auditing, 18(2).&nbsp;

&nbsp;

&nbsp;