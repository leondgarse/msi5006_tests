# Technical Report — Week 3

Tested 2026-09-02 / 2026-09-04 · `c2patool 0.27.15` · `msd-sdk 0.2.8` / `zef 0.1.56` ·
`didkit 0.3.3`. Every result below is reproducible from the notebooks in this repo.

---

## Short answers to this week's open questions

### 1. Are public keys accessible within C2PA metadata during verification?

**Yes — the signing certificate chain travels inside the file, and verification works
fully offline.**

Extracted from the Gemini image with `c2patool --certs`:

```
leaf : CN=Google Media Processing Services, OU=Google System 60032
       valid 2026-02-25 → 2027-02-20
ICA  : CN=Google C2PA Media Services 1P ICA G3
       issued by Google C2PA Root CA G3
```

Both public keys come out as standard PEM, and `openssl verify -partial_chain` confirms
the leaf is genuinely signed by the embedded ICA. No network, no key registry, no lookup.

**One important qualification:** the chain contains the **leaf and intermediate, not the
root**. Verification against the embedded material alone gives
`unable to get issuer certificate`. The root anchor must come from the **C2PA Trust
List**, maintained by the conformance programme. Supply it and the state becomes
`Trusted`:

| What the verifier has | Result |
|---|---|
| The file alone | `Valid` + `signingCredential.untrusted` |
| File + trust anchor | `Trusted` |
| Tampered file | `Invalid` (`assertion.dataHash.mismatch`) |

So identity in C2PA rests on **certificate-chain trust**, not on a key pointer. The
practical consequence: *"is this key accessible?"* is the easy half; *"do I recognise this
issuer?"* is the half that needs external policy.

**The finding worth carrying to the sponsor:** Ulf's real question was how an ordinary
employee checks this against corporate rules without opening Python. **No such tooling
exists — for C2PA or MSD.** The verification maths is solved; the trust-policy UX is not.
That is a gap in both systems and a better observation than any comparison win.

### 2. Can C2PA support cross-validation and JSON data validation?

**Cross-validation: yes, but weaker than MSD.** C2PA has **ingredients** — sign with
`--parent` and you get a signed `parentOf` edge carrying the parent's manifest. So "C2PA
cannot express a provenance graph" is **false** and should not be repeated.

The limit is what happens later:

| Parent tampered *after* the child was signed | Result |
|---|---|
| **C2PA** | parent alone → `Invalid`; **child still reports `Valid`** |
| **MSD** | re-hash the parent → mismatch, **tamper detected** |

C2PA ingredients record the parent's validation state **at ingest time** — a stored
verdict, not a live reference. The child cannot know its ancestor changed.

**In one line: C2PA attests at ingest; MSD is re-verifiable by reference.**

**JSON data validation: no.** C2PA cannot bind a bare structured record at all:

```
rec.json                      → type is unsupported
--sidecar on rec.json         → Output type must match source type
JPEG manifest vs rec.json     → assertion.dataHash.mismatch
```

⚠️ **Correcting our own earlier note.** CONTEXT.md said "`c2pa-python` supports stream
ops", which is true but was being read too broadly. Tested with c2pa-python 0.37.7:
signing an **in-memory JPEG** with no file on disk works; the same call on
`application/json`, `text/csv` or `application/pdf` still fails `type is unsupported`.
**Streaming removes the filesystem, not the format restriction.** It is not evidence that
C2PA supports JSON.

---

## The scope correction that reframes the project

Ulf, 08-28 call (verified against the transcript, ~00:11–00:12):

> "the embedding into existing file types is **orthogonal** to the signing and the
> existence of metadata... C2PA is purely about the second part, that you embed it in
> there... I would recommend that we distinguish the two parts."

MSD has two separable halves:

- **(a) the graph** — signed records and their dependencies, tracked outside the file
- **(b) embedding** — putting bytes into a file, which is all C2PA does

**All of Week 2 tested (b)** — format coverage, size limits, array corruption, layering.
On 08-28 that looked like the wrong axis, and the Week 2 recommendation ("adopt C2PA, MSD
as document stopgap") was accordingly marked provisional.

**Reviewing the Week 1 AML demo changes that reading.** The shipped product is (b): a PDF
carrying its own audit package, with reconciliation modelled as a star around a CRM anchor
rather than a multi-party DAG. So Week 2's testing was aimed at the half that actually
ships — but its *conclusion* still needs revising, for a different reason than we thought.
"Adopt C2PA for documents" is not available at all, because C2PA cannot write any format
Staple delivers. See the AML section below.

---

## What the MSD SDK actually does

Audited `msd-sdk-python` v0.2.8, the open-sourced implementation.

**Trust is not implemented, and it is deliberate.** All three verify paths in `core.py`
contain the literal line:

```python
is_trusted = False  # trust chains not yet implemented
```

`signature_is_trusted` can never be `True`, and `tests/test_verify.py` *asserts* it must
be `False`. `is_endorsed()` and `generate_key_pair()` raise `NotImplementedError` without
`unendorsed=True`.

**The shipped trust network is disconnected from verification.** `add_to_trust_network` /
`is_trusted` work against a local JSON file, but `verify()` never consults it. The
documented workflow in `notes/Trust Network.md` calls `result.get('signer_identity')` —
**that key does not exist** in the verify result. The documented trust flow cannot work as
written.

**Test coverage is inverted:** 41 tests for the local JSON trust file, 15 for compact
keys — while `test_sign.py`, `test_verify.py`, `test_embed.py` and `test_content_hash.py`
contain zero `def test_` functions.

**No graph primitive exists.** No `link`, `reference`, `derived_from`, or DAG call
anywhere in the public API.

---

## Building the graph anyway — `provenance_graph_demo.ipynb`

`content_hash()` is a structure-aware BLAKE3 Merkle hash, which is the right building
block. Ulf's three-node scenario, in about thirty lines:

```
- aggregate 714e2ce2e5d8abb3  valid=True
   - extract   567bd0030562e848  valid=True
      - capture   9f5c357cec4c0ad7  valid=True
```

That answers *"which inputs produced this number — other than trust me, bro."*

- **The edges bind.** Tamper the receipt and the recorded hash no longer matches, while
  the child stays validly signed — two independent results, correctly separated.
- **Post-hoc attachment works.** An auditor signs an attestation over the record's hash
  years later; the original is untouched and need not even be reachable.

⚠️ **A claim to drop:** the meeting summary says C2PA "structurally cannot" do post-hoc
attachment. **It can** — re-signing as a second party produces a 2-manifest store where
the first manifest survives as an ingredient, still `Valid`. The real difference is
narrower: C2PA requires the **asset bytes** and **rewrites the file** (174,918 → 290,744
bytes, new artifact); MSD needs only the **hash** and touches nothing.

**Attach-by-rewrite vs attach-by-reference** — defensible, and it survives testing.

---

## What Staple actually sells — the Week 1 AML demo

Reviewing Josh's `aml part 3` video changed how several findings above should be read, so
it belongs before the comparison rather than after it. Reconstructed end to end in
`aml_use_case_demo.ipynb`.

**The use case:** a bank onboards a client (Declan Ó Ruairc, policy `94110552`). Five
source documents — passport, Swiss residence permit, broadband bill, new business
application, adviser declaration — are extracted and reconciled **against the CRM record
as anchor**. Disagreements become exceptions: passport expired 2024-07-14, residence
permit expired 2025-10-31, address proof not linked. Overall status `Not Reconciled`.

**The deliverable**, in Josh's framing at 00:00:01 — *"how that data travels together once
it leaves Staple"*: two visually identical PDFs, one of which went through Staple. Upload
both to Audit Verification and one has no signature, while the other carries **the
extracted fields, the audit trail and the full reconciliation result inside the PDF
itself**. The recipient verifies offline with no Staple access, and does not need to
re-OCR the document.

Reconstruction confirms the mechanics: 4,573 bytes of JSON payload embedded into a 626 KB
PDF for +4,646 bytes, still opening as an ordinary PDF, everything recovered
byte-identically — including nested comparison rows and the non-ASCII `Ó` — and one
flipped byte invalidating the signature.

### Three consequences for this evaluation

**C2PA is not a candidate for this use case at all.** Every artifact in the demo is PDF,
JSON, CSV or Excel. Week 2 established C2PA writes none of them. This is not a
close comparison to be argued on features — C2PA could not carry the demo.

**The shipped product is the embedding half, not the graph half.** The reconciliation is a
**star around a CRM anchor**, not the multi-party dependency DAG Ulf described on 08-28.
Nothing in the commercial demo exercises the graph story. That makes open question #1
sharper, not softer: the product Josh sells from is (b), while the differentiator Ulf
named is (a), and **they are not the same product**.

**The identity gap is visible in the demo itself.** `signature_is_trusted` is `False` in
the reconstruction and would be in production too, since `msd-sdk` hardcodes it. The demo
shows *"valid signature"* and stops there. For a regulated AML workflow the next question
is immediate — *valid, but signed by whom, and do I trust them?* — and today there is no
answer. This is the single most consequential gap found in three weeks of testing,
because it sits directly on the commercial path.

Also worth noting: Josh's single-file limiting case is exactly what this demo is. The
recipient gets **one PDF**. Interlinkability buys nothing here; the value is the
self-contained audit package. Any pitch built on the dependency graph is describing a
different product from the one currently demonstrated.

---

## W3C Verifiable Credentials — the challenge nobody had prepared for

CONTEXT.md flagged this as the strongest expected challenge. Tested with `didkit` 0.3.3
(SpruceID, prebuilt wheel, no build step).

| | W3C VC | MSD | C2PA |
|---|---|---|---|
| signs structured JSON | yes | yes | no |
| lossless numeric arrays | yes | yes | **NO — corrupts** |
| signature primitive | Ed25519 | Ed25519 | ECDSA / RSA-PSS |
| dependency chain | yes — **`evidence`** | hand-rolled | yes — ingredients |
| re-verify ancestor later | yes | yes | **NO** |
| works offline | yes | partly | yes |
| identity / trust | DIDs, resolvable | **not implemented** | X.509 + trust list |
| selective disclosure | spec yes / tool no | commitment only | no |
| **embeds into files** | **NO** | **yes** | yes (media) |
| standardisation | W3C Rec | one vendor | ISO + C2PA |
| ecosystem | wallets, EU eIDAS | Staple only | Adobe, Google, MS |

Verified directly: VC carries `[420,164,35,24]`, `[1.5,2.5]`, `[1,2,3,256]` **losslessly**
where C2PA destroys all three; expresses derivation through the **standard `evidence`
property** rather than a convention we invented; detects ancestor tampering; and issues
and verifies with **all outbound sockets blocked**.

Two limits recorded precisely:

- JSON-LD **refuses undefined terms** without an `@vocab` declaration. Ergonomic friction
  that buys schema discipline — arguably right for an auditability product, given MSD's
  known gap that `metadata` has no convention and no validation.
- **BBS+ is not in didkit 0.3.3** (`unknown variant BbsBlsSignature2020`). VC's strongest
  theoretical advantage is **spec-level, not tool-level** — the same distinction we drew
  for C2PA-in-PDF, and it should be stated that carefully.

### The uncomfortable conclusion

**VC matches or beats MSD on every axis tested except file embedding and in-value carry.**
It is a W3C Recommendation with a real ecosystem, against — in Josh's words — *"MSD is not
anywhere right now. It's in Staple."*

If the differentiator is **the graph**, we should expect "why not VC?" and we do not
currently have a strong answer, because VC does the graph better and did it first.

**MSD's genuinely defensible ground is the intersection both others miss: structured
provenance carried *inside* business documents.** VC has no embedding at all; C2PA cannot
write PDF or Office. That is a real position — and it is the (b) half, not the (a) half.

The AML demo makes this concrete rather than theoretical. A VC *can* reference a PDF by
hash — tested, it issues fine — but the PDF is left unchanged, so the recipient must be
handed **two files and keep them together**. The whole point of the Staple deliverable is
that the client receives **one PDF that already carries its own audit package**. That is
the requirement neither VC nor C2PA meets, and it is the one Staple is actually selling.

---

## Recommended position for the sponsor

Three weeks of testing point to one recommendation, and the AML demo is what settles it.

1. **Position MSD on embedding, not on the graph.** This is now an evidence-backed
   recommendation rather than a coin flip. The graph story loses to W3C VC — a W3C
   Recommendation with a real ecosystem, native `evidence` chains and working DIDs, where
   MSD's equivalent is a convention we hand-rolled last week on top of `content_hash`. The
   embedding story has **no competitor at all**: VC cannot embed, and C2PA cannot write a
   single format Staple ships. Ulf asked for the two halves to be distinguished; the
   commercial demo has effectively already chosen, and it chose (b).

2. **Close the identity gap — it is the critical path.** `signature_is_trusted` is
   hardcoded `False`, `is_endorsed()` raises `NotImplementedError`, and the shipped trust
   network is not consulted by `verify()`. For AML this is not a rough edge: a bank cannot
   accept *"valid signature, signer unknown."* Everything else in the product works;
   this is what stands between the demo and a regulated deployment. **Recommend making it
   the next engineering priority**, ahead of any graph work.

3. **Treat the dependency DAG as future scope, not the current pitch.** Nothing in the
   shipped product exercises it, Josh's single-file limiting case applies directly to the
   demo, and the comparison against VC is unfavourable today. It is a good roadmap item
   and a poor differentiator to lead with.

4. **The tooling gap is the strongest shared finding, and the clearest opportunity.**
   No verification UX exists for either standard — Ulf's *"if it reduces productivity by
   20%, nobody will use it"* and Huawei Shield Lab's independent observation converge on
   this. Whoever ships the button an ordinary compliance officer can press wins adoption
   regardless of which format sits underneath. **That is a product opportunity, not a
   comparison loss.**

### The honest risk to state alongside it

If the sponsor's goal is a standards play, MSD is competing with a W3C Recommendation and
an ISO standard while being, in Josh's own words, *"not anywhere right now. It's in
Staple."* The defensible framing is narrower and more durable: MSD is **the packaging
format for Staple's audit output**, solving a problem the standards bodies have not
addressed — structured provenance inside business documents — rather than a general-purpose
provenance protocol competing head-on with C2PA and VC.

## Claims to correct before publishing anything

- MSD is **Meta Structured Data**, not "Media Signature Data".
- The C2PA issue is **silent numeric-array corruption inside custom assertions**, not
  general "file corruption".
- Upstream **deprioritised** PDF write (#527 closed `not_planned`). Adobe does not "block"
  it — Adobe ships C2PA-signed PDFs via internal tooling.
- **Do not** attack C2PA as closed-source Adobe control. `c2pa-rs` is Apache-2.0/MIT under
  the Linux Foundation JDF; falsifiable in one click.
- "OpenAI/Anthropic use C2PA" is true for **images and video only**.
- **C2PA can express provenance chains** (ingredients) and **can do post-hoc attachment**
  (by rewrite). Both were overstated in the meeting notes.

---

## Reproducing this

| Notebook | Covers |
|---|---|
| `aml_use_case_demo.ipynb` | **Staple's real use case**, reconstructed from the Week 1 video |
| `c2pa_demo.ipynb` | Embedding: custom data, extraction, tamper, trust, formats |
| `provenance_graph_demo.ipynb` | The graph: MSD chain vs C2PA ingredients |
| `w3c_vc_comparison.ipynb` | W3C VC head-to-head |

```bash
jupyter nbconvert --to notebook --execute --inplace <notebook>.ipynb
```

Needs `c2patool` on `PATH`, plus `pip install msd-sdk didkit c2pa-python`. No network
required.

---

## Upstream update — checked 2026-09-04

Re-surveyed `contentauth/c2pa-rs` and `contentauth/c2pa-python` for changes since the
Week 2 survey, with attention to `feat` work.

### 🟢 Our array-corruption finding is now confirmed upstream by a third party

**Issue [#2570](https://github.com/contentauth/c2pa-rs/issues/2570)**, opened 2026-09-01
by an unrelated reporter:

> "Custom assertion: JSON integer array silently coerced to CBOR byte string, values >255
> truncated mod 256"

Their repro is `[96, 384]` → `"YIA="` = bytes `[96, 128]`. Same mechanism, same silent
`validation_state: Valid`, found independently of us.

**Status: open, zero comments, no maintainer response, no label.**

**Still present in the newest release.** Two versions have shipped since we tested
(0.27.16 on 08-27, **0.27.17** on 09-03). Retested on 0.27.17:

```
values [96,384]        -> "YIA="
bbox [420,164,35,24]   -> "pKQjGA=="
floats [1.5,2.5]       -> ""
negs [-1,2,3]          -> "AgM="
validation_state: Valid
```

Unchanged. **This is not a version issue to wait out** — the string-wrapping workaround
should be treated as permanent, not temporary. Independent confirmation also strengthens
the finding for the report: it is a reproducible upstream defect, not a local
misconfiguration.

### 🟡 PR #499 (ZIP / Office) is active again but still blocked

Last touched **2026-09-03** — it has grown from 10 files / 1,139 lines at our Week 2
survey to **14 files / 1,635 lines across 57 commits**. So work continues.

But the blocking comment is unchanged: the C2PA spec requires the ZIP central-directory
CRC32 be zero while the ZIP spec requires it for integrity, and no resolution has been
posted since Adobe filed CAI-12644 in June. `mergeable_state: unstable`. **Office support
remains speculative** — do not plan around it.

### Notable merged `feat` work (since 2026-08-20)

| PR | What |
|---|---|
| **#2545** | `feat!` **C2PA 2.3 spec support** — multiple named trust lists, `trust_list_uri`, per-list EKU config, unified trust model (manifest / CAWG / TSA), more detailed trust-source reporting |
| #2544 | `Error::AssertionEncoding` now includes its source in the error message — "this error has bitten us a few times" |
| #2446 | Related-assertions field and validation on `c2pa.actions` |
| #2447 | Digital source type on ingredients |
| #2513 | General box-hash exclusions |

**#2545 is the one that matters for us.** It substantially reworks trust configuration —
which is exactly the area of our open-question-1 answer. Our finding stands (leaf + ICA
embedded, root from the trust list), but the *mechanism* for supplying trust anchors has
changed, so any future re-test should use the new settings model rather than the flags we
documented.

Also merged: **#2578 `fix!: C2PA 2.4 validation`** (09-03) — validation behaviour is
actively moving. Worth re-running `c2pa_demo.ipynb` against 0.27.17 before the next
sponsor session, since it was executed against 0.27.15.

### The text-format handlers have not moved

The A.7 / A.8 / A.9 handler PRs (#2117, #2188, #2190, #2283, #2494) are all still open and
feature-gated, last touched between 07-27 and 08-19. **Structured-text support is still
not shippable**, so the conclusion from Week 2 holds unchanged.

### c2pa-python

Quiet and maintenance-only: 7 merges since 08-15, all `fix`/`chore` — thread-safety locks
around native handles, crash hardening, and version bumps to c2pa-rs 0.90.16. **No `feat`
work, and nothing that changes the format restriction** we documented. Latest is v0.37.8;
two open PRs, neither a feature.
