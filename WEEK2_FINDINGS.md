# C2PA Capability Test Results — Week 2
Tested 2026-08-22 · `c2patool 0.27.15` · sample assets from c2pa-rs release

Answers the two `[leon.D. Garse]` action items from Week 2 08.20.

## Tooling check

`c2patool 0.27.15` is the **latest release** (published 2026-08-13). Binary at
`~/local_bin/c2patool`, identical to `c2patool/c2patool` in the repo. No upgrade needed.

Note the CLI surface moved: trust flags are now under a `trust` **subcommand**, not
top-level flags:

```
c2patool FILE trust --trust_anchors A.pem --allowed_list B.pem --trust_config C.cfg
```

## Task 1 — Custom JSON support, size limit, file types

### Custom JSON: yes, and there is no practical size cap

Arbitrary labels work (`com.staple.ocr-log`). Payload embedded into a 60 KB JPEG:

| Payload | Sign time | Peak RSS | Output size | Result |
|---|---|---|---|---|
| 1 MB | 0.5 s | 67 MB | 940 KB | OK |
| 5 MB | 1.7 s | 248 MB | 4.0 MB | OK |
| 20 MB | 5.8 s | 928 MB | 15 MB | OK |
| 50 MB | 13.7 s | 2.3 GB | 38 MB | OK |
| 150 MB | 42.3 s | 6.6 GB | 114 MB | OK, `validation_state: Valid` |

No hard limit was reached. The binding constraint is **memory** — peak RSS runs roughly
40x the payload size, so a 150 MB log needs ~6.6 GB. That is the real ceiling, not the spec.

### 🔴 But: C2PA silently corrupts numeric arrays

The most important finding. Custom assertion data is converted JSON → CBOR at sign time,
and homogeneous numeric arrays get coerced into byte strings. Values that do not fit in
one byte are **destroyed with no error**:

| Input | Read back | Outcome |
|---|---|---|
| `[1,2,3,255]` | `"AQID/w=="` | survives, but returns as base64 string, not an array |
| `[1,2,3,256]` | `"AQIDAA=="` | **256 became 0** |
| `[-1,2,3]` | `"AgM="` | **negative value dropped** |
| `[1.5,2.5]` | `""` | **whole array lost** |
| `{"bbox":[420,164,35,24]}` | `"tqQjGA=="` | **coordinates destroyed** |

Scalars, strings, unicode, bools, null, big ints, mixed arrays (`[1,"a",2]`) and empty
arrays all survive intact.

This happens at **write** time, inside the signed CBOR (confirmed via `c2patool -d`). The
claim hash therefore covers the already-corrupted bytes, so the file verifies as
**`Valid`**. The signature faithfully attests to corrupted data.

This hits our exact use case: OCR bounding boxes are `[420,164,35,24]` — four numbers,
routinely over 255.

**Workaround, verified lossless:** serialize the payload to a JSON *string* and embed
that single string. Round-tripped a `bbox` array through this path with exact equality.
Costs us queryability of the assertion structure, but preserves the data.

### File types: media only

Signing was attempted on each format:

| Format | Sign | Error |
|---|---|---|
| JPEG | ✅ | — |
| PDF | ❌ | `unable to encode assertion data` |
| CSV / JSON / TXT / HTML | ❌ | `type is unsupported` |
| DOCX / XLSX / PPTX | ❌ | `type is unsupported` |

`--sidecar` does **not** rescue this — it fails identically for every non-media format.
There is no route to attach C2PA to a PDF or Office file with this tool today.

PDF is genuinely **read-only**, confirmed: a valid PDF reads (returns `No claim found` —
parsed fine, just unsigned) but signing gives `type is unsupported`. Contrast CSV, which
fails at read too. So PDF has a real read path; the others are unknown types entirely.

## Task 2 — Demonstrate write + extract

Full round trip on JPEG with a custom `com.staple.ocr-log` assertion of 412,511 rows
(50 MB): signed, read back, all rows recovered with correct count and ordering. Content
matched except for the numeric-array issue above.

**Tamper test:** signed a JPEG, flipped one byte in the image data, re-read:

```
assertion.dataHash.mismatch — asset hash error, name: jumbf manifest
```

Detection works.

**Trust flags:** on `sample/C.jpg`, reading without a trust list gives
`signingCredential.untrusted`. Loading anchors + allowed list + EKU config clears it
completely. This confirms the two results are independent — signature and binding were
valid all along; only the issuer was unrecognised. That is not "verification failed."

## What this means for the decision

1. **Size is not the blocker.** C2PA carries our OCR and reconciliation logs comfortably.
2. **File type is the blocker.** We process PDFs and Office documents. C2PA cannot write
   to any of them today. Since the Week 2 objective is *document* auditability, this is
   the gating constraint on adopting C2PA wholesale.
3. **Data fidelity needs a defensive wrapper.** Even on supported media, we cannot hand
   raw structured data to a custom assertion. String-wrapping is mandatory, not optional.

The spec (2.4, Appendices A.4–A.9) does define PDF, Office and structured-text embedding.
The gap is implementation, not architecture — so this may resolve upstream. Worth asking
the sponsor how much we want to bet on that timeline.

## Open, not yet done

- Spec 2.4 Appendix A.9 (structured text embedding) — still unread.
- Whether `c2pa-python` shares the CBOR array bug (likely, same core), and whether it
  exposes a raw-CBOR path that avoids it.
- Whether the array coercion is a known upstream issue or worth filing.

---

# Addendum — Is this the industry tool? And is the format gap closing?

## Q1: Yes, this is the same implementation the major labs use

`c2pa-rs` is the CAI reference implementation — "the fundamental system underlying
everything else." `c2patool`, `c2pa-python`, `c2pa-js`, the C++ and iOS/Android SDKs are
all wrappers over this same Rust core. What we tested is the industry's engine, not a
side project. Adobe maintains it (`scouten-adobe` is a maintainer).

| Vendor | C2PA status | What they sign |
|---|---|---|
| **Adobe** | CAI founder, maintains c2pa-rs | images |
| **OpenAI** | steering committee (May 2024) | DALL-E 3 images, Sora video |
| **Microsoft** | CAI member; Azure OpenAI | all generated images (DALL-E, GPT-image-1) |
| **Anthropic** | since ~2026-08-10 | generated **SVG / PNG / JPG** only |

Azure's manifest carries `description: "AI Generated Image"`,
`softwareAgent: "Azure OpenAI DALL-E"`, and `when`.

**The pattern is the point: every one of these deployments is images and video only.**
Not one of them signs a PDF or an Office document — because the implementation cannot.

Most telling: Anthropic ships C2PA for generated *images*, but needed a **separate,
non-C2PA invisible watermark** for generated *text*. A C2PA-adopting AI lab reached for a
different mechanism the moment the content stopped being a media file. That is independent
corroboration of our Task 1 result.

So "OpenAI and Microsoft use it" is a strong signal for **image** provenance and says
nothing about document auditability — which is our actual objective.

## Q2: Upstream format work — checked contentauth/c2pa-rs directly

### 🔴 PDF write is officially abandoned

Issue **#527 "PDF write support"** (opened 2024-07-25) was closed **`not_planned`** on
2025-12-18 by an Adobe maintainer:

> "No activity on this ticket for a long time and no current plans for us to implement:
> closing."

Issue #750 "PDF signing capability" is likewise closed. There is **no open PR for PDF
write**. Only PDF *read* was ever built (2023). Every recent PDF-related commit is a
`lopdf` dependency bump, not a feature.

Earlier upstream had said (2024) PDF support was "still planned" — that position was
reversed. We should not plan around upstream delivering PDF signing.

### 🟡 Office/ZIP — one PR, open 2 years, blocked on a genuine spec contradiction

**PR #499** "Add ZIP support (+ EPUB, Office Open XML, Open Document, OpenXPS)" — opened
2024-07-08, still open (last touched 2026-08-13). Tracking issue #406 open since Feb 2024.

The blocker is not review backlog, it is a real conflict. The contributor found:

> "The C2PA spec states the CRC32 should be set to 0, yet the ZIP spec states: Data
> integrity MUST be provided for each file using CRC32. There's a chicken or the egg
> problem — we can't compute the CRC32 unless the manifest is computed, but we can't
> compute the hard binding hashes until the CRC32 is set. **The spec may need to be
> modified here.**"

Adobe filed internal ticket CAI-12644 (2026-06-18). Resolution may require changing the
C2PA specification itself. No ETA. Treat docx/xlsx support as speculative.

### 🟢 Text formats — the only lane with real momentum

Five competing open PRs, all experimental and feature-gated, none merged:

| PR | Appendix | Approach |
|---|---|---|
| #2117 / #2494 | A.8 plain text | invisible Unicode variation selectors |
| #2188 | A.7 HTML | base64 in `<script type="application/c2pa">` |
| #2190 / #2283 | A.9 structured text | armoured `-----BEGIN C2PA MANIFEST-----` block |

**Note #2117/#2494 use invisible Unicode variation-selector steganography — precisely
the technique MSD uses for its `__msd` embedding.** C2PA is actively building MSD's
mechanism, in MSD's territory. This partly answers CONTEXT.md's open item on Appendix A.9:
it is being implemented right now, but is unmerged, experimental, and behind a
non-default flag.

## Revised bottom line for the sponsor

The Week 2 plan was "transition to C2PA if it supports our data requirements." Sharpened:

1. **Custom JSON at scale: C2PA is fine** (150 MB verified) — but needs string-wrapping
   to avoid the silent array corruption.
2. **PDF: do not wait for upstream.** Officially `not_planned`. If PDFs must carry
   embedded provenance, C2PA will not do it — this is a decision input, not a timing one.
3. **Office: possible but unpredictable**, gated on a possible spec revision.
4. **Structured text: genuinely coming**, and it converges on MSD's approach.

The realistic architecture is therefore a **hybrid**: C2PA where it is strong and
industry-backed (images, and the standards story for the sponsor), MSD or a sidecar
scheme for PDFs and Office documents, which is most of Staple's actual input. That is a
more defensible recommendation than either "transition to C2PA" or "keep MSD."

The strategic caveat worth raising Thursday: the text-handler PRs show C2PA moving
directly into MSD's niche. MSD's lead there is measured in implementation time, not
architecture — consistent with what we already concluded.

---

# Addendum 2 — Vendor evidence, PDF feasibility, MSD comparison

## Q1: I downloaded them myself — and one result overturns an earlier conclusion

No need for you to fetch anything. From the official C2PA conformance repo
(`c2pa-org/public-testfiles`) I pulled and verified real signed assets locally.

### 🔴 Correction: Adobe *does* ship C2PA-signed PDFs in production

I previously reported that nobody signs PDFs with C2PA. That was wrong, and the
correction strengthens our position rather than weakening it.

`sample/adobe-pdf.pdf` reads cleanly with our own `c2patool`:

```
claim_generator: Adobe_Express/1.0.0 adobe_c2pa/0.7.11 c2pa-rs/0.28.1
signature_info:  issuer "Adobe Inc.", common_name "cai-prod"
format:          application/pdf
```

`cai-prod` is a genuine Adobe production certificate — not the test cert on our
sample images. Adobe Express was signing PDFs in 2023.

**The real situation is therefore sharper than "C2PA can't do PDFs":** the *format*
supports it and Adobe *ships* it, but the **open-source c2pa-rs never exposed PDF write**.
Adobe used internal tooling (`adobe_c2pa/0.7.11`) alongside the public library. The
capability exists; it just isn't in the box we're given.

Confirmed against our tool: it **reads** Adobe's signed PDF perfectly but still refuses
to write one (`type is unsupported`). Read and write are genuinely asymmetric.

## Q2: Yes — implementing PDF ourselves is feasible

Because Adobe's PDF is readable, I could inspect exactly how the manifest is attached.
It is **not** a proprietary container — it is a standard PDF Associated File:

```
4 0 obj <</AFRelationship /C2PA_Manifest
          /EF <</F 1 0 R>> /F(Acro00000001)
          /Type/Filespec /UF(Acro00000001)>>
8 0 obj <</AF[4 0 R] /Metadata 5 0 R ... /Type/Catalog>>
1 0 obj <</DL 35046 /Length 35046 /Params<</CheckSum<...>/Size 35046>>>>stream
          \x00\x00\x88\xe6 jumb \x00\x00\x00\x1e jumd c2pa ...
```

Raw JUMBF bytes in a PDF stream, referenced by a `/Filespec` with `/AFRelationship
/C2PA_Manifest`, registered in the catalog `/AF` array and `/Names/EmbeddedFiles`.
All ordinary PDF 2.0 constructs.

**Feasibility verdict: yes, with a clear caveat about where the difficulty lies.**

- *Easy:* the container work. `lopdf` is already a c2pa-rs dependency (used for PDF
  read) and can write all of these objects. Attaching the JUMBF is a few hundred lines.
- *Hard:* the **hard binding**. `c2pa.hash.data` must define byte exclusion ranges that
  remain valid as the PDF changes — incremental updates, linearization, and xref
  rewrites all shift offsets. Getting this wrong yields manifests that validate on our
  machine and fail everywhere else.
- *Political:* a custom implementation is non-conformant unless it matches the spec
  exactly. We would not be able to claim "C2PA compliant" without conformance testing,
  and there is no upstream PR to contribute it back into (#527 is closed `not_planned`).

Realistic scope: a working prototype in days; a spec-conformant, interoperable
implementation is a serious multi-week effort whose main risk is the binding, not
the embedding. Worth doing as a **demo** to prove the concept to the sponsor; not
worth adopting as production infrastructure we alone maintain.

## Q3: MSD comparison — tested hands-on at `~/workspace/msd-sdk-python`

Installed version was stale (0.2.3 / zef 0.1.32); upgraded to repo-pinned
**0.2.8 / zef 0.1.56** and re-ran everything.

### Where MSD clearly wins

| Test | C2PA (c2patool) | MSD 0.2.8 |
|---|---|---|
| `[420,164,35,24]` bbox | **corrupted** → `"tqQjGA=="` | **exact** |
| `[1.5,2.5]` | **lost** → `""` | **exact** |
| `[1,2,3,256]` | **256→0** silently | **exact** |
| Sign a PDF | ❌ `type is unsupported` | ✅ +696 bytes on a 626 KB PDF |
| Sign speed (dict) | n/a | 5 ms |
| Signed envelope | binary JUMBF in a file | plain JSON, 665 bytes |

I signed **the same Adobe PDF** with MSD: output remained a valid `%PDF-`, and the
metadata was recoverable from the file on disk with `signature_is_valid: True`.
That is a capability C2PA's open tooling simply does not have.

Data fidelity is MSD's strongest, most defensible advantage — and it is the one thing
our own OCR pipeline would break on with C2PA today.

### Where MSD is weak — and one finding worth raising

- **No trust chain at all.** `generate_key_pair()` raises
  `NotImplementedError: Platform endorsement is not yet implemented`; you must pass
  `unendorsed=True`. Every verify returns `signature_is_trusted: False`,
  `is_verified_and_trusted: '❌'`. Confirms the CONTEXT.md expectation.
- 🔴 **`embed()` on a plain dict does not work offline.** The Unicode-steganography path —
  MSD's headline differentiator — panics in Rust:

  ```
  Entity type 'ZstdCompressed' not found in local cache or tokolosh:
  Error.NotConnected(description='No tokolosh found on ports 27021–27040')
  ```

  zef tries to contact a **network service** to resolve a type, and hard-panics when it
  is absent. Reproduced on both 0.2.3/0.1.32 and 0.2.8/0.1.56, so it is not version drift.
  **This directly contradicts our "zero signing cost, no network" claim.** `sign()` and
  `verify()` are fine offline; only dict-`embed()` fails. The claim needs narrowing before
  Thursday — file embedding worked, dict embedding did not.
- **Maturity:** "Development Status :: 3 - Alpha", 1,710 lines of Python.
- **Dependency risk:** all real work is delegated to `zef==0.1.56`, a pinned
  closed-source binary from the same vendor. Failures surface as Rust panics, not Python
  exceptions. Adopting MSD means betting on one vendor's unreleased binary.

### Interop: the two cannot simply be layered

Signing Adobe's already-C2PA-signed PDF with MSD **breaks the C2PA hard binding** —
`c2patool` then reports `assertion.dataHash.mismatch`. Any hybrid design must order the
operations deliberately and agree exclusion ranges; "just apply both" corrupts the C2PA
side.

## Recommendation

**Adopt C2PA as the standard; keep MSD as the document-format stopgap; do not build our
own PDF implementation yet.**

1. **Use C2PA where it is strong** — images, and the standards/credibility story. It has
   the trust chain, X.509, timestamping, ingredients, and industry backing MSD lacks.
2. **Always string-wrap structured payloads into C2PA assertions.** Non-negotiable given
   the silent array corruption.
3. **Keep MSD for PDFs and Office documents short-term**, with two caveats now proven:
   no trust chain, and dict-`embed()` needs network. Use the file path, not the dict path.
4. **Do not start a custom PDF implementation this term.** It is feasible and we now know
   exactly how, which is itself a strong sponsor answer — but the binding is the risky
   part and we would own it alone with no upstream to merge into. Build a *prototype* to
   demonstrate the mechanism if the sponsor wants proof.

The strongest line for Thursday: *C2PA-in-PDF is a solved problem that Adobe ships in
production — the open-source tooling just doesn't expose it. So this is a tooling gap,
not a standards gap, and the strategic question is whether we wait, build it, or bridge
with MSD.* That reframes the decision from "which standard" to "how do we cover the
tooling gap", which is a much better position to be in.

Artifacts: `sample/adobe-pdf.pdf` (Adobe production-signed), `sample/adobe-CAI.jpg`,
`sample/msd_signed.pdf` (same PDF after MSD signing).

---

# Addendum 3 — Can both coexist? And are the Claude files signed?

## Q1: Correct — you cannot stack both on one file. But nesting works.

You were right to push on this. I tested both orders rather than assuming.

| Order | C2PA state | MSD state |
|---|---|---|
| **C2PA first → then MSD** (real Adobe PDF) | ❌ binding BROKEN (`dataHash.mismatch`) | ✅ valid |
| **MSD first → then C2PA** (JPEG, both can write) | ✅ binding INTACT | ❌ **signature invalid** |

**Neither order preserves both.** In the second case MSD's metadata is still *readable*,
but its signature no longer verifies — which is arguably worse than failing loudly.

The cause is structural, not a bug. Both schemes hash the entire asset. C2PA has a
`c2pa.hash.data` exclusion mechanism that skips its **own** JUMBF region — but it has no
exclusion entry for MSD's bytes, and MSD has no exclusion concept at all. So whoever
writes second breaks the first (C2PA inserts ~113 KB of JUMBF, well after MSD signed).

So yes: **applying two standards to one file is the wrong design.** Your instinct is right.

### But there is a third option that beats "pick one"

Rather than layering the two *containers*, nest the MSD **envelope** inside a C2PA
**assertion**. Tested end to end:

```
assertion  com.staple.msd-envelope  ->  {"msd": "<json.dumps(msd_signed)>"}
```

Result:
- MSD envelope survives byte-identical through the C2PA round-trip
- MSD `signature_is_valid: True` **after** extraction
- C2PA binding **INTACT**

**Both signatures valid simultaneously, one file, one container format.** C2PA carries
the file-level provenance and the trust chain; the MSD envelope rides inside as signed
payload, still independently verifiable if the value is later lifted out into a database
or an API response. That preserves the one genuine differentiator we identified in
CONTEXT.md — provenance carried *inside* the value — without a second container fighting
the first.

Note the limit: this only works on C2PA-writable formats (media). For PDFs, C2PA cannot
write at all, so nesting is unavailable and MSD-alone remains the only option there.

### Revised recommendation

**One standard per file — and that standard should be C2PA wherever it can write.**

- **Media:** C2PA only, with the MSD envelope nested inside an assertion if we need
  value-level portability. Never two containers.
- **PDF / Office:** MSD only, because C2PA physically cannot write. Not a design
  preference — a tooling constraint, and the reason the hybrid exists at all.
- The hybrid is therefore **format-partitioned**, not layered. Each file carries exactly
  one signature scheme. That is a much cleaner story for Thursday than "we apply both."

This also sharpens the sponsor question: the hybrid's only justification is the PDF
tooling gap. Close that gap — upstream, or by implementing the `/AF` mechanism ourselves —
and the answer collapses to plain C2PA everywhere, which is what Josh wanted.

## Q2: The Claude-generated files are NOT signed

Checked all five in `claude_generated_files/`:

| File | c2patool | Marker scan |
|---|---|---|
| `test.jpg` | `No claim found` | none |
| `test.png` | `No claim found` | none |
| `test.pdf` | `No claim found` | none |
| `extracted.csv` | `Unsupported file type` | none |
| `extracted.json` | `Unsupported file type` | none |

Beyond c2patool I byte-scanned each for `jumb`, `c2pa`, `C2PA_Manifest`, `__msd`, the 🔏
marker, and Unicode variation selectors (U+FE00–FE0F, U+E0100–E01EF, the range used by
both MSD and Anthropic's text watermark). **Zero hits in every file.**

**Why, and why it matters for our report:** these were written to disk by Claude Code as
a coding tool, which is not the consumer image-generation path that Anthropic's August
2026 C2PA rollout covers. So they are **not** evidence of vendor C2PA adoption, and they
do not demonstrate the text watermark either. We should not cite them as vendor-signed
samples — the only genuine production-signed vendor artifact we hold is
`sample/adobe-pdf.pdf` (issuer "Adobe Inc.", `cai-prod`).

It is also a useful practical data point in its own right: provenance metadata is only
present when a tool deliberately adds it. Files produced by ordinary automation carry
nothing, which is precisely the gap our project exists to close.

---

# Addendum 4 — A real Google/Gemini signature verified

Leon supplied `sample/gemini_generated_image.jpeg`, a Gemini-generated image.
It is **genuinely C2PA-signed by Google in production** — the first real AI-vendor
artifact we hold, closing the gap flagged in Addendum 2 where vendor adoption rested
only on published announcements.

```
claim_generator : Google C2PA Core Generator Library 967721875:967721875
issuer          : Google LLC
common_name     : Google Media Processing Services
signed at       : 2026-08-22T03:22:37Z
claim_version   : 2
manifest size   : 6,012 bytes (0.73% of the 820 KB file)
```

## What Google actually puts in it

One assertion, `c2pa.actions.v2`, with two actions:

| action | digitalSourceType | description |
|---|---|---|
| `c2pa.created` | `trainedAlgorithmicMedia` | "Created by Google Generative AI." |
| `c2pa.edited` | `trainedAlgorithmicMedia` | "Applied imperceptible SynthID watermark." |

**No custom assertions, no ingredients.** This is a *minimal disclosure* manifest — its
entire job is to say "AI-generated, by Google."

That contrast is useful for Thursday. Google uses C2PA for **disclosure**; Staple wants
it for **structured data transport**. Same standard, very different payloads — and only
our use case runs into the numeric-array corruption of Addendum 1, because Google never
puts structured data in a manifest at all.

## Full trust infrastructure, verified offline

Two certificates travel inside the file:

```
leaf : CN=Google Media Processing Services, OU=Google System 60032
       valid 2026-02-25 → 2027-02-20
ICA  : CN=Google C2PA Media Services 1P ICA G3
       issued by Google C2PA Root CA G3, valid 2025-05-08 → 2030-05-08
```

Validation successes include `timeStamp.validated` — Google applies an **RFC 3161
timestamp** at sign time (TSA "Google Core Time Stamping Authority T10"), proving *when*
signing happened independently of the signer's clock. Also `claimSignature.validated`
and `assertion.dataHash.match`.

This confirms empirically what CONTEXT.md asserted: the chain is embedded, so
verification needs no network.

## The three validation states, on one real file

```
1. default read        Valid    signingCredential.untrusted
2. + Google's chain    Trusted  (clean)
3. one byte flipped    Invalid  assertion.dataHash.mismatch
```

The best possible demonstration of the §4 distinction, on genuine vendor content:
`Valid` = signature and binding check out; `Trusted` = we also recognise the issuer;
`Invalid` = content altered. Google's root simply is not in c2patool's default trust
list — which is exactly why "untrusted" must never be reported as "verification failed."

## ⚠️ Caveat worth raising: C2PA is trivially strippable

A plain re-save through Pillow destroys the manifest completely:

```python
Image.open(gemini).save(out, quality=95)   ->  c2patool: "No claim found"
```

C2PA survives **copying** a file, not **re-encoding** it. Screenshots, format
conversions, and any platform that re-processes on upload silently remove provenance —
and a stripped file is indistinguishable from one that never had a manifest.

**This is why Google pairs C2PA with SynthID**, a pixel-level watermark that survives
re-encoding. The C2PA manifest carries the rich, verifiable detail; SynthID is the
robust fallback that survives the pipeline.

The lesson for our architecture: **C2PA proves provenance when present, but its absence
proves nothing.** Any pipeline depending on it must either preserve manifests
deliberately end-to-end, or carry a second, more robust channel. That is a real argument
for MSD's in-value approach on the data side — an `__msd` key inside a JSON object
survives transformations that strip file-level metadata, because it *is* the data rather
than metadata attached to it.

Verified live in the notebook, §4b.
