# TODO

Live tracker. Update as items move; keep closed items for one report cycle, then prune.
Last updated: 2026-10-01 (post 09-17 meeting).

## 🔴 Direction changed — read this first

The 09-17 meeting ended the technical-validation phase. Agreed decisions:

- **"Shifting full focus to material creation"** — all three members spend the remaining
  weeks on promotional materials and storytelling, **not** further technical validation.
  Rationale (Josh): more technical depth increases knowledge but produces no tangible
  outcome in the time available.
- **Core narrative**: an auditor drops files from various sources into a tool, which
  automatically draws the provenance graph and **highlights what is missing or broken**.
- **Hybrid framing**: compare MSD and C2PA, and present them as combinable rather than
  rival. Ulf endorsed the C2PA + VC + in-toto comparison as "a useful perspective" and
  agreed MSD can be positioned as a combination of the three.
- **MSD is promoted as an independent open-source tool**, not as a Staple feature — Staple
  use cases are examples, not the pitch.
- **Short-form, high-level**: "30-second attention span", problem → solution. Technical
  docs stay available for developers but are not the campaign.

Deadline: the remaining four weeks from 09-17.

## 🟡 Ours — marketing deliverables

| Item | Owner | Notes |
|---|---|---|
| **Marketing content comparing MSD and C2PA, highlighting hybrid applicability** | Lamphare + Gavin | The C2PA+VC+in-toto synthesis table is the strongest source material; Ulf already approved the angle. Avoid feature-checklist framing — Ulf: *"focus on the needs of the initial users... problem driven, not checking features, which are a bit arbitrary"*. |
| **Short-form promo** (one-pagers, videos) | Lamphare + Gavin | High-level benefits only. Problem → how MSD solves it. |
| **Send the internal project report to Josh and Ulf** | Lamphare + Gavin | Requested so they can give end-of-internship feedback. |
| Publish tests + selected reports to the public repo | Gavin | `git@github.com:leondgarse/msi5006_tests.git`. The old link 404'd when cited as evidence. |
| Keep internal files in the private repo | Gavin | `git@github.com:leondgarse/msi5006_tests_private.git` |

## 🔵 Blocked on others — inputs we need for the materials

| Item | Owner | Why it matters to us |
|---|---|---|
| **Auditor demo** — visual provenance graph from dropped files | Ulf | This *is* the narrative. The promo material illustrates it, so it shapes what we can show. |
| **MSD + C2PA integration strategy** write-up | Ulf | Explicitly "to assist in drafting marketing materials". The hybrid claim needs his technical framing to be accurate. |
| **UI prototype** | Josh + Ulf | Decided they would build it rather than use intern time. Source of screenshots/footage. |

## 📋 Constraints confirmed by the sponsor (IR2 Q&A)

Binding on every material we produce:

- **Synthetic data only; never name real customers.** No customer names may be given out.
- **Anything using Staple's name or case needs Staple review** — turnaround 1–2 days.
- **No C2PA partnership may be implied.** There is no agreement; only *"a plan for limited
  hybrid applicability"*. C2PA is a *"foot in the door"* into the file-tracking-in-the-AI-era
  conversation — nothing more.
- **Reading C2PA-signed content is an idea, not a commitment** — do not present it as
  roadmap.
- **Lead with the problem and how MSD solves it.** Josh: roadmap is not the first thing;
  *"the most basic thing is to lead with the clear problem"*.
- **No logo or branding exists** — use plain-text "MSD"; Josh considers this unimportant.
- **MSD is already public**, so materials need not wait for a release gate.
- **Technical accuracy is checked by Josh and Ulf**, not us — accuracy, not approval.
- Success metric: reach plus quality of feedback. Engagement tracked informally.
- The UI prototype is helpful but **not a prerequisite** for starting promotional work.

## ⚠️ Open question to resolve before publishing the hybrid claim

Josh, on IR1: *"although they can both be used for some of the same things, you can not use
both. You can only apply one or the other... there is no way to enforce C2PA to work with
MSD."*

This is **partly** in tension with our tested result. Both can be true, and the distinction
matters for any hybrid marketing claim:

- **Layering two containers on one file** — breaks a signature in either order. Josh is
  right, and we tested this.
- **Nesting the MSD envelope as the payload of a C2PA assertion** — both signatures stayed
  valid in our test (and the same worked for an in-toto link).

Needs re-verification on current versions before it goes in any material, then a short reply
to Josh drawing the container-vs-payload distinction. Do not publish a hybrid claim that
rests on an unverified mechanism.

## ✅ Done — technical validation phase

Retained as source material for the marketing deliverables.

| Item | Evidence |
|---|---|
| Custom JSON support, size limits, format coverage | `c2pa_demo.ipynb` |
| Embed + extract demonstration | `c2pa_demo.ipynb` |
| C2PA key accessibility during verification | `WEEK3_FINDINGS.md` §1 |
| MSD graph-primitive audit + 3-node DAG | `provenance_graph_demo.ipynb` |
| W3C VC head-to-head | `w3c_vc_comparison.ipynb` |
| Staple's AML use case reconstructed | `aml_use_case_demo.ipynb` |
| C2PA trust list: 17 orgs / 30 roots, 188 products, no fee | `WEEK5_FINDINGS.md` |
| Computational-operation assertion, C2PA vs MSD | `computational_operation_demo.ipynb` |
| in-toto head-to-head (layout + MATCH rule) | `in_toto_comparison.ipynb` |
| C2PA Office support (PR #499) and its DEFLATE limit | `office_format_support_demo.ipynb` |
| MSD `verify()` identity is self-asserted | `WEEK5_FINDINGS.md` |
| Numeric arrays: reporting defect, not data corruption | `c2pa_demo.ipynb` §5c |

## 📌 Deferred — no longer on the critical path

Dropped by the focus shift, not by being answered. Revisit only if a material needs them.

- Task 4 — KYC-shaped graph (two docs, one op each, then a merging comparison)
- Filing the upstream DEFLATE issue on `contentauth/c2pa-rs`
- Re-checking whether a later c2pa-rs release accepts DEFLATE
- PDF self-implementation feasibility spike
- Whether `FunctionApplication` is reachable from `msd_sdk`, or zef-only
- Whether the showcase's reproducibility check is implemented or illustrative
- Whether tokolosh's `disabled` state makes the network dependency optional

## Claims to keep corrected

- MSD = **Meta** Structured Data, not "Media Signature Data".
- `c2pa-rs` is Apache-2.0/MIT under Linux Foundation JDF. Do **not** run the "C2PA is closed
  source" line. The defensible version is *centrally administered trust* — no fee, no
  membership, but an authority decides admission and verifiers fetch a published list.
- Do **not** say "C2PA can't do Office documents" — falsifiable in one command since 09-04.
  The handler shipped; it rejects compressed archives.
- **PDF** is the durable gap: unimplemented, closed `not_planned`, no PR behind it.
- C2PA **can** express provenance chains (ingredients) and **can** do post-hoc attachment
  (by rewrite, not by reference).
- Numeric arrays are **not** corrupted — `c2patool`'s JSON *report* mangles them. Upstream
  PR #2611 confirms. A CLI display defect.
- "OpenAI/Anthropic use C2PA" — images and video, plus OpenAI's PDF exports. Not general.
- Attestation ≠ proof. Signing `hash(inputs)‖function‖hash(output)` proves the signer *said*
  it happened. Non-deterministic steps (OCR, LLM) can never be re-executed to check.
- Several SDK-level findings are **not** platform-level: zef has type/schema machinery and
  `FunctionApplication` that `msd_sdk` does not surface. Scope claims to "the SDK" unless
  verified against zef.
