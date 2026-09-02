# Technical Report — Week 3

Tested 2026-09-02 · `c2patool 0.27.15` · `msd-sdk 0.2.8` / `zef 0.1.56` · `didkit 0.3.3`
Every result below is reproducible from the notebooks in this repo.

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
That is the half where MSD is behind. The Week 2 recommendation ("adopt C2PA, MSD as
document stopgap") correctly answers the embedding question, but that is no longer the
question. **Treat it as provisional.**

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

---

## Recommended position for the sponsor

1. **Answer open question #1 first — graph or embedding?** Ulf asked for the two to be
   distinguished and it has not been decided. Everything else depends on it, and the two
   answers point at different products.
2. **If the answer is the graph**, be ready to justify MSD against W3C VC. On today's
   evidence that is a difficult case.
3. **If the answer is embedding**, MSD has a defensible niche that neither C2PA nor VC
   occupies — and Week 2's format testing becomes directly relevant again.
4. **The tooling gap is the strongest shared finding.** No verification UX exists for
   either standard. Ulf's "if it reduces productivity by 20%, nobody will use it" and
   Huawei Shield Lab's independent observation point the same way. **That is a product
   opportunity, not a comparison loss.**

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
| `c2pa_demo.ipynb` | Embedding: custom data, extraction, tamper, trust, formats |
| `provenance_graph_demo.ipynb` | The graph: MSD chain vs C2PA ingredients |
| `w3c_vc_comparison.ipynb` | W3C VC head-to-head |

```bash
jupyter nbconvert --to notebook --execute --inplace <notebook>.ipynb
```

Needs `c2patool` on `PATH`, plus `pip install msd-sdk didkit c2pa-python`. No network
required.
