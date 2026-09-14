# TODO

Live tracker. Update as items move; keep closed items for one report cycle, then prune.
Last updated: 2026-09-14 (Week 5).

## 🔴 Blocked on others — chase, don't build around

| Item | Owner | Since | Why it matters |
|---|---|---|---|
| Minimal interlinking + computational-operation example | **Ulf** | W4 | Task 4 and the "is our C2PA version comparable?" question both depend on it. **Ask whether it has multiple signers or one** — if single-party, Josh's single-file objection stands. |
| Strategic direction: GTM Option 1 / 2 / 3 | **Josh / Staple** | IR1 §9 | IR1 names this the top dependency; promotion materials cannot start without it. |
| Open question: **graph (a) or embedding (b)?** | Josh / Ulf | W3 | Decides the competitor set. IR1 implicitly chose (b); never confirmed. |
| What can be publicly stated re MSD governance | Staple | IR1 §9 | |
| Which technical claims are externally disclosable | Staple | IR1 §9 | |
| Access: Jenkins / sandbox tenant / sample corpus / API key | Staple | W3 | Still unconfirmed after 3 weeks. |
| Josh's single-file limiting case — is there an answer? | Josh | W4 | Undercuts the graph differentiator; the AML demo *is* this case. |
| `tokolosh` network dependency — intended architecture? | Ulf | W4 | Undercuts the offline-verification pitch. |

## 🟡 Ours — open

| Item | Priority | Notes |
|---|---|---|
| **File upstream DEFLATE issue** on `contentauth/c2pa-rs` | high | Repro ready in `office_format_support_demo.ipynb`. Cover both the write failure *and* the silent false negative on read. Raise at the next meeting first. An accepted upstream issue is a citable external artifact — addresses IR1's deliverable-risk gap. |
| **Task 4 — KYC-shaped graph** | deferred | Two docs → one op each → merging comparison. Overlaps Ulf's assignment; build after his lands so divergence is meaningful. |
| Correct IR1's stale C2PA claims in the next report | high | See "IR1 corrections" below. |
| Re-check whether a c2pa-rs release accepts DEFLATE | ongoing | Would close the Office gap entirely; re-test before the final report. |
| PDF self-implementation — feasibility spike? | idea | Mechanism known (`/AFRelationship /C2PA_Manifest`), `lopdf` already a dependency, **no upstream PR exists**. Hard part is the `c2pa.hash.data` binding across incremental updates. Would reframe Staple as contributing to the standard rather than competing. Needs sponsor buy-in before any work. |

## ✅ Done

| Item | Week | Evidence |
|---|---|---|
| Custom JSON support, size limits, format coverage | W2 | `c2pa_demo.ipynb` |
| Embed + extract demonstration | W2 | `c2pa_demo.ipynb` |
| C2PA key accessibility during verification | W3 | `WEEK3_FINDINGS.md` §1 |
| MSD graph-primitive audit | W3 | `provenance_graph_demo.ipynb` |
| W3C VC head-to-head | W3 | `w3c_vc_comparison.ipynb` |
| Staple's real AML use case reconstructed | W3 | `aml_use_case_demo.ipynb` |
| **Task 1** — C2PA trust list numbers, cost, admission | W4 | 17 orgs / 30 roots, 188 products, no fee |
| **Task 2** — C2PA computational-operation assertion | W4 | `computational_operation_demo.ipynb` |
| **Task 3** — MSD operation primitive (none exists) | W4 | same notebook |
| **Task 5** — in-toto head-to-head | W5 | `in_toto_comparison.ipynb` |
| C2PA Office support (PR #499) reversal | W5 | `office_format_support_demo.ipynb` |
| MSD `verify()` identity: self-asserted, not validated | W5 | key-possession proven, key-ownership not |

## ⚠️ IR1 corrections needed in the next report

Submitted 11 Sep; two claims went stale within days.

| IR1 says | Now |
|---|---|
| "Office was blocked by a CRC32 conflict (PR #499)" | **Merged 2026-09-04**; handlers ship in c2patool 0.27.22 |
| Table 1: "Can write PDF/Office: **No** (media-only)" | Office **yes in principle**, but DEFLATE rejected so no real file signs |
| §5.4 "monitor PR #499" as a future risk | The risk **materialised** a week before submission |
| §6 "MSD has native computational-verification capability" | No operation primitive in the SDK; both systems sign forged records identically |

§6's hedge ("not yet fully exposed at the SDK level") is accurate but is doing heavy lifting
in a table that otherwise reads as capability comparison.

## Claims to keep corrected

- MSD = **Meta** Structured Data, not "Media Signature Data".
- `c2pa-rs` is Apache-2.0/MIT under Linux Foundation JDF. Do **not** run the "C2PA is closed
  source" line. The defensible version is *centrally administered trust* — no fee, no
  membership, but an authority decides admission and verifiers fetch a published list.
- Do **not** say "C2PA can't do Office documents" — falsifiable in one command since 09-04.
  Say: the handler shipped but rejects compressed archives.
- **PDF** is the durable gap: unimplemented, closed `not_planned`, no PR behind it.
- C2PA **can** express provenance chains (ingredients) and **can** do post-hoc attachment
  (by rewrite, not by reference).
- "OpenAI/Anthropic use C2PA" — images and video, plus OpenAI's PDF exports. Not general.
- Attestation ≠ proof. Signing `hash(inputs)‖function‖hash(output)` proves the signer *said*
  it happened. Non-deterministic steps (OCR, LLM) can never be re-executed to check.
