# Computational-Operation Provenance: C2PA vs MSD

**MSI5006 capstone — Team 3S × Staple AI**

At the 09-04 call Ulf moved the differentiator again — from the parent-child link to the
**computational operation**:

> "you want a bit of a richer relation than just parent child... you want to be able to
> specify the exact computational operation, be it deterministic or nondeterministic...
> suppose you're calculating an aggregate from some receipts... You want to be able to
> specify the function, the computation that you're running, together with the input
> data, and **verify that that is the result**."

Both Gavin and Zhuchao immediately raised the obvious objection: **C2PA accepts arbitrary
custom JSON assertions, so why can't you just put the operation record in there?** Josh
conceded it — *"it seems like you can essentially do anything that any other signing thing
could do, because it's a Turing complete thing that you can just add"* — and defended it
with an analogy: *"it's like saying Python is useless because you could have done
everything in C++."*

That analogy will not survive a capstone defence. This notebook settles the question
empirically.

| § | Question |
|---|---|
| 1 | Can C2PA carry a computational-operation record at all? |
| 2 | Does C2PA *verify* what the record claims? |
| 3 | Is there any schema enforcement? |
| 4 | Can a verifier resolve the declared inputs? |
| 5 | Does MSD have an operation primitive? |
| 6 | Can MSD re-check the inputs? |
| 7 | ⚠️ Attestation vs proof |
| 8 | Verdict |

Companions: `c2pa_demo.ipynb`, `provenance_graph_demo.ipynb`, `w3c_vc_comparison.ipynb`,
`aml_use_case_demo.ipynb`.

## 1. Can C2PA carry the record at all?


```python
import json, subprocess, shutil, io, contextlib
from pathlib import Path

ROOT   = Path.cwd()
SAMPLE = ROOT / "sample"
WORK   = ROOT / "op_out"
shutil.rmtree(WORK, ignore_errors=True); WORK.mkdir(exist_ok=True)
C2PATOOL = shutil.which("c2patool") or str(Path.home() / "local_bin" / "c2patool")

with contextlib.redirect_stderr(io.StringIO()):
    import msd_sdk as msd

def c2pa(*args):
    r = subprocess.run([C2PATOOL, *map(str, args)], capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr

def sign_with(data, out_name, label="com.staple.computation"):
    """Sign a JPEG carrying `data` under a custom assertion label."""
    m = {"claim_generator_info": [{"name": "StapleAI-optest", "version": "0.1.0"}],
         "title": "computational operation", "alg": "es256",
         "private_key": str(SAMPLE / "es256_private.key"),
         "sign_cert":   str(SAMPLE / "es256_certs.pem"),
         "assertions": [{"label": label, "data": data}]}
    mp = WORK / (out_name + ".json"); mp.write_text(json.dumps(m))
    src = WORK / (out_name + "_in.jpg"); shutil.copy(SAMPLE / "image.jpg", src)
    dst = WORK / (out_name + ".jpg")
    rc, _, err = c2pa(src, "-m", mp, "-o", dst, "-f")
    return (dst if rc == 0 else None), err

def read_assertion(path, label="com.staple.computation"):
    rc, out, _ = c2pa(path)
    d = json.loads(out)
    am = d["manifests"][d["active_manifest"]]
    val = next((a["data"] for a in am["assertions"] if a["label"] == label), None)
    return val, d

print("c2patool:", subprocess.run([C2PATOOL,"--version"],capture_output=True,text=True).stdout.strip())
print("msd_sdk :", msd.__version__)
```

    c2patool: c2patool 0.27.15
    msd_sdk : 0.2.8


The operation record, modelled directly on Ulf's example — aggregating receipts into a
daily total. Inputs and output are referenced **by content hash**, which is what makes the
claim checkable in principle.


```python
operation = {
    "operation":         "aggregate_daily_expenses",
    "operation_version": "2.1.0",
    "deterministic":     True,
    "performer":         "staple-pipeline",
    "inputs": [
        {"id": "receipt-A", "sha256": "aaa111"},
        {"id": "receipt-B", "sha256": "bbb222"},
    ],
    "output":      {"id": "daily-total", "sha256": "ccc333", "value": 12340.50},
    "executed_at": "2026-09-07T10:00:00Z",
}

signed, err = sign_with(operation, "honest")
print("signed:", "OK" if signed else err.strip()[:80])

back, store = read_assertion(signed)
print("round-trip lossless:", back == operation)
print("validation_state   :", store.get("validation_state"))
print()
print(json.dumps(back, indent=2)[:420], "...")
```

    signed: OK
    round-trip lossless: True
    validation_state   : Valid
    
    {
      "deterministic": true,
      "executed_at": "2026-09-07T10:00:00Z",
      "inputs": [
        {
          "id": "receipt-A",
          "sha256": "aaa111"
        },
        {
          "id": "receipt-B",
          "sha256": "bbb222"
        }
      ],
      "operation": "aggregate_daily_expenses",
      "operation_version": "2.1.0",
      "output": {
        "id": "daily-total",
        "sha256": "ccc333",
        "value": 12340.5
      },
      "performer": "staple-pipeline"
    } ...


**So the objection is correct on its face.** C2PA carries the full operation record
losslessly — nested dicts, lists, floats, booleans — and validates cleanly.

Any claim that "C2PA cannot express computational provenance" is false, and the report
should not make it. The interesting question is what *"Valid"* actually means here.

## 2. Does C2PA verify what the record claims?

The record says receipts A and B produced a total of 12,340.50. Suppose the signer lies —
different inputs, a different total. Does anything object?


```python
forged = json.loads(json.dumps(operation))          # deep copy
forged["inputs"][0]["sha256"] = "DEADBEEF_forged"   # never was an input
forged["output"]["value"]     = 999999.99           # never was the result

signed_f, _ = sign_with(forged, "forged")
back_f, store_f = read_assertion(signed_f)

print("claimed input A :", back_f["inputs"][0]["sha256"])
print("claimed output  :", back_f["output"]["value"])
print("validation_state:", store_f.get("validation_state"))
print("status codes    :", [s["code"] for s in store_f.get("validation_status", [])])
```

    claimed input A : DEADBEEF_forged
    claimed output  : 999999.99
    validation_state: Valid
    status codes    : ['signingCredential.untrusted']


`Valid`.

C2PA verifies that **the bytes were not altered after signing**. It has no notion of
whether the claimed computation ever happened, and no way to acquire one. The signature is
a faithful record of what the signer asserted — including when the signer asserts
nonsense.

This is not a C2PA defect. It is the boundary of what any signature can do, and §7 returns
to it.

## 3. Is there any schema enforcement?

If custom assertions are the mechanism, does the label carry any contract about shape?


```python
junk = {"operation": 42, "inputs": "not-a-list", "banana": True}   # structurally meaningless
signed_j, _ = sign_with(junk, "junk")
back_j, store_j = read_assertion(signed_j)

print("stored as       :", json.dumps(back_j))
print("validation_state:", store_j.get("validation_state"))
```

    stored as       : {"banana": true, "inputs": "not-a-list", "operation": 42}
    validation_state: Valid


Also `Valid`. `operation` is a number, `inputs` is a string, and there is a `banana`.

**A custom assertion label is a namespace, not a schema.** Nothing validates the shape, so
two implementers using `com.staple.computation` can produce mutually unintelligible data
and both get a green tick. This is the substantive half of the answer to the
Turing-complete objection: the container is real, the *semantics* are entirely yours to
define, and defining them is the actual work.

## 4. Can a verifier resolve the declared inputs?

The record names two inputs by hash. Can a verifier follow them?


```python
rc, out, _ = c2pa(signed, "-d")
detailed = json.loads(out)
store_d  = detailed["manifests"][detailed["active_manifest"]].get("assertion_store", {})

print("assertions in the manifest:")
for k in store_d: print("   ", k)

print()
print("c2pa.hash.data binds  :", json.dumps(store_d.get("c2pa.hash.data", {}))[:110], "...")
print("custom assertion input:", json.dumps(store_d.get("com.staple.computation", {}).get("inputs")))
```

    assertions in the manifest:
        c2pa.hash.data
        c2pa.thumbnail.claim
        c2pa.ingredient.v3
        c2pa.thumbnail.ingredient
        com.staple.computation
        c2pa.actions.v2
    
    c2pa.hash.data binds  : {"exclusions": [{"start": 2, "length": 113448}], "name": "jumbf manifest", "alg": "sha256", "hash": "+Zn9eL/oq ...
    custom assertion input: [{"id": "receipt-A", "sha256": "aaa111"}, {"id": "receipt-B", "sha256": "bbb222"}]


Two different things sit side by side here:

- **`c2pa.hash.data`** is a real cryptographic binding — but it binds *this asset's own
  bytes*, nothing else.
- **`inputs`** inside the custom assertion are plain strings. Nothing connects them to the
  `c2pa.ingredient` entries, so there is no traversal, no resolution, no lookup.

A verifier receiving this file sees a hash it cannot resolve and therefore cannot check.
C2PA's genuine linking mechanism is `c2pa.ingredient`, which requires ingesting the parent
asset at signing time — a different shape from "reference an input by hash" (see
`provenance_graph_demo.ipynb` §5-6).

## 5. Does MSD have an operation primitive?

Week 3 established there is no *graph* primitive. Extending the same audit to operations.


```python
api = [n for n in msd.__all__ if not n.startswith("_")]
print("MSD public API (%d):" % len(api))
for n in api: print("   ", n)

kw = ("operation", "function", "compute", "exec", "invoke", "step", "transform", "derive")
print()
print("anything for computational operations:",
      [n for n in api if any(k in n.lower() for k in kw)] or "NONE")
```

    MSD public API (32):
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
    
    anything for computational operations: NONE



```python
kp = msd.generate_key_pair(unendorsed=True)
probe = msd.sign({"v": 1}, metadata={"operation": "agg", "inputs": []}, key=kp)
print("verify() returns:", sorted(msd.verify(probe).keys()))
print()
print("no 'inputs_verified', no 'operation', no traversal — signature facts only")
```

    verify() returns: ['data_hash', 'is_verified_and_trusted', 'metadata_hash', 'signature_is_trusted', 'signature_is_valid', 'signature_timestamp', 'signing_key', 'signing_key_trust_chain', 'trust_chain_breaches']
    
    no 'inputs_verified', no 'operation', no traversal — signature facts only


**No operation primitive in either system.** Both offer a signed container and leave the
semantics to the caller.

## 6. Can MSD re-check the inputs?

This is where the two genuinely differ — but the difference is narrower than the pitch
suggests, so it is worth stating precisely.


```python
receipt_A = {"id": "receipt-A", "amount": 5000.00}
receipt_B = {"id": "receipt-B", "amount": 7340.50}
total     = {"id": "daily-total", "value": 12340.50}

hA = msd.content_hash(receipt_A)["hash"]
hB = msd.content_hash(receipt_B)["hash"]

op_msd = {"operation": "aggregate_daily_expenses", "deterministic": True,
          "performer": "staple-pipeline",
          "inputs": [{"id": "receipt-A", "hash": hA}, {"id": "receipt-B", "hash": hB}],
          "output": {"id": "daily-total", "hash": msd.content_hash(total)["hash"]}}

signed_msd = msd.sign(total, metadata=op_msd, key=kp)
print("MSD signature valid:", msd.verify(signed_msd)["signature_is_valid"])

# the same forgery as §2
forged_msd = msd.sign(total, metadata={**op_msd,
    "inputs": [{"id": "receipt-A", "hash": "DEADBEEF_forged"}]}, key=kp)
print("forged record also valid:", msd.verify(forged_msd)["signature_is_valid"], " <-- same as C2PA")
```

    MSD signature valid: True
    forged record also valid: True  <-- same as C2PA



```python
# But: the recorded hash can be recomputed from the real input later.
recorded = msd.extract_metadata(signed_msd)["inputs"][0]["hash"]
tampered_A = {**receipt_A, "amount": 9999.99}

print("recorded input hash            :", recorded[:32])
print("recompute from genuine receipt :", msd.content_hash(receipt_A)["hash"][:32])
print("   match:", recorded == msd.content_hash(receipt_A)["hash"])
print()
print("recompute from TAMPERED receipt:", msd.content_hash(tampered_A)["hash"][:32])
print("   match:", recorded == msd.content_hash(tampered_A)["hash"])
```

    recorded input hash            : 5e8af54d1baee5db4a008d5301e22780
    recompute from genuine receipt : 5e8af54d1baee5db4a008d5301e22780
       match: True
    
    recompute from TAMPERED receipt: 6e5b36e7b0b0fc872bd339040d25738d
       match: False


⚠️ **Read that result carefully, because it is easy to overclaim.**

The re-check worked — but **the SDK did not do it**. `msd.verify()` returned only
signature facts (§5); the comparison above is *my own code* calling `content_hash()` and
comparing strings. A C2PA verifier could write exactly the same logic.

What MSD actually provides is the **primitive**: `content_hash()` is a structure-aware
BLAKE3 Merkle hash over arbitrary in-memory Python data, so an input that was never a file
— a dict, an intermediate JSON record — has a stable identity. C2PA's hashing is
asset-bytes-oriented; `c2pa.hash.data` hashes a file.

**That is a real difference, and it is one primitive, not a feature.** Everything built on
top of it is unbuilt in both systems.

## 7. ⚠️ Attestation vs proof

Ulf's phrasing is *"verify that that is the result"*; Josh's is *"prove the linking"*.
Both overshoot what is achievable, and §2 demonstrated why.

Signing `hash(inputs) ‖ function_id ‖ hash(output)` is an **attestation**: it proves the
signer *said* the computation happened. It does not prove it was performed, nor that the
output is correct — the forged record in §2 signs and validates exactly as cleanly as the
honest one.

Actually *proving* an operation requires one of:

- **verifiable computation** (ZK proofs) — cryptographic evidence the function ran
- **a trusted execution environment** — hardware attestation of the code path
- **deterministic re-execution** by the verifier — only works if the operation is
  deterministic

Ulf's own examples are OCR and LLM calls, which are **non-deterministic**. Re-execution
cannot work there, so that use case is permanently in attestation territory.

**The honest claim** is that MSD can make a derivation graph *verifiably tamper-evident
and structurally explicit* — not that it proves the computation. The team has already had
to retract two overclaims ("C2PA is closed source", "C2PA can't do human edits"); this is
the third one queued up.

## 8. Verdict


```python
rows = [
    ("express an operation record",      "yes, lossless",     "yes, in metadata"),
    ("record validates as signed",       "yes",               "yes"),
    ("FORGED record also validates",     "yes",               "yes"),
    ("schema enforcement",               "none",              "none"),
    ("operation primitive in the SDK",   "none",              "none"),
    ("verifier resolves inputs",         "no",                "no (caller code)"),
    ("hash arbitrary non-file data",     "no (asset bytes)",  "YES (content_hash)"),
    ("SDK verifies the computation",     "no",                "no"),
]
print(f"{'':34}{'C2PA':<22}{'MSD'}")
print("-" * 76)
for a, b, c_ in rows: print(f"{a:34}{b:<22}{c_}")
```

                                      C2PA                  MSD
    ----------------------------------------------------------------------------
    express an operation record       yes, lossless         yes, in metadata
    record validates as signed        yes                   yes
    FORGED record also validates      yes                   yes
    schema enforcement                none                  none
    operation primitive in the SDK    none                  none
    verifier resolves inputs          no                    no (caller code)
    hash arbitrary non-file data      no (asset bytes)      YES (content_hash)
    SDK verifies the computation      no                    no


### What this means

**The Turing-complete objection is largely correct.** C2PA carries the operation record
losslessly, and "ease of adding context data" — Josh's phrase for MSD's advantage — does
not survive testing: adding custom JSON to a C2PA assertion is equally easy and equally
lossless.

**What survives is narrow and specific:**

1. `content_hash()` gives stable identity to **data that was never a file**. In Staple's
   pipeline the intermediate records — an extraction result, a reconciliation row — are
   dicts, not assets. C2PA has no way to bind those.
2. MSD embeds into the document formats Staple actually ships; C2PA's open-source tooling
   does not (`WEEK2_FINDINGS.md`).

**What does not survive:** any claim that MSD *supports* verifiable computational
operations. It does not. Neither does C2PA. Neither SDK has an operation concept at all,
and both will sign a fabricated record without complaint.

### The better answer to the objection

The drafted answer from the Week 4 notes holds up, with §3 as its evidence:

> C2PA's custom assertion gives you a container and a PKI. It gives you no schema, no
> semantics, no verifier support, and no ecosystem for computational provenance. If you
> have to define the data model, the verification logic and the tooling yourself, you have
> written a new standard that happens to be wrapped in JUMBF — and inherited C2PA's CA
> cost and media-only format support in exchange for nothing.

The `{"operation": 42, "banana": true}` result is what makes that concrete rather than
rhetorical. But note the same sentence is true of MSD today: it also has no schema, no
verifier support, and no ecosystem. **The argument is a roadmap, not a current
differentiator** — and it should be presented that way.
