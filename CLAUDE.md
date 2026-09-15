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
| **`TODO.md`** | **Live progress tracker — read first, update as part of any task** |
| `reports/` | Submitted academic deliverables (IR1, IR2, final) |

After editing the notebook:

```bash
jupyter nbconvert --to notebook --execute --inplace c2pa_demo.ipynb   # verify it runs
jupyter nbconvert --to markdown c2pa_demo.ipynb                       # refresh export
```

Both must be committed together — a stale `c2pa_demo.md` has caused confusion before.

## Tracking progress

**`TODO.md` is the live tracker. Read it at the start of a session and update it as part of
finishing work** — it is not a separate chore.

- Moving an item to **Done** requires naming the evidence (a notebook, a report section).
  "Done" without an artifact does not count in this project.
- Items **blocked on other people** stay in their own table with an owner and a date. Do not
  silently build around a blocker; surface how long it has been waiting.
- When a finding overturns something already submitted or reported, add it to
  **IR1 corrections** (or the equivalent) rather than quietly editing the old claim — the
  correction history is itself evidence of method.
- **Claims to keep corrected** is the list of things the team has already had to retract.
  Check any outgoing statement against it before sending.

One weekly findings report per cycle (`WEEKn_FINDINGS.md`), carried forward when there is no
sponsor meeting. Each notebook is the reproducible evidence behind a report section.

`weekly_report_chinese.md` is a detailed Chinese walkthrough of the current week's report.
**Overwrite it each week** — it tracks the latest `WEEKn_FINDINGS.md` only, and is not
versioned per week. It is **internal**, so academic context belongs there.

### Audience — who sees what

| Document | Audience |
|---|---|
| `WEEKn_FINDINGS.md` | **Sponsor-shareable.** Write it that way by default. |
| `weekly_report_chinese.md`, `TODO.md` | Internal to the team |
| `reports/` (IR1, IR2, final) | **Academic only — never shared with the sponsor.** Only the final presentation is. |

So `WEEKn_FINDINGS.md` must not contain:
- references to IR1/IR2, the rubric, grading, or submission deadlines — the sponsor cannot
  see those documents, so citing them is both meaningless and slightly odd
- personal names (see below)
- anything framing the work as coursework rather than findings

Academic framing and correction-tracking live in `reports/`, `TODO.md` and the Chinese
walkthrough instead.

**No personal names in `WEEKn_FINDINGS.md`.** Attributing a position to an individual invites
defensiveness where the point is the evidence. "The position raised on the call" carries the
same meaning. Names are fine in internal documents.

## Established findings — do not re-derive

Verified with `c2patool 0.27.15`; array corruption re-confirmed on **0.27.17**
(2026-09-04) and reported upstream as contentauth/c2pa-rs#2570 (open, no response).

- **Numeric arrays in custom assertions are silently corrupted.** JSON→CBOR coercion
  turns homogeneous numeric arrays into byte strings: `[1,2,3,256]` → 256 becomes 0,
  `[-1,2,3]` drops the negative, `[1.5,2.5]` vanishes. Happens at *write* time inside
  the signed CBOR, so the file still reports `validation_state: Valid`.
  **Always `json.dumps` a payload before putting it in an assertion.**
- **Write support was media-only through 0.27.17.** ⚠️ **Changed 2026-09-04**: PR #499
  merged and `c2patool 0.27.22` signs DOCX/XLSX/PPTX/EPUB/ODT. **But only STORED
  (uncompressed) ZIPs** — any DEFLATE entry fails `compression method not supported: 8`,
  and every real Office file (Word, python-docx, openpyxl, ChatGPT export) uses DEFLATE.
  Repacking uncompressed works but costs ~23x size. See `office_format_support_demo.ipynb`.
  PDF, CSV, JSON and TXT still fail with `type is unsupported`; PDF remains read-only.
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
