# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

MSI5006 capstone (Team 3S × Staple AI, Singapore): empirical evaluation of **C2PA**
against **MSD** (Meta Structured Data) for **document auditability**. Not a software
product — the deliverable is evidence and a recommendation for the sponsor.

The bar is therefore evidential, not just working code: **claims must be backed by
output from the real `c2patool` binary**, never by documentation or assumption. Several
early conclusions here were overturned by actually running the tool. If you cannot
demonstrate it, say so rather than asserting it.

## Layout

| Path | Role |
|---|---|
| `c2pa_demo.ipynb` | The demo. **Source of truth — edit directly in Jupyter.** |
| `c2pa_demo.md` | Export of the above; regenerate after every notebook change |
| `WEEK2_FINDINGS.md` | Full written analysis, organised as a base report + 4 addenda |
| `CONTEXT.md` | Background; includes claims already retired — do not re-derive |
| `sample/` | Test fixtures + vendor-signed evidence; the notebook depends on these |
| `demo_out/` | Regenerated on every notebook run; gitignored, safe to delete |

After editing the notebook:

```bash
jupyter nbconvert --to notebook --execute --inplace c2pa_demo.ipynb   # verify it runs
jupyter nbconvert --to markdown c2pa_demo.ipynb                       # refresh export
```

Both must be committed together — a stale `c2pa_demo.md` has caused confusion before.

## Established findings — do not re-derive

Verified with `c2patool 0.27.15`; re-test only if the tool version changes.

- **Numeric arrays in custom assertions are silently corrupted.** JSON→CBOR coercion
  turns homogeneous numeric arrays into byte strings: `[1,2,3,256]` → 256 becomes 0,
  `[-1,2,3]` drops the negative, `[1.5,2.5]` vanishes. Happens at *write* time inside
  the signed CBOR, so the file still reports `validation_state: Valid`.
  **Always `json.dumps` a payload before putting it in an assertion.**
- **Write support is media-only.** PDF, CSV, JSON, TXT, HTML, DOCX, XLSX, PPTX all fail
  with `type is unsupported`. `--sidecar` does not help. PDF is read-only.
- **Within media, coverage is broad**: JPEG, PNG, WebP, TIFF, GIF, SVG, AVIF, WAV, MP3,
  M4A, FLAC, MP4, MOV, AVI all sign and round-trip losslessly. BMP is unsupported;
  HEIC untested (no local encoder).
- **BMFF (MP4/MOV) excludes `/ftyp`, `/free`, `/skip`, `/mfra` from hashing by design.**
  A byte flip in that padding is legitimately not detected. To demo tamper detection on
  video, flip a byte inside the `mdat` box; it reports `assertion.bmffHash.mismatch`
  (not `dataHash`).
- **No practical size cap** — 150 MB embedded successfully; memory-bound (~40× payload
  in RSS), not spec-bound.
- **Adobe ships C2PA-signed PDFs in production** (`sample/adobe-pdf.pdf`, issuer
  "Adobe Inc."). The gap is in the open-source tooling, not the standard; upstream
  closed PDF write as `not_planned` (contentauth/c2pa-rs#527).
- **C2PA and MSD cannot be layered** on one file — either order breaks a signature.
  Nesting an MSD envelope inside a C2PA assertion does keep both valid.
- **C2PA is trivially strippable** — a plain image re-save removes the manifest.

## Reporting conventions

- `signingCredential.untrusted` means **"unrecognised issuer"**, never
  "verification failed". Signature validity and certificate trust are separate results;
  conflating them misreports the evidence. The three states are
  `Valid` → `Trusted` → `Invalid`.
- The dev cert in `sample/` is deliberately off the C2PA trust list, so
  `signingCredential.untrusted` appears throughout and is expected.
- Trust flags are a **subcommand**, not top-level options:
  `c2patool FILE trust --trust_anchors ... --allowed_list ... --trust_config ...`

## Gotchas

- `sample/es256_private.key` is a **publicly published C2PA test key**, committed
  deliberately so the notebook runs. Not a secret; never use it for anything real.
  Secret-scanning alerts on it are false positives.
- `c2patool` embeds an auto-generated thumbnail by default (~49 KB here), which dominates
  manifest size. Disable with `[builder]\nthumbnail.enabled = false` via `--settings`.
- `c2pa.created` actions require a `digitalSourceType`, or validation reports
  `assertion.action.malformed`.
- MSD's `embed()` on a plain dict **requires a network service** and panics without it,
  contradicting its "no network" claim. `sign()`/`verify()` work offline.
