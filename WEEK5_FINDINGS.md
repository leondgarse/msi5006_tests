# Technical Report — Week 5

Covers 2026-09-05 → 09-14. No sponsor meeting last week (IR1 was due 11 Sep), so this
report carries forward the Week 4 testing and adds the upstream changes found since.

Tested on `c2patool 0.27.15` and **`0.27.22`** · `msd-sdk 0.2.8` / `zef 0.1.56` ·
`in-toto 3.1.0` · official C2PA conformance data. Reproducible from the notebooks listed at
the end.

## Summary

1. **Trust list numbers.** Real figures from the C2PA conformance explorer
   (<https://spec.c2pa.org/conformance-explorer/>): **30 root CAs across 17 organisations**,
   and **188 conformant products**.

2. **Certification is centralised but open.** No fee, no membership required; applicants
   include one-person companies. It is a real process though — security architecture review,
   a commercial CA, and annual certificate renewal.
   Guide: <https://opensource.contentauthenticity.org/docs/signing/get-cert>

3. **ChatGPT signs its PDF exports.** Tested one; it validates as **Trusted** against the
   official trust list, via a genuine SSL.com certificate chain.

4. **Declared support is not deployed support.** The same Conforming Products List shows
   Google NotebookLM claiming docx/xlsx/pptx, but those exports test unsigned — as does
   ChatGPT's own `.docx`.

5. 🔴 **C2PA Office support shipped on 09-04** (PR #499, open 26 months). DOCX/XLSX/PPTX/
   EPUB/ODT handlers now exist — **but they reject compressed archives**, so no Office file
   produced by real software can be signed *or reliably checked*. **"C2PA is media-only" is
   no longer true**, and several claims in this report and in IR1 are superseded by it.

6. **PDF is now the durable gap.** Unimplemented, closed `not_planned`, no PR behind it —
   and it is the format the AML demo actually delivers.

7. **in-toto has a policy layer that neither MSD nor C2PA has**, and it catches an attack
   both of them sign happily. On the dependency-graph axis, MSD is not competitive today.

---

## Short answers

### 1. How closed is the C2PA trust list?

**Less closed than we argued, and the numbers are now exact.** The "closed standard"
differentiator rested on a live estimate of 20–30 from the call. The authoritative figures from
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

**Yes — losslessly.** This is the decisive test for the sponsor's new framing, and the answer is
uncomfortable.

Signed a full operation record (`operation`, `operation_version`, `deterministic`,
`performer`, `inputs[{id, sha256}]`, `output{id, sha256, value}`, `executed_at`) into a
JPEG: round-trip byte-identical, `validation_state: Valid`.

**So "C2PA cannot express computational provenance" is false and must not be claimed.**

What the signature actually covers is the crux:

```
   the operation record we wrote                signed?   checked?
   ┌───────────────────────────────────────┐
   │ operation : aggregate_daily_expenses  │     ✅        ❌
   │ inputs    : [hash(A), hash(B)]        │     ✅        ❌   ← nothing resolves these
   │ output    : hash(C), value 12340.50   │     ✅        ❌
   │ performer : staple-pipeline           │     ✅        ❌
   └───────────────────────────────────────┘
                    │
                    │  hashed into the claim, then signed
                    ▼
   ┌───────────────────────────────────────┐
   │ c2pa.hash.data → THIS FILE's bytes    │     ✅        ✅   ← the only real binding
   └───────────────────────────────────────┘

   So C2PA proves: "these bytes, and this text, have not changed since signing."
   It does NOT prove: the inputs exist, the operation ran, or the output is right.
```

Three real limits, each tested:

| Test | Result |
|---|---|
| Forge the record — input hash `DEADBEEF_forged`, output `999999.99` | signs, **`Valid`** |
| `{"operation": 42, "inputs": "not-a-list", "banana": true}` | signs, **`Valid`** |
| Resolve the declared inputs from the manifest | **not possible** — opaque strings |

C2PA verifies that bytes were not altered *after* signing. It has no notion of whether the
claimed computation happened. A custom assertion label is a **namespace, not a schema**.

---

## On computational operations, the two are closer than expected

Task 3 ran the same probe against MSD. Both systems can carry the record; the difference is
narrower than the pitch assumes, and it is worth stating precisely rather than broadly.

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
coordinate vectors are silently destroyed. **That reasoning is wrong**:
serialise the payload to a JSON string first and it round-trips exactly (verified). The
corruption is an **ergonomic trap, not a capability limit**, and it is not an answer to the
objection.

⚠️ **A correction to the MSD advantage.** The re-check demonstrated in
`provenance_graph_demo.ipynb` — recompute `content_hash(parent)` and compare — is performed
by **caller-written code, not the SDK**. A C2PA verifier could write identical logic. This
must not be presented as an MSD feature.

**The one real difference, and it is in MSD's favour:** `content_hash()` is a
structure-aware BLAKE3 Merkle hash over **arbitrary in-memory data**, so an input that was
never a file — an extraction result, a reconciliation row — gets a stable identity. C2PA's
binding is asset-bytes-oriented: it hashes a file. In Staple's pipeline the intermediates are
dicts, not files, so this is the right primitive for the job and C2PA has no equivalent.

**But it is a primitive, not a feature.** Everything that would have to be built on top —
schema, verifier support, traversal — is unbuilt in both systems.

### How to put this in a meeting

If asked *"so can C2PA just do this too?"*, the defensible answer is three sentences:

> Yes, C2PA can carry the same record, and it will sign a fabricated one just as readily —
> so will MSD. Neither verifies the computation; both are attestations. The one thing C2PA
> genuinely cannot do is give an identity to data that was never a file, which is what our
> intermediates are.

That concedes the container point (which is true and easily checked), keeps the distinction
that survives testing, and avoids claiming a capability that neither side has built.

### Responding to the position raised on the call

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

The sponsor side describes this as *"verify that that is the result"* and *"prove the
linking"*. Both overshoot,
and §2 of the notebook demonstrates why: the forged record validates exactly as cleanly as
the honest one.

Signing `hash(inputs) ‖ function_id ‖ hash(output)` is an **attestation** — it proves the
signer *said* the computation happened, never that it was performed or that the output is
correct. Proving the operation requires verifiable computation (ZK), a trusted execution
environment, or deterministic re-execution by the verifier.

The examples given on the call — OCR and LLM calls — are **non-deterministic**, so re-execution cannot
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
no manifest entry, empty ZIP archive comment, and an unsigned embedded thumbnail. The
absence is real, not a tooling artifact.

⚠️ *Correction:* this section originally said Appendix A.6 places the manifest in the ZIP
**comment**. The shipped implementation instead adds a ZIP **entry**,
`META-INF/content_credential.c2pa` — confirmed in `office_format_support_demo.ipynb` §3.
The conclusion is unaffected (both were absent), but the mechanism was stated wrongly.

Note the asymmetry in what this proves. OpenAI's conformance record declares
`application/pdf` **only**, and that is exactly what it signs — the list is accurate.
Google's NotebookLM declares PDF, DOCX, PPTX and XLSX and signs none of them.

**Conclusion (as of 09-07):** PDF provenance is real and deployed. **Office-format
provenance is declared but not deployed by anyone.**

⚠️ **Partly superseded on 09-14.** The *vendor* observation still holds — no vendor signs
Office files. But the reason changed: this was written when the open-source tooling made
Office signing structurally impossible. PR #499 removed that barrier. What blocks it now is
narrower and more fixable. See the new section below.

⚠️ **Methodological note for the demo.** A byte flipped at the midpoint of the signed
ChatGPT PDF was *not* detected — `c2pa.hash.data` declares
`exclusions: [{start: 3643, length: 24280}]`, which is the manifest region itself. Flipping
a byte at offset 2000 correctly yields `Invalid` / `assertion.dataHash.mismatch`. Same class
of trap as BMFF `/free` padding: **when demonstrating tamper detection, target a byte
outside the exclusion range.**


---

## 🔴 New this week: C2PA Office support shipped — and cannot sign a real document

[PR #499](https://github.com/contentauth/c2pa-rs/pull/499) merged **2026-09-04**, 26 months
after it opened. Five c2patool releases shipped in the same window (0.27.18 → **0.27.22**).
Full evidence in `office_format_support_demo.ipynb`.

### What now works

```
min.docx  YES    min.epub  YES
min.xlsx  YES    min.odt   YES
min.pptx  YES
```

Round-trip verified — custom assertion reads back intact, `validation_state: Valid`, and
tampering is caught. The manifest is embedded as a new ZIP **entry**,
`META-INF/content_credential.c2pa`.

**This falsifies "write support is media-only"**, which appeared in every previous report
and in `CLAUDE.md`. Both are now corrected.

### ⚠️ But: only uncompressed archives are accepted

Signing the real ChatGPT `.docx` from Week 4:

```
compression method not supported: 8
```

Method 8 is **DEFLATE** — ordinary ZIP compression. Only **STORED** entries are accepted.
The fixtures above passed only because a one-entry `zipfile` write defaults to STORED.

Every real Office file is compressed:

| Source | Entries | Compression |
|---|---|---|
| ChatGPT `.docx` export | 17 | DEFLATE |
| `python-docx` | 17 | DEFLATE |
| `openpyxl` | 9 | DEFLATE |

So the accurate statement is: **C2PA Office support shipped, but cannot sign an Office
document produced by real software** — not Word, not python-docx, not openpyxl, not
ChatGPT's own export.

The repack workaround (rewrite the archive with `ZIP_STORED`, then sign) works end to end
and the result still opens in Word — but costs **36,635 → 828,294 bytes, 22.6×**. Not a
production path.

### 🔴 The read path is worse: silent false negatives

The same limit affects *verification*, and it fails misleadingly:

| File | `c2patool` says |
|---|---|
| Real ChatGPT `.docx` (DEFLATE, unsigned) | **`No claim found`** |
| Signed STORED `.docx` | full manifest ✅ |
| **Same signed file, re-zipped DEFLATE** | `compression method not supported: 8` |

Row 3 is the decisive test: a genuinely signed document, re-zipped with compression, same
manifest entry present — and the tool can no longer read it.

Row 1 is the dangerous one. A real compressed `.docx` reports **`No claim found`**, which
reads as *"this file has no Content Credentials"* when the truth is *"I cannot open this
file to look."* A genuinely signed compressed document would produce the identical message.

**For any real Office document, `c2patool 0.27.22` returns a false negative that cannot be
distinguished from a true negative.** That is a correctness bug in a verification tool — a
more serious class than a missing feature. Checking the compression method is currently the
only way to know whether the tool's answer means anything:

```bash
python3 -c "import zipfile,sys; print({i.compress_type for i in zipfile.ZipFile(sys.argv[1]).infolist()})" file.docx
```

`{8}` = DEFLATE = the verdict is meaningless.

### Still unsupported on 0.27.22

`application/pdf` (`type is unsupported` — [#527](https://github.com/contentauth/c2pa-rs/issues/527)
remains `not_planned`), CSV, JSON. The A.8 plain-text and A.9 structured-text handlers
merged 09-10/11 but are **experimental behind non-default cargo flags**, so release binaries
reject `.txt` / `.yaml` / `.md`.

Numeric-array corruption ([#2570](https://github.com/contentauth/c2pa-rs/issues/2570)) is
**unchanged** on 0.27.22: `[96,384]` → `"YIA="`. Still open, still silently `Valid`.

### What this changes

- The **structural** argument that C2PA is media-only is gone. The handler exists, and a
  DEFLATE fix is a far smaller change than the 26-month PR that just landed.
- The **practical** gap remains today, for Office (compression) and PDF (unimplemented).
- **PDF is now the only document format with no PR behind it at all** — and it is the format
  the AML demo actually delivers (`aml_use_case_demo.ipynb`).
- **No upstream issue tracks the DEFLATE limitation** (searched 2026-09-14). Filing one —
  especially the false-negative read behaviour — would be a genuine contribution to the
  standard the team is evaluating, and a concrete artifact for the final deliverable.


---

## New this week: in-toto — the policy layer neither MSD nor C2PA has

Week 4 Task 5, now done. Evidence in `in_toto_comparison.ipynb`.

**in-toto** (Torres-Arias et al., USENIX Security 2019; CNCF-graduated) attests that *"this
artifact was produced by **this step**, from **these materials**, by **this functionary**"* —
almost verbatim the 09-04 description of MSD's intended differentiator, published seven
years earlier.

Built the AML pipeline in it: receipt → extract → reconcile → report, with **a different
signer for each step** and the policy signed by a third party. Verification passes.

### The signing paths

```
            ┌──────────────┐                    ┌──────────────┐
            │  EXTRACTOR   │                    │  RECONCILER  │
            │  (Staple)    │                    │  (engine)    │
            └──────┬───────┘                    └──────┬───────┘
                   │ signs                             │ signs
                   ▼                                   ▼
  receipt.json ─► [ extract ] ─► extracted.json ─► [ reconcile ] ─► report.json
                   │                   ▲  │                │
              link.extract             │  │           link.reconcile
              materials: receipt       │  │           materials: extracted
              products : extracted ────┘  └──────────►  products : report
                                      MATCH rule
                                   (must be the same hash)
                   ▲                                   ▲
                   └───────────────┬───────────────────┘
                                   │ both constrained by
                          ┌────────┴─────────┐
                          │   root.layout    │  ◄── signed by the OWNER (the bank)
                          │  who may sign    │      a third, independent party
                          │  what may flow   │
                          └──────────────────┘
```

Three independent keys. The layout is signed by whoever owns the process, not by whoever
performs it — which is exactly what a single-vendor audit log lacks.

### The capability that is genuinely absent elsewhere

in-toto has a **layout** — a signed policy document declaring which steps must run, who may
perform each, and what each may consume and produce:

```
s2.expected_materials = [["MATCH","extracted.json","WITH","PRODUCTS","FROM","extract"],
                         ["DISALLOW","*"]]
```

*"`reconcile` may only consume what `extract` actually produced."*

**The attack test.** Substitute the intermediate between the two steps —
`total: 12340.50 → 999999.99` — then re-run and verify:

```
both steps signed successfully — the signatures themselves are valid
>>> REJECTED: 'DISALLOW *' matched the following artifacts: ['extracted.json']
```

Note *why* it fails. Every signature is cryptographically valid. What breaks is the
**policy**: the hash consumed does not match the hash produced. A signature-only system sees
nothing wrong — which is exactly what we demonstrated for MSD and C2PA earlier in this
report, where both sign a forged operation record without complaint.

### Head-to-head

| | in-toto | MSD | C2PA |
|---|---|---|---|
| derivation edge | yes (`link`) | hand-rolled | yes (ingredients) |
| multi-party signing | yes (functionary) | yes | yes |
| **detects a substituted intermediate** | **YES** (MATCH) | no | no |
| **signed policy / expected pipeline** | **YES** (layout) | none | none |
| verifier tooling | `in-toto-verify` | none | `c2patool` |
| embeds into the artifact | **no** (side files) | yes | yes (media/Office) |
| field-level granularity | no (file-level) | yes | no |
| identity model | keyid + owner sig | self-asserted | X.509 + trust list |
| standardisation | CNCF graduated | one vendor | ISO + C2PA |

### What it means

**On the graph axis (option (a) from the 08-28 scope correction), MSD is not competitive
today.** in-toto has the
policy layer, multi-party functionaries and working enforcement; MSD has **no graph or
operation primitive at all**. Competing there is an unbuilt feature against a mature standard.

**But in-toto does not take the embedding axis (option (b)).** Its links are separate files
by design — the recipient must be handed the artifact *and* its metadata and keep them
together, which is the same objection raised on the call against W3C VC. It is also file-level, so
"which inputs produced *this field*" is out of scope.

So the positioning is unchanged: MSD's distinct ground is provenance carried *inside* the
business document, which neither in-toto nor VC attempts and which C2PA still cannot do for
PDF.

**The idea worth borrowing is the layout.** A signed statement of what the pipeline *should*
be is cheap — hash-comparison policy, not new cryptography — and it is a concrete answer to
the sponsor's own *"trust me, bro"* description of the current implementation.

---

## Closed carryover: MSD's signer identity is self-asserted

Open since Week 3. Tested 09-14:

- The `signing_key` returned by `verify()` is **byte-identical to the `key` field inside the
  envelope** — read out of the signed data, not looked up anywhere.
- Swapping in a different key yields `signature_is_valid: False`, so an envelope cannot
  simply be relabelled.

So the guarantee is *"signed by whoever holds the private key declared inside."* What is
absent is any binding from that key to a real-world identity — no CA, no directory, no
attestation. Combined with `signature_is_trusted` being hardcoded `False`, an MSD verifier
confirms internal consistency and nothing about **who** signed.

**The precise formulation: MSD proves key-possession; it does not prove key-ownership.**
That is a sharper statement of the identity gap than "trust is unimplemented", and it is one
primitive — a DID or a CA binding — away from being closed.

---

## Where this leaves the position

1. **Drop "closed standard".** Replace with *centrally administered trust* — accurate,
   unfalsifiable, and still a genuine contrast with `generate_key_pair()`.
2. **Drop "ease of adding context data".** Tested and equal.
3. **Do not claim MSD supports verifiable computational operations.** Nothing in the SDK
   does. Claim the primitive (`content_hash` over non-file data) and the roadmap.
4. **Lead with PDF, not Office.** Office was the empty field until 09-04; the handler has
   now shipped and only a compression limit stands in the way. **PDF is the durable gap** —
   unimplemented, closed `not_planned`, no PR — and it is what the AML demo delivers. Do
   **not** say "C2PA can't do Office documents": it is falsifiable in one command, and the
   team has already retracted two claims of that kind.
5. **State attestation, not proof**, before the third retraction becomes necessary.
6. **Borrow in-toto's layout concept.** A signed statement of the expected pipeline turns
   "Staple says this happened" into "this matches the process the bank approved". It is
   hash-comparison policy, not new cryptography, and it is the one capability testing found
   that neither MSD nor C2PA has.

## Still open

- **Task 4 — KYC-shaped graph** (two documents, one operation each, then a comparison
  merging them). Deferred; the Week 4 notes suggest building it independently of the
  sponsor's version so that divergence exposes underspecified semantics.
- ~~Task 5 — in-toto head-to-head~~ **done**, see above and `in_toto_comparison.ipynb`.
- **File an upstream issue for the DEFLATE limitation**, covering both the write failure
  and the silent false negative on read. Nothing tracks it today.
- `tokolosh` network dependency for dict `embed()` — confirm with the maintainer whether it
  is intended architecture.
- Whether a future c2pa-rs release accepts DEFLATE — this would close the Office gap
  entirely and should be re-checked before the final report.
- Access: no internal Jenkins, sandbox tenant or sample corpus.

## Reproducing this

| Notebook | Covers |
|---|---|
| `office_format_support_demo.ipynb` | **New** — Office support after PR #499, and the DEFLATE limit |
| `in_toto_comparison.ipynb` | **New** — in-toto's policy layer vs MSD and C2PA |
| `computational_operation_demo.ipynb` | Operation assertions, forgery, schema, MSD probe |
| `aml_use_case_demo.ipynb` | Staple's real AML use case |
| `c2pa_demo.ipynb` | Embedding, extraction, tamper, trust, formats |
| `provenance_graph_demo.ipynb` | Dependency graph: MSD vs C2PA ingredients |
| `w3c_vc_comparison.ipynb` | W3C Verifiable Credentials head-to-head |
