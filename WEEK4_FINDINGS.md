# Technical Report — Week 4

Tested 2026-09-05 / 2026-09-07 · `c2patool 0.27.15` · `msd-sdk 0.2.8` · official C2PA
conformance data. Reproducible from `computational_operation_demo.ipynb`.

---

## Short answers

### 1. How closed is the C2PA trust list?

**Less closed than we argued, and the numbers are now exact.** Josh built the "closed
standard" differentiator on a live estimate of 20–30. The authoritative figures from
`c2pa-org/conformance-public`:

| | |
|---|---|
| Trusted CAs | **17 organisations, 30 root certificates** |
| Conforming products | **188**, from ~105 distinct applicants |
| Application fee | **none** — verbatim: *"There is no application fee for Certification Authorities, Generator Product companies, or Validator Product companies"* |
| Membership required | **no** — "global, opt-in" |
| Update cadence | continuous; the list is bot-synced on admission (5 commits in Aug 2026 alone), **not** annual |

Applicants include Mondelez, CBC/Radio-Canada, a Ukrainian broadcaster and several sole
proprietorships. Throughput is accelerating: 2 products cleared in 2025-06, **60 in
2026-07**.

⚠️ **The "closed standard" line does not survive this and should be dropped.** The
defensible version is narrower and true:

> C2PA trust is **centrally administered**. An authority decides who is admitted, every
> verifier depends on fetching a published list, and a signing certificate requires a
> security-architecture review, a commercial CA relationship and annual renewal. MSD
> signing is `generate_key_pair()`.

That is institutional onboarding versus zero-friction key generation — a real
architectural contrast that nobody can falsify in one click.

**How certification actually works** (two interlocking tracks):

1. *Conformance Program* — Expression of Interest → legal agreement → intake form →
   security architecture document and evidence → administrator review → independent
   approver → **CPL record ID (a UUID)** and public listing.
2. *Certificate Authority* — pick a CA on the trust list (DigiCert, SSL.com, Tauth Labs,
   Trufo), submit a CSR, complete vetting.

They are circular by design: the leaf certificate profile **mandates** a `c2pa-cpl-record`
extension containing your CPL UUID, plus the `c2pa-kp-claimSigning` EKU, the C2PA policy
OID and an assurance-level extension. **You cannot buy a C2PA certificate off the shelf** —
the CA cannot issue one until conformance has passed. Verified against the real OpenAI
certificate: it carries `019bc403-5cd7-7669-afe6-fdb17177d428`, exactly the record ID in
the published products list.

### 2. Can C2PA express a computational-operation assertion?

**Yes — losslessly.** This is the decisive test for Ulf's new framing, and the answer is
uncomfortable.

Signed a full operation record (`operation`, `operation_version`, `deterministic`,
`performer`, `inputs[{id, sha256}]`, `output{id, sha256, value}`, `executed_at`) into a
JPEG: round-trip byte-identical, `validation_state: Valid`.

**So "C2PA cannot express computational provenance" is false and must not be claimed.**

Three real limits, each tested:

| Test | Result |
|---|---|
| Forge the record — input hash `DEADBEEF_forged`, output `999999.99` | signs, **`Valid`** |
| `{"operation": 42, "inputs": "not-a-list", "banana": true}` | signs, **`Valid`** |
| Resolve the declared inputs from the manifest | **not possible** — opaque strings |

C2PA verifies that bytes were not altered *after* signing. It has no notion of whether the
claimed computation happened. A custom assertion label is a **namespace, not a schema**.

---

## 🔴 The finding that matters: MSD is not meaningfully ahead here

Task 3 ran the same probe against MSD, and the honest comparison is close to a tie.

| | C2PA | MSD |
|---|---|---|
| express an operation record | yes, lossless | yes, in metadata |
| record validates as signed | yes | yes |
| **forged record also validates** | **yes** | **yes** |
| schema enforcement | none | none |
| operation primitive in the SDK | none | none |
| verifier resolves inputs | no | no (caller code) |
| **hash arbitrary non-file data** | **no** (asset bytes) | **yes** (`content_hash`) |
| SDK verifies the computation | no | no |

MSD's 32-name public API contains nothing matching operation / function / compute / step /
transform / derive. `verify()` returns signature, hash, timestamp and key fields only —
no `inputs_verified`, no operation awareness, no traversal.

⚠️ **A correction to our own earlier reasoning.** The Week 4 notes proposed that C2PA's
numeric-array corruption defeats the Turing-complete objection, because bounding boxes and
coordinate vectors are silently destroyed. **Gavin identified that this is wrong**:
serialise the payload to a JSON string first and it round-trips exactly (verified). The
corruption is an **ergonomic trap, not a capability limit**, and it is not an answer to the
objection.

⚠️ **A correction to the MSD advantage.** The re-check demonstrated in
`provenance_graph_demo.ipynb` — recompute `content_hash(parent)` and compare — is performed
by **caller-written code, not the SDK**. A C2PA verifier could write identical logic. This
must not be presented as an MSD feature.

**What genuinely survives:** `content_hash()` is a structure-aware BLAKE3 Merkle hash over
arbitrary in-memory data, so an input that was never a file — an extraction result, a
reconciliation row — has stable identity. C2PA's binding is asset-bytes-oriented. **That is
one primitive, not a feature**, and in Staple's pipeline the intermediates are exactly that
shape, so it is the right primitive. Everything above it is unbuilt in both systems.

### Responding to Josh's position

> "the only differentiation in MSD is the file linking, and the ease of adding context data"

Half of that does not survive testing. **"Ease of adding context data" is not a
differentiator** — adding custom JSON to a C2PA assertion is equally easy and equally
lossless. File linking and in-document embedding remain real.

The better answer to the objection, with §3 of the notebook as its evidence:

> C2PA's custom assertion gives you a container and a PKI. It gives you no schema, no
> semantics, no verifier support and no ecosystem for computational provenance. If you must
> define the data model, the verification logic and the tooling yourself, you have written a
> new standard wrapped in JUMBF — and inherited C2PA's CA cost and media-only tooling in
> exchange for nothing.

**But that sentence is currently true of MSD as well.** It also has no schema, no verifier
support and no ecosystem. The argument is a **roadmap, not a present differentiator**, and
should be presented that way or it invites the obvious rebuttal.

---

## ⚠️ Attestation vs proof — flag before the team overclaims again

Ulf says *"verify that that is the result"*; Josh says *"prove the linking"*. Both overshoot,
and §2 of the notebook demonstrates why: the forged record validates exactly as cleanly as
the honest one.

Signing `hash(inputs) ‖ function_id ‖ hash(output)` is an **attestation** — it proves the
signer *said* the computation happened, never that it was performed or that the output is
correct. Proving the operation requires verifiable computation (ZK), a trusted execution
environment, or deterministic re-execution by the verifier.

Ulf's own examples — OCR and LLM calls — are **non-deterministic**, so re-execution cannot
work and that use case is permanently in attestation territory.

**The honest claim:** MSD can make a derivation graph *verifiably tamper-evident and
structurally explicit*. Not that it proves the computation. Two overclaims have already been
retracted ("C2PA is closed source", "C2PA can't do human edits"); this is the third queued
up.

---

## Document-format evidence gathered this week

Testing real vendor artifacts changed the picture on PDF, in both directions.

**🟢 ChatGPT signs its PDF exports, and they verify as `Trusted`.**
`sample/openai-chatgpt-signed.pdf` — `claim_generator: ChatGPT`, `softwareAgent: gpt-5-6`,
issuer `OpenAI OpCo, LLC` / `OpenAI Media Service`, chaining through
`SSL.com C2PA ICA R1 2025` to a root on the official trust list. Validates **`Trusted`**,
clean status, `timeStamp.validated`. Embedded by the PDF Associated File mechanism
(`/AFRelationship /C2PA_Manifest`).

**So C2PA-in-PDF is live in production in 2026** — not just Adobe's 2023 sample. Our
earlier "no signed PDFs in the wild" finding is **withdrawn**.

**🔴 But Office formats are signed by nobody.**

| Artifact | Result |
|---|---|
| ChatGPT `.pdf` | **signed, Trusted** |
| ChatGPT `.docx` | unsigned — generated by `python-docx`, never reaches the signing service |
| NotebookLM `.pdf` | unsigned — generated by `ReportLab` |
| NotebookLM `.m4a` | unsigned |
| C2PA's own published PDFs | unsigned |

Checked the `.docx` independently of `c2patool` (a DOCX is a ZIP): no `jumb`, no `c2pa`,
**empty ZIP archive comment** — which is where spec Appendix A.6 places the manifest — and
an unsigned embedded thumbnail. The absence is real, not a tooling artifact.

Note the asymmetry in what this proves. OpenAI's conformance record declares
`application/pdf` **only**, and that is exactly what it signs — the list is accurate.
Google's NotebookLM declares PDF, DOCX, PPTX and XLSX and signs none of them.

**Conclusion:** PDF provenance is real and deployed. **Office-format provenance is declared
but not deployed by anyone.** That gap is where Staple's use case sits, and it is now
evidenced rather than assumed.

⚠️ **Methodological note for the demo.** A byte flipped at the midpoint of the signed
ChatGPT PDF was *not* detected — `c2pa.hash.data` declares
`exclusions: [{start: 3643, length: 24280}]`, which is the manifest region itself. Flipping
a byte at offset 2000 correctly yields `Invalid` / `assertion.dataHash.mismatch`. Same class
of trap as BMFF `/free` padding: **when demonstrating tamper detection, target a byte
outside the exclusion range.**

---

## Where this leaves the position

1. **Drop "closed standard".** Replace with *centrally administered trust* — accurate,
   unfalsifiable, and still a genuine contrast with `generate_key_pair()`.
2. **Drop "ease of adding context data".** Tested and equal.
3. **Do not claim MSD supports verifiable computational operations.** Nothing in the SDK
   does. Claim the primitive (`content_hash` over non-file data) and the roadmap.
4. **Lead with the Office-format gap.** It is the one place where testing shows an empty
   field: nobody signs DOCX/XLSX/PPTX, and Staple's deliverables are exactly those formats.
5. **State attestation, not proof**, before the third retraction becomes necessary.

## Still open

- **Task 4 — KYC-shaped graph** (two documents, one operation each, then a comparison
  merging them). Deferred; the Week 4 notes suggest building it independently of Ulf's
  version so that divergence exposes underspecified semantics.
- **Task 5 — in-toto head-to-head.** Not run. Recommended for the **literature review**
  rather than as a capability test: in-toto link metadata attests "this artifact was
  produced by this step, from these materials, by this functionary" — Ulf's description
  almost verbatim — and it is CNCF-graduated with a USENIX Security 2019 paper. If MSD's
  pitch is verifiable computational provenance and in-toto is unaddressed, that is the first
  question a reviewer asks.
- `tokolosh` network dependency for dict `embed()` — ask Ulf whether it is intended
  architecture.
- Access: no internal Jenkins, sandbox tenant or sample corpus.

## Reproducing this

| Notebook | Covers |
|---|---|
| `computational_operation_demo.ipynb` | **This week** — operation assertions, forgery, schema, MSD probe |
| `aml_use_case_demo.ipynb` | Staple's real AML use case |
| `c2pa_demo.ipynb` | Embedding, extraction, tamper, trust, formats |
| `provenance_graph_demo.ipynb` | Dependency graph: MSD vs C2PA ingredients |
| `w3c_vc_comparison.ipynb` | W3C Verifiable Credentials head-to-head |
