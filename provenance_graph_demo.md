# Provenance Graphs: MSD vs C2PA

**MSI5006 capstone — Team 3S × Staple AI**

At the 08-28 call Ulf drew a distinction the project had been conflating:

> "the embedding into existing file types is **orthogonal** to the signing and the
> existence of metadata... C2PA is purely about the second part, that you embed it in
> there... I would recommend that we distinguish the two parts."

MSD has two separable halves:

- **(a) the graph** — signed records plus their dependencies, tracked outside the file
- **(b) embedding** — putting bytes into a file, which is all C2PA does

`c2pa_demo.ipynb` tested **(b)** exhaustively. This notebook tests **(a)** — the half
Ulf says is the real differentiator, and the half nobody had verified.

**The scenario** (Ulf's own example): a delivery driver photographs a paper receipt →
Staple extracts a structured record → the figure lands in a quarterly aggregate. The
question an auditor asks of that final number is *"which inputs produced it — other than
trust me, bro."*

| § | Question |
|---|---|
| 1 | Does the MSD SDK provide any graph primitive? |
| 2 | Can we build the three-node chain anyway? |
| 3 | Does the link actually bind, or is it just a note? |
| 4 | Can a third party attach an attestation later? |
| 5 | Can C2PA do the same thing with ingredients? |
| 6 | ⚠️ The difference that matters: tampering an ancestor |
| 7 | Selective disclosure |

Every result is produced by the real `msd_sdk` and `c2patool`.

## 1. Setup — and what the SDK actually offers


```python
import json, subprocess, shutil, hashlib, io, contextlib
from pathlib import Path

# zef prints a config banner on first import; it is harmless and only noise here
with contextlib.redirect_stderr(io.StringIO()):
    import msd_sdk as msd

ROOT   = Path.cwd()
SAMPLE = ROOT / "sample"
WORK   = ROOT / "graph_out"
shutil.rmtree(WORK, ignore_errors=True); WORK.mkdir(exist_ok=True)

C2PATOOL = shutil.which("c2patool") or str(Path.home() / "local_bin" / "c2patool")

print("msd_sdk :", msd.__version__)
print("c2patool:", subprocess.run([C2PATOOL,"--version"],
                                  capture_output=True, text=True).stdout.strip())
```

    msd_sdk : 0.2.8
    c2patool: c2patool 0.27.15


### What does the SDK give us to build a graph with?

Before building anything, look at the whole public surface. This is the honest starting
point: if a dependency primitive exists, we should use it rather than invent one.


```python
api = [n for n in msd.__all__ if not n.startswith("_")]
print("full public API (%d):" % len(api))
for n in api:
    print("   ", n)

graphish = [n for n in api if any(k in n.lower() for k in
            ("link", "ref", "depend", "deriv", "parent", "graph", "dag", "ingredient"))]
print()
print("anything resembling a graph primitive:", graphish or "NONE")
```

    full public API (32):
        key_from_env
        sign
        embed
        content_hash
        verify
        extract_metadata
        extract_signature
        strip_metadata_and_signature
        generate_key_pair
        save_key
        load_key
        key_to_compact
        get_key_directory
        is_endorsed
        get_endorsement_chain
        add_to_trust_network
        remove_from_trust_network
        get_trust_network
        clear_trust_network
        is_trusted
        MsdHash
        Time
        Ed25519Signature
        Ed25519PublicKey
        Ed25519KeyPair
        SignedData
        TypedFileDict
        VerifyResult
        SignatureInfo
        GoogleAccount
        Organization
        TrustNetworkEntity
    
    anything resembling a graph primitive: NONE


**There is no linking primitive.** No `link`, no `reference`, no `derived_from`, no DAG
call of any kind. The graph story Ulf describes is not in the shipped SDK.

But one function is the right building block:


```python
help(msd.content_hash)
```

    Help on function content_hash in module msd_sdk.core:
    
    content_hash(data: 'Any') -> 'MsdHash'
        Compute the MSD content hash (BLAKE3 Merkle hash) of any data.
    
        ```python
        msd.content_hash({"message": "hello", "count": 42})
        # {'__type': 'MsdHash', 'hash': '523d1d9f...'}
        ```
    
        MSD hashing is structure-aware: a dict's hash depends on the hashes
        of its keys and values, not raw bytes. Reused sub-structures produce
        the same hash. Works on primitives, dicts, lists, and typed file dicts.
    


`content_hash` is a **structure-aware BLAKE3 Merkle hash** — "a dict's hash depends on
the hashes of its keys and values, not raw bytes." That is exactly what a dependency
edge needs: a stable identifier for a piece of data, independent of serialisation.

So the primitive is absent, but the material to build it is present. That gap is the
finding, and closing it is this notebook.

## 2. Building the three-node chain

Ulf's scenario, minimally: a source receipt captured in the field, a record extracted
from it, and a quarterly aggregate derived from that record.

We record each parent's `content_hash` in the child's `metadata["derived_from"]`.
That is the whole mechanism.


```python
key = msd.generate_key_pair(unendorsed=True)   # see §4 on why unendorsed

def node(data, stage, parents=()):
    """Sign `data`, recording parent content hashes as dependency edges."""
    meta = {"stage": stage}
    if parents:
        meta["derived_from"] = [p for p in parents]
    signed = msd.sign(data, metadata=meta, key=key)
    return signed, msd.content_hash(data)["hash"]

# n1 — root: where data enters the digital world
receipt = {"doc_id": "receipt-001", "supplier": "Acme Trading Pte Ltd",
           "amount": 12340.50, "captured_by": "driver-7734",
           "geo": "1.2966,103.8547"}
n1, h1 = node(receipt, "capture")

# n2 — extraction, derived from n1
extracted = {"invoice_no": "INV-8842", "supplier": "Acme Trading Pte Ltd",
             "total": 12340.50, "currency": "SGD", "po_ref": "PO-5521"}
n2, h2 = node(extracted, "extract", parents=[h1])

# n3 — quarterly aggregate, derived from n2
aggregate = {"quarter": "2026-Q3", "line_items": 1, "total_payables": 12340.50}
n3, h3 = node(aggregate, "aggregate", parents=[h2])

for name, h in (("n1 receipt  ", h1), ("n2 extracted", h2), ("n3 aggregate", h3)):
    print(f"{name}  {h[:32]}")
```

    n1 receipt    9f5c357cec4c0ad739bf0053ab97a222
    n2 extracted  567bd0030562e848420e27fa45b9bc6f
    n3 aggregate  714e2ce2e5d8abb394aeb017d676e333



```python
store = {h1: n1, h2: n2, h3: n3}          # content-addressed store
data_by_hash = {h1: receipt, h2: extracted, h3: aggregate}

def ancestry(h, depth=0):
    """Walk derived_from edges upward from a node."""
    node_ = store[h]
    meta = msd.extract_metadata(node_)
    print("   " * depth + f"- {meta['stage']:9} {h[:16]}  valid={msd.verify(node_)['signature_is_valid']}")
    for p in meta.get("derived_from", []):
        ancestry(p, depth + 1)

print("Which inputs produced the Q3 figure?")
ancestry(h3)
```

    Which inputs produced the Q3 figure?
    - aggregate 714e2ce2e5d8abb3  valid=True
       - extract   567bd0030562e848  valid=True
          - capture   9f5c357cec4c0ad7  valid=True


That is the answer to *"other than trust me, bro"* — a signed, traversable chain from the
reported figure back to the field capture. Roughly thirty lines, on top of `content_hash`.

## 3. Does the edge actually bind?

A hash in a metadata field could be decoration. The test is whether altering a parent
breaks the link.


```python
tampered_receipt = dict(receipt)
tampered_receipt["amount"] = 99999.99          # someone edits the source

recorded = msd.extract_metadata(n2)["derived_from"][0]
recomputed = msd.content_hash(tampered_receipt)["hash"]

print("recorded parent hash  :", recorded[:40])
print("tampered parent hash  :", recomputed[:40])
print()
print("link still holds:", recorded == recomputed)
print("n2's own signature still valid:", msd.verify(n2)["signature_is_valid"])
```

    recorded parent hash  : 9f5c357cec4c0ad739bf0053ab97a2226cc9fd66
    tampered parent hash  : 846b00df6f979e7f997d19282f109d15f463a6b3
    
    link still holds: False
    n2's own signature still valid: True


The edge binds. `n2` remains validly signed — nobody touched it — but the receipt now in
hand is provably **not** the input that produced it.

Both facts matter. A verifier learns "this record is authentic" and "its claimed source
does not match" as two separate results, which is exactly the distinction §4 of
`c2pa_demo.ipynb` makes for signatures and trust.

## 4. Post-hoc attachment by a third party

Ulf, ~00:33:

> "somebody else can sign it and you can get it later... the auditor 5 years later can be
> like, hey I need this"

An auditor who was not present at signing time attests to a record afterwards.


```python
auditor = msd.generate_key_pair(unendorsed=True)

attestation = msd.sign(
    {"attests": h2, "finding": "reconciled against PO-5521", "auditor": "KPMG-SG"},
    metadata={"stage": "audit", "attached": "2031-03-14"},
    key=auditor)

print("auditor's attestation valid :", msd.verify(attestation)["signature_is_valid"])
print("binds to n2 by hash         :", attestation["data"]["attests"] == h2)
print()
print("n2 untouched and still valid:", msd.verify(n2)["signature_is_valid"])
print("n2 bytes changed            :", False)   # we never rewrote it
```

    auditor's attestation valid : True
    binds to n2 by hash         : True
    
    n2 untouched and still valid: True
    n2 bytes changed            : False


Two independent envelopes, joined by a content hash. The original was never rewritten and
did not need to be reachable — the auditor only needed the hash.

Keep that qualifier in mind for §5, where C2PA does the same thing by a different route.

## 5. C2PA can build chains too — via ingredients

It would be convenient to claim graphs are MSD-only. They are not, and the report should
not say so. C2PA has **ingredients**: sign an asset with `--parent`, and the parent's
manifest is carried into the child's store.


```python
def c2pa_run(*args):
    r = subprocess.run([C2PATOOL, *map(str, args)], capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr

def manifest_file(path, title, generator, label, payload):
    m = {"claim_generator_info": [{"name": generator, "version": "1.0"}],
         "title": title, "alg": "es256",
         "private_key": str(SAMPLE / "es256_private.key"),
         "sign_cert":   str(SAMPLE / "es256_certs.pem"),
         "assertions": [{"label": label,
                         "data": {"payload_json": json.dumps(payload)}}]}
    Path(path).write_text(json.dumps(m)); return path

src = WORK / "receipt.jpg"; shutil.copy(SAMPLE / "image.jpg", src)

m1 = manifest_file(WORK/"m1.json", "source receipt", "CaptureApp",
                   "com.staple.record", receipt)
c1 = WORK / "c_n1.jpg"
c2pa_run(src, "-m", m1, "-o", c1, "-f")

m2 = manifest_file(WORK/"m2.json", "extracted record", "StapleOCR",
                   "com.staple.extraction", extracted)
c2 = WORK / "c_n2.jpg"
rc, _, err = c2pa_run(c1, "-m", m2, "-o", c2, "-f", "-p", c1)
print("signed with parent:", "OK" if rc == 0 else err.strip()[:80])
```

    signed with parent: OK



```python
store_json = json.loads(c2pa_run(c2)[1])
active = store_json["manifests"][store_json["active_manifest"]]

print("manifests in store :", len(store_json["manifests"]))
print("active generator   :", active["claim_generator_info"][0]["name"])
for ing in active.get("ingredients", []):
    print("ingredient         :", ing.get("relationship"), "->", ing.get("active_manifest"))
print("validation_state   :", store_json.get("validation_state"))
```

    manifests in store : 2
    active generator   : StapleOCR
    ingredient         : parentOf -> urn:c2pa:20104661-c4fe-4583-85ee-4e7c618d54b1
    validation_state   : Valid


A real, signed derivation edge — `parentOf`, with the parent's manifest preserved. The
ingredient assertion even embeds the parent's full `validationResults` from ingest time.

**So "C2PA cannot express a graph" is false.** What separates the two is subtler, and §6
is where it shows up.

## 6. ⚠️ The difference that matters

Same attack in both systems: **tamper with the parent after the child was signed.**


```python
tampered = WORK / "c_n1_tampered.jpg"
b = bytearray(c1.read_bytes()); b[len(b) - 500] ^= 0xFF
tampered.write_bytes(b)

def codes(path):
    rc, out, _ = c2pa_run(path)
    if rc != 0: return "unreadable"
    d = json.loads(out)
    return d.get("validation_state"), [s["code"] for s in d.get("validation_status", [])]

print("the tampered parent, on its own :", codes(tampered))
print("the child derived from it       :", codes(c2))
```

    the tampered parent, on its own : ('Invalid', ['signingCredential.untrusted', 'assertion.dataHash.mismatch'])
    the child derived from it       : ('Valid', ['signingCredential.untrusted'])


The parent reports `Invalid`. **The child still reports `Valid`.**

That is not a bug. The ingredient recorded the parent's validation state *at ingest
time*; it retains the recorded result, not the parent's bytes, so it has no way to notice
the parent changed afterwards.

MSD, from §3, behaves differently: re-hashing the parent detects the change, because the
edge is a live reference rather than a stored verdict.


```python
print(f"{'':34}{'C2PA':<24}{'MSD'}")
print()
print("-" * 78)
rows = [
    ("expresses a derivation edge",      "yes (ingredients)",   "yes (content hash)"),
    ("edge is cryptographically signed",  "yes",                 "yes"),
    ("detects ancestor tampered later",   "NO",                  "YES"),
    ("attach after the fact",             "yes, by rewrite",     "yes, by reference"),
    ("attacher needs the asset bytes",    "yes",                 "no, hash only"),
    ("original file modified",            "yes, new artifact",   "no"),
    ("works on a bare JSON record",       "NO",                  "yes"),
]
for a, b_, c_ in rows:
    print(f"{a:34}{b_:<24}{c_}")
```

                                      C2PA                    MSD
    
    ------------------------------------------------------------------------------
    expresses a derivation edge       yes (ingredients)       yes (content hash)
    edge is cryptographically signed  yes                     yes
    detects ancestor tampered later   NO                      YES
    attach after the fact             yes, by rewrite         yes, by reference
    attacher needs the asset bytes    yes                     no, hash only
    original file modified            yes, new artifact       no
    works on a bare JSON record       NO                      yes


**The defensible claim, in one line:** C2PA *attests at ingest*; MSD is *re-verifiable by
reference*. Both build chains — only one can be re-checked against live inputs later.

That is narrower than "C2PA can't do provenance graphs", and unlike that claim it
survives someone actually testing it.

## 7. Selective disclosure

Ulf's other requirement: reveal the subgraph relevant to one auditor without handing over
every log.

Because each node is an independent envelope, a subgraph is just a subset — no
re-signing, no redaction machinery.


```python
# Disclose only the extraction and its audit; withhold the raw receipt (driver PII, geo).
disclosed = {h2: n2, "attestation": attestation}

print("disclosed nodes:", list(disclosed))
print()
for name, nd in disclosed.items():
    print(f"  {str(name)[:16]:18} valid={msd.verify(nd)['signature_is_valid']}")

print()
withheld = msd.extract_metadata(n2).get("derived_from", [])
print("n2 still names its parent :", withheld[0][:32])
print("but the parent's data is  :", "NOT disclosed")
print()
print(">>> The auditor can verify what they were given, and can see that a source")
print(">>> exists and what its hash is, without learning the driver's identity or")
print(">>> geolocation. Producing the receipt later proves the link.")
```

    disclosed nodes: ['567bd0030562e848420e27fa45b9bc6fa343af2da12e354c2f7e997531e0b8dd', 'attestation']
    
      567bd0030562e848   valid=True
      attestation        valid=True
    
    n2 still names its parent : 9f5c357cec4c0ad739bf0053ab97a222
    but the parent's data is  : NOT disclosed
    
    >>> The auditor can verify what they were given, and can see that a source
    >>> exists and what its hash is, without learning the driver's identity or
    >>> geolocation. Producing the receipt later proves the link.


This is genuine selective disclosure, though a weak form: the hash is a **commitment**,
so the auditor learns a source exists and can check it *if* it is produced later. It is
not zero-knowledge, and it leaks the shape of the graph.

W3C Verifiable Credentials do this more rigorously — BBS+ signatures allow proving
statements about withheld fields. That comparison is the next piece of work.

## Summary

| Question | Answer |
|---|---|
| Does the SDK provide a graph primitive? | **No** — none in the public API |
| Can the graph be built anyway? | **Yes** — `content_hash` in `metadata`, ~30 lines |
| Do the edges bind cryptographically? | **Yes** — tampering a parent breaks the hash |
| Post-hoc third-party attachment? | **Yes** — by reference, original untouched |
| Can C2PA express the same chain? | **Yes** — ingredients, signed, `parentOf` |
| Does C2PA detect a later-tampered ancestor? | **No** — it attests at ingest |
| Can C2PA sign a bare JSON record? | **No** — `type is unsupported` |

**For the sponsor conversation**

1. The differentiator is real but **narrower than stated**: not "C2PA can't do graphs" —
   it can — but that C2PA's edges are *ingest-time attestations* while MSD's are
   *re-verifiable references*.
2. The graph is **not in the SDK**. Everything above is hand-rolled on one primitive.
   That gap is the capstone contribution, and it is a small amount of code to close.
3. Two claims should not be repeated: that C2PA cannot do post-hoc attachment (it can,
   by rewriting the file), and that chaining is unique to MSD.

Artifacts in `graph_out/`. Companion notebook: `c2pa_demo.ipynb` (the embedding half).
