# MSI5006 — C2PA / MSD provenance testing

Capstone testing for **Team 3S × Staple AI**: empirical evaluation of
[C2PA](https://c2pa.org) (Content Credentials) against MSD (Meta Structured Data) for
document auditability.

Tested with `c2patool 0.27.15` on Linux.

## Start here

| File | What it is |
|---|---|
| **[`in_toto_comparison.ipynb`](in_toto_comparison.ipynb)** | Runnable demo — in-toto's policy layer vs MSD and C2PA |
| **[`office_format_support_demo.ipynb`](office_format_support_demo.ipynb)** | Runnable demo — C2PA Office support after PR #499, and its DEFLATE limit |
| **[`computational_operation_demo.ipynb`](computational_operation_demo.ipynb)** | Runnable demo — computational-operation provenance, C2PA vs MSD |
| **[`aml_use_case_demo.ipynb`](aml_use_case_demo.ipynb)** | Runnable demo — Staple's real AML onboarding use case, reconstructed |
| **[`c2pa_demo.ipynb`](c2pa_demo.ipynb)** | Runnable demo — embed custom data, extract it, tamper-test, verify real vendor signatures |
| **[`provenance_graph_demo.ipynb`](provenance_graph_demo.ipynb)** | Runnable demo — MSD dependency graph vs C2PA ingredients |
| **[`w3c_vc_comparison.ipynb`](w3c_vc_comparison.ipynb)** | Runnable demo — W3C Verifiable Credentials vs MSD vs C2PA |
| [`c2pa_demo.md`](c2pa_demo.md) | Rendered export of the notebook, readable without Jupyter |
| [`WEEK2_FINDINGS.md`](WEEK2_FINDINGS.md) | Week 2 — C2PA capability tests (embedding) |
| [`WEEK3_FINDINGS.md`](WEEK3_FINDINGS.md) | Week 3 — the graph, MSD SDK audit, W3C VC comparison |
| [`WEEK4_FINDINGS.md`](WEEK4_FINDINGS.md) | Week 4 — trust list numbers, computational operations, signed PDFs |
| [`DEMO_README.md`](DEMO_README.md) | How to run the notebook |
| [`CONTEXT.md`](CONTEXT.md) | Background and established facts |
| [`TODO.md`](TODO.md) | Live progress tracker — open items, blockers, corrections |
| [`CLAUDE.md`](CLAUDE.md) | Repo conventions and established findings, for AI assistants |

## Headline findings

1. **C2PA carries custom JSON at scale** — 150 MB embedded successfully; the limit is
   memory, not the spec.
2. ⚠️ **Numeric arrays are silently corrupted.** `[1,2,3,256]` comes back with 256 turned
   into 0; `[1.5,2.5]` vanishes entirely; OCR bounding boxes are destroyed. The file
   still reports `validation_state: Valid` — the signature attests to corrupted data.
   **Serialize payloads to a JSON string first.**
3. **Write support: media, plus Office as of 0.27.22** — PR #499 merged 2026-09-04, so
   DOCX/XLSX/PPTX/EPUB/ODT now sign. ⚠️ But only *uncompressed* ZIPs: every real Office
   file uses DEFLATE and is rejected. PDF, CSV and JSON still refuse; PDF is read-only.
4. **But C2PA-in-PDF is real** — `sample/adobe-pdf.pdf` is signed by Adobe in production
   (issuer "Adobe Inc.", `cai-prod`). This is a tooling gap in the open-source library,
   not a limitation of the standard. Upstream closed PDF write as `not_planned` (#527).
5. **Vendor adoption verified locally** — the Gemini image carries a genuine Google
   signature with a full certificate chain and an RFC 3161 timestamp, verifiable offline.
6. **C2PA is trivially strippable** — a plain image re-save removes the manifest
   entirely. Its absence proves nothing.

## Running the demo

```bash
jupyter notebook c2pa_demo.ipynb     # Kernel -> Restart & Run All
```

Requires `c2patool` on `PATH` (or at `~/local_bin/c2patool`). Takes ~30 s, no network
access needed. Outputs go to `demo_out/` (gitignored, rebuilt each run).

## A note on `sample/`

These are the **public test fixtures** from the
[c2pa-rs](https://github.com/contentauth/c2pa-rs) release, kept here so the notebook
runs out of the box.

`sample/es256_private.key` is a **publicly published test key** distributed by the C2PA
project for exactly this purpose. It is not a secret, it signs nothing of value, and its
certificate is deliberately absent from the C2PA trust list — which is why the notebook
reports `signingCredential.untrusted` throughout. **Never use it for anything real.**

`sample/adobe-pdf.pdf` and the Gemini image are genuine vendor-signed artifacts, included
as verification evidence.
