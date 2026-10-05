# C2PA provenance testing — reproducible notebooks

Empirical tests of **C2PA** (Content Credentials) and adjacent provenance standards,
produced for an MSI5006 capstone project. Every claim here is backed by output from the
real `c2patool` binary or the named library — nothing is asserted from documentation alone.

Tested with `c2patool` 0.27.15 and 0.27.22 on Linux.

## Marketing site draft

**[`docs/`](docs/)** — a static site explaining the provenance model to a non-technical
reader: a landing page plus three use-case pages (accounts payable, KYC onboarding, AI agent
decisions), each built around a 30-second video. Staging surface for content that ports into
msd-protocol.org.

## Notebooks

| Notebook | Covers |
|---|---|
| **[`c2pa_demo.ipynb`](c2pa_demo.ipynb)** | Embedding custom data, extraction, tamper detection, trust states, format coverage |
| **[`office_format_support_demo.ipynb`](office_format_support_demo.ipynb)** | Office support after PR #499, and the DEFLATE limitation that blocks it in practice |
| **[`in_toto_comparison.ipynb`](in_toto_comparison.ipynb)** | in-toto's signed policy layer vs signature-only provenance |
| **[`w3c_vc_comparison.ipynb`](w3c_vc_comparison.ipynb)** | W3C Verifiable Credentials head-to-head |
| **[`aml_use_case_demo.ipynb`](aml_use_case_demo.ipynb)** | A document-auditability pipeline end to end, on synthetic data |

Each has a rendered `.md` export alongside it for reading without Jupyter.

## Selected findings

1. **Custom JSON scales** — 150 MB embedded into a single image; the limit is memory, not
   the specification.
2. **Numeric arrays are reported wrongly, not stored wrongly.** `c2patool` prints
   `[96,384]` as `"YIA="`, but decoding the raw CBOR shows the data intact. Upstream
   [PR #2611](https://github.com/contentauth/c2pa-rs/pull/2611) confirms it is a report
   formatter defect.
3. **Office support shipped on 2026-09-04** ([PR #499](https://github.com/contentauth/c2pa-rs/pull/499),
   open 26 months) — but only accepts *uncompressed* ZIPs, and every real Office file uses
   DEFLATE. A signed file also cannot survive re-zipping.
4. **PDF write remains unimplemented** —
   [#527](https://github.com/contentauth/c2pa-rs/issues/527) closed `not_planned`, no PR.
   Yet production PDFs are signed: `sample/openai-chatgpt-signed.pdf` validates as
   **Trusted** against the official trust list.
5. **The trust list is smaller and more open than assumed** — 17 organisations, 30 root
   certificates, 188 conformant products, and no application fee.
6. **Declared conformance is not deployed signing.** Products declaring Office support ship
   unsigned exports.

## Running them

```bash
jupyter nbconvert --to notebook --execute --inplace c2pa_demo.ipynb
```

Requires `c2patool` on `PATH` (or `$C2PATOOL`), plus `pip install cbor2 in-toto didkit`
for the comparison notebooks. No network access needed.

## A note on `sample/`

Test fixtures from the [c2pa-rs](https://github.com/contentauth/c2pa-rs) release, kept so
the notebooks run unmodified, plus several genuinely vendor-signed artifacts used as
verification evidence.

`sample/es256_private.key` is the **publicly published C2PA test key**, committed
deliberately. It is not a secret, it signs nothing of value, and its certificate is
deliberately absent from the C2PA trust list — which is why `signingCredential.untrusted`
appears throughout. Never use it for anything real.
