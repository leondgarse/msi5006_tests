# W3C Verifiable Credentials vs MSD

**MSI5006 capstone — Team 3S × Staple AI**

CONTEXT.md lists this as the strongest expected challenge, and nobody had prepared for it:

> **Benchmark vs W3C Verifiable Credentials** — JSON-native, W3C Rec, signed structured
> claims. Strongest expected challenge.

If MSD's differentiator is the **graph** rather than the **embedding** (the protocol author's 08-28 scope
correction), then C2PA stops being the right comparison and VC becomes the closest
collision. Both sign structured JSON. Both express derivation. One is a W3C
Recommendation with an ecosystem behind it.

This notebook runs VC for real and answers, honestly: **what does MSD do that VC does not?**

| § | Question |
|---|---|
| 1 | Setup — is there even a working tool? |
| 2 | Issue and verify a credential |
| 3 | Does it survive tampering? |
| 4 | Can it carry our OCR data losslessly? |
| 5 | Dependency chains — the graph question |
| 6 | Does it work offline? |
| 7 | Selective disclosure — VC's claimed advantage |
| 8 | Head-to-head, and the honest verdict |

Companion notebooks: `c2pa_demo.ipynb` (embedding), a companion notebook (graph).

## 1. Setup

`didkit` is SpruceID's Rust implementation of the VC data model, shipped as a Python
wheel. No build step, no Node, no network.


```python
# pip install didkit
import json, asyncio, hashlib, io, contextlib
import didkit

print("didkit version:", didkit.get_version())
print()
print("API:", [n for n in dir(didkit) if not n.startswith("_")])
```

    didkit version: 0.3.3
    
    API: ['DIDKitException', 'dereference_did_url', 'did_auth', 'didkit', 'generate_ed25519_key', 'get_version', 'issue_credential', 'issue_presentation', 'key_to_did', 'key_to_verification_method', 'resolve_did', 'verify_credential', 'verify_presentation']


Note everything is `async`. In a notebook we `await` directly; in a script wrap with
`asyncio.run()`.


```python
key = didkit.generate_ed25519_key()
did = didkit.key_to_did("key", key)
vm  = await didkit.key_to_verification_method("key", key)

print("issuer DID :", did)
print("key id     :", vm)
print()
print("key material (JWK):")
print(json.dumps({k: (v[:12] + "..." if isinstance(v, str) and len(v) > 12 else v)
                  for k, v in json.loads(key).items()}, indent=2))
```

    issuer DID : did:key:z6MksMoepyh7UCZ6ARhmvAcGXbfFg99wJbU2vNN3UtAZBeLA
    key id     : did:key:z6MksMoepyh7UCZ6ARhmvAcGXbfFg99wJbU2vNN3UtAZBeLA#z6MksMoepyh7UCZ6ARhmvAcGXbfFg99wJbU2vNN3UtAZBeLA
    
    key material (JWK):
    {
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "v8IvFnbMvRzz...",
      "d": "j37PzOwxDyRN..."
    }


**Ed25519 — the same signature primitive MSD uses.** The cryptography is not the
differentiator between these two systems; the surrounding model is.

The `did:key:` identifier is worth noticing: the public key *is* the identity. No
registry, no lookup, resolvable offline. Compare MSD, where `signature_is_trusted` is
hardcoded `False` because identity is unimplemented.

## 2. Issue and verify a credential

The Staple shape: an extracted invoice record, signed by whoever extracted it.


```python
CTX = ["https://www.w3.org/2018/credentials/v1",
       {"@vocab": "https://staple.example/ns#"}]   # see the note below on why

def credential(subject, evidence=None):
    c = {"@context": CTX,
         "type": ["VerifiableCredential"],
         "issuer": did,
         "issuanceDate": "2026-09-02T00:00:00Z",
         "credentialSubject": subject}
    if evidence:
        c["evidence"] = evidence
    return c

opts = json.dumps({"proofPurpose": "assertionMethod", "verificationMethod": vm})

invoice = {"id": "urn:invoice:INV-8842",
           "supplier": "Acme Trading Pte Ltd",
           "total": 12340.50,
           "currency": "SGD",
           "po_ref": "PO-5521"}

signed = await didkit.issue_credential(json.dumps(credential(invoice)), opts, key)
doc = json.loads(signed)

print(json.dumps(doc, indent=2))
```

    {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        {
          "@vocab": "https://staple.example/ns#"
        }
      ],
      "type": [
        "VerifiableCredential"
      ],
      "credentialSubject": {
        "id": "urn:invoice:INV-8842",
        "total": 12340.5,
        "currency": "SGD",
        "supplier": "Acme Trading Pte Ltd",
        "po_ref": "PO-5521"
      },
      "issuer": "did:key:z6MksMoepyh7UCZ6ARhmvAcGXbfFg99wJbU2vNN3UtAZBeLA",
      "issuanceDate": "2026-09-02T00:00:00Z",
      "proof": {
        "type": "Ed25519Signature2018",
        "proofPurpose": "assertionMethod",
        "verificationMethod": "did:key:z6MksMoepyh7UCZ6ARhmvAcGXbfFg99wJbU2vNN3UtAZBeLA#z6MksMoepyh7UCZ6ARhmvAcGXbfFg99wJbU2vNN3UtAZBeLA",
        "created": "2026-09-02T12:27:52.939Z",
        "jws": "eyJhbGciOiJFZERTQSIsImNyaXQiOlsiYjY0Il0sImI2NCI6ZmFsc2V9..j96_UXwZ3koRY29YTF_wqc83SpKgbk5MsOtTN7k7Lixrl_V43-8MCWoq9NDNDTK_62xOoP-Wa3gUqifweZqxBA"
      }
    }



```python
result = await didkit.verify_credential(signed, json.dumps({"proofPurpose": "assertionMethod"}))
print("verify:", result)
```

    verify: {"checks":["proof"],"warnings":[],"errors":[]}


`{"checks":["proof"],"warnings":[],"errors":[]}` — a clean verification.

The `proof` block is the whole trust story in one object: signature suite, the
`verificationMethod` that resolves to a public key, a creation timestamp, and a detached
JWS. Everything a verifier needs travels with the credential.

### ⚠️ The JSON-LD gotcha

That `{"@vocab": ...}` in the context is not decoration. Without it, undefined terms fail:


```python
bad = {"@context": ["https://www.w3.org/2018/credentials/v1"],   # base context only
       "type": ["VerifiableCredential"], "issuer": did,
       "issuanceDate": "2026-09-02T00:00:00Z",
       "credentialSubject": {"id": "urn:invoice:INV-8842",
                             "supplier": "Acme"}}   # 'supplier' is not a defined term
try:
    await didkit.issue_credential(json.dumps(bad), opts, key)
    print("issued")
except Exception as e:
    print("REFUSED:", str(e)[:90])
```

    REFUSED: Expansion failed: Expansion failed: Key expansion failed


VC will not sign vocabulary it cannot resolve. That is stricter than MSD, which accepts
any free-form dict as `metadata`.

Read it either way, but state it honestly: it is **ergonomic friction** that buys **schema
discipline**. MSD's known gap is that `metadata` has "no convention, no validation" — VC
makes that impossible by construction. For an auditability product, being unable to sign
undefined fields is arguably the right default.

## 3. Tamper detection


```python
tampered = json.loads(signed)
tampered["credentialSubject"]["total"] = 99999.99      # inflate the invoice

res = json.loads(await didkit.verify_credential(json.dumps(tampered),
                                                json.dumps({"proofPurpose": "assertionMethod"})))
print("errors:", res["errors"])
print()
print("tamper detected:", len(res["errors"]) > 0)
```

    errors: ['signature error: Verification equation was not satisfied']
    
    tamper detected: True


## 4. Can VC carry our OCR data losslessly?

This is where C2PA fails badly. §5 of `c2pa_demo.ipynb` shows JSON→CBOR coercion
silently destroying numeric arrays: `[1,2,3,256]` → 256 becomes 0, `[1.5,2.5]` vanishes,
and OCR bounding boxes are lost — while the file still reports `Valid`.

Same payload through VC:


```python
probe = {"id": "urn:probe:1",
         "bbox":       [420, 164, 35, 24],    # a real OCR bounding box
         "floats":     [1.5, 2.5],
         "over_255":   [1, 2, 3, 256],
         "negatives":  [-1, 2, 3],
         "nested":     {"inner": [10, 20, 30]},
         "unicode":    "日本語 🔏 café"}

vc = await didkit.issue_credential(json.dumps(credential(probe)), opts, key)
back = json.loads(vc)["credentialSubject"]

print(f"{'field':12} {'sent':28} {'received':28} ok")
print("-" * 78)
for k, v in probe.items():
    if k == "id": continue
    g = back.get(k, "<<MISSING>>")
    print(f"{k:12} {json.dumps(v, ensure_ascii=False)[:26]:28} "
          f"{json.dumps(g, ensure_ascii=False)[:26]:28} {'OK' if v == g else 'XX'}")

print()
print("fully lossless:", all(back.get(k) == v for k, v in probe.items()))
print("still verifies:", json.loads(await didkit.verify_credential(
    vc, json.dumps({"proofPurpose": "assertionMethod"})))["errors"] == [])
```

    field        sent                         received                     ok
    ------------------------------------------------------------------------------
    bbox         [420, 164, 35, 24]           [420, 164, 35, 24]           OK
    floats       [1.5, 2.5]                   [1.5, 2.5]                   OK
    over_255     [1, 2, 3, 256]               [1, 2, 3, 256]               OK
    negatives    [-1, 2, 3]                   [-1, 2, 3]                   OK
    nested       {"inner": [10, 20, 30]}      {"inner": [10, 20, 30]}      OK
    unicode      "日本語 🔏 café"                 "日本語 🔏 café"                 OK
    
    fully lossless: True
    still verifies: True


**Everything survives.** No string-wrapping workaround, no silent corruption, no
`json.dumps` discipline required. VC signs JSON as JSON.

This is a straightforward win over C2PA for our use case, and a tie with MSD.

## 5. Dependency chains — the graph question

a companion notebook built MSD's chain by hand, because the SDK has **no linking
primitive**: we invented a `derived_from` convention on top of `content_hash`.

VC has this **in the specification**. The `evidence` property exists precisely to record
what a credential was derived from.


```python
def h(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True).encode()).hexdigest()

# n1 — the field capture
receipt = {"id": "urn:receipt:001", "doc_id": "receipt-001",
           "supplier": "Acme Trading Pte Ltd", "amount": 12340.50,
           "captured_by": "driver-7734"}
h1 = h(receipt)
n1 = await didkit.issue_credential(json.dumps(credential(receipt)), opts, key)

# n2 — extraction, citing n1 as evidence
n2 = await didkit.issue_credential(json.dumps(credential(
        {"id": "urn:invoice:INV-8842", "invoice_no": "INV-8842", "total": 12340.50},
        evidence=[{"id": "urn:receipt:001", "type": ["DerivedFrom"], "contentHash": h1}])),
     opts, key)

# n3 — quarterly aggregate, citing n2
h2 = h(json.loads(n2)["credentialSubject"])
n3 = await didkit.issue_credential(json.dumps(credential(
        {"id": "urn:report:2026Q3", "quarter": "2026-Q3", "total_payables": 12340.50},
        evidence=[{"id": "urn:invoice:INV-8842", "type": ["DerivedFrom"], "contentHash": h2}])),
     opts, key)

for name, vcdoc in (("n1 receipt", n1), ("n2 extracted", n2), ("n3 aggregate", n3)):
    d = json.loads(vcdoc)
    ev = d.get("evidence", [{}])[0].get("id", "(root)")
    ok = json.loads(await didkit.verify_credential(
        vcdoc, json.dumps({"proofPurpose": "assertionMethod"})))["errors"] == []
    print(f"  {name:13} verified={ok}   derived_from: {ev}")
```

      n1 receipt    verified=True   derived_from: (root)
      n2 extracted  verified=True   derived_from: urn:receipt:001
      n3 aggregate  verified=True   derived_from: urn:invoice:INV-8842



```python
# Does the edge bind? Tamper the receipt after n2 was issued.
tampered_receipt = dict(receipt); tampered_receipt["amount"] = 99999.99
recorded = json.loads(n2)["evidence"][0]["contentHash"]

print("recorded parent hash :", recorded[:40])
print("tampered parent hash :", h(tampered_receipt)[:40])
print()
print("ancestor tamper detected:", h(tampered_receipt) != recorded)
print("n2's own signature still valid:", json.loads(await didkit.verify_credential(
    n2, json.dumps({"proofPurpose": "assertionMethod"})))["errors"] == [])
```

    recorded parent hash : 05564a715a258f40d158bf0be60a96273f2daed1
    tampered parent hash : 2320ef766e9b66a49f66fcac80a01549e3c117e1
    
    ancestor tamper detected: True
    n2's own signature still valid: True


Identical behaviour to MSD's hand-rolled chain — and identical to what C2PA **cannot** do
(§6 of a companion notebook: a C2PA child still reports `Valid` after its
ancestor is tampered, because ingredients record ingest-time results).

The difference from MSD is provenance of the *design*: `evidence` is a standard property
with defined semantics, not a convention we invented last week.

## 6. Does it work offline?

Critical for Staple. MSD's dict `embed()` panics without a network service on ports
27021–27040 — the "no network" claim does not hold for that path.

JSON-LD is often assumed to need network fetches for `@context` URLs. Test it by making
outbound sockets impossible.


```python
import socket

class NetworkBlocked(Exception):
    pass

_real_connect, _real_create = socket.socket.connect, socket.create_connection
socket.socket.connect = lambda *a, **k: (_ for _ in ()).throw(NetworkBlocked())
socket.create_connection = lambda *a, **k: (_ for _ in ()).throw(NetworkBlocked())

try:
    off = await didkit.issue_credential(json.dumps(credential(invoice)), opts, key)
    r = json.loads(await didkit.verify_credential(off, json.dumps({"proofPurpose": "assertionMethod"})))
    print("issue offline  : OK")
    print("verify offline :", "OK" if r["errors"] == [] else r["errors"])
except NetworkBlocked:
    print("FAILED — needed the network")
finally:
    socket.socket.connect, socket.create_connection = _real_connect, _real_create
```

    issue offline  : OK
    verify offline : OK


Fully offline. The standard contexts are cached inside the binary, so no `@context` URL is
ever dereferenced. Better than MSD on this axis, where one core path hard-requires a
service.

## 7. Selective disclosure

the protocol author's requirement: expose the subgraph one auditor needs, without handing over everything.

VC's canonical answer is **BBS+** (`BbsBlsSignature2020`), which allows proving statements
about fields you do not reveal. Is it actually available here?


```python
for suite in ["Ed25519Signature2018", "Ed25519Signature2020",
              "JsonWebSignature2020", "BbsBlsSignature2020"]:
    o = json.dumps({"proofPurpose": "assertionMethod", "verificationMethod": vm, "type": suite})
    try:
        await didkit.issue_credential(json.dumps(credential({"id": "urn:x"})), o, key)
        print(f"  {suite:24} available")
    except Exception as e:
        print(f"  {suite:24} NOT available — {str(e)[:52]}")
```

      Ed25519Signature2018     available
      Ed25519Signature2020     available
      JsonWebSignature2020     available
      BbsBlsSignature2020      NOT available — unknown variant `BbsBlsSignature2020`, expected one 


**BBS+ is not in didkit 0.3.3.** So VC's strongest theoretical advantage is *spec-level,
not tool-level* — reaching it needs a separate BBS+ library or SD-JWT.

Report this precisely. "VC does selective disclosure properly" is true of the standard and
false of the tooling we can install today. That is the same distinction we drew for
C2PA-in-PDF: the standard permits it, the open-source tool does not implement it.

What *is* available today is the same commitment-based disclosure MSD offers — hand over a
subset of credentials, each independently verifiable, with hashes proving a withheld
parent exists:


```python
disclosed = {"extraction": n2}          # withhold n1: driver identity, capture details
withheld_hash = json.loads(n2)["evidence"][0]["contentHash"]

for name, vcdoc in disclosed.items():
    ok = json.loads(await didkit.verify_credential(
        vcdoc, json.dumps({"proofPurpose": "assertionMethod"})))["errors"] == []
    print(f"  {name}: independently verifiable = {ok}")

print()
print("  auditor sees a source exists  :", withheld_hash[:32])
print("  auditor learns driver identity:", "no")
print()
print("  >>> commitment-based disclosure: proves a parent exists and can be checked")
print("  >>> if produced later. Not zero-knowledge; the graph shape still leaks.")
```

      extraction: independently verifiable = True
    
      auditor sees a source exists  : 05564a715a258f40d158bf0be60a9627
      auditor learns driver identity: no
    
      >>> commitment-based disclosure: proves a parent exists and can be checked
      >>> if produced later. Not zero-knowledge; the graph shape still leaks.


## 8. Head-to-head


```python
rows = [
    ("signs structured JSON",          "yes",              "yes",            "no"),
    ("lossless numeric arrays",        "yes",              "yes",            "NO — corrupts"),
    ("signature primitive",            "Ed25519",          "Ed25519",        "ECDSA/RSA-PSS"),
    ("dependency chain",               "yes — `evidence`", "hand-rolled",    "yes — ingredients"),
    ("re-verify ancestor later",       "yes",              "yes",            "NO"),
    ("works offline",                  "yes",              "partly",         "yes"),
    ("identity / trust model",         "DIDs, resolvable", "NOT implemented","X.509 + trust list"),
    ("selective disclosure",           "spec yes/tool no", "commitment only","no"),
    ("embeds into files",              "NO",               "yes",            "yes (media)"),
    ("standardisation",                "W3C Rec",          "one vendor",     "ISO + C2PA"),
    ("ecosystem",                      "wallets, EU eIDAS","Staple only",    "Adobe, Google, MS"),
]
print(f"{'':30}{'W3C VC':<20}{'MSD':<18}{'C2PA'}")
print("-" * 86)
for r in rows:
    print(f"{r[0]:30}{r[1]:<20}{r[2]:<18}{r[3]}")
```

                                  W3C VC              MSD               C2PA
    --------------------------------------------------------------------------------------
    signs structured JSON         yes                 yes               no
    lossless numeric arrays       yes                 yes               NO — corrupts
    signature primitive           Ed25519             Ed25519           ECDSA/RSA-PSS
    dependency chain              yes — `evidence`    hand-rolled       yes — ingredients
    re-verify ancestor later      yes                 yes               NO
    works offline                 yes                 partly            yes
    identity / trust model        DIDs, resolvable    NOT implemented   X.509 + trust list
    selective disclosure          spec yes/tool no    commitment only   no
    embeds into files             NO                  yes               yes (media)
    standardisation               W3C Rec             one vendor        ISO + C2PA
    ecosystem                     wallets, EU eIDAS   Staple only       Adobe, Google, MS


## The honest verdict

**VC matches or beats MSD on every axis tested here except one.**

It signs structured JSON losslessly, expresses dependency chains as a *standard property*
rather than a convention we invented, re-verifies ancestors, works fully offline, and has
a real identity model — where MSD's `signature_is_trusted` is hardcoded `False` and
`is_endorsed()` raises `NotImplementedError`. It is a W3C Recommendation with an ecosystem
(EU digital identity wallets, education, supply chain) against MSD's "not anywhere right
now. It's in Staple."

**MSD's remaining edge is genuine but narrow:**

1. **File embedding.** VC has none — a credential is a JSON document beside your data, not
   inside your PDF. MSD embeds into PDF, Word, Excel, PowerPoint. If the requirement is
   "the signed artifact must *be* the document the client already has", VC cannot do it
   and MSD can.
2. **In-value carry.** The `__msd` Unicode-steganography key rides inside a JSON object
   through REST, queues and Postgres `jsonb` while staying valid JSON. VC's envelope is a
   separate wrapper you must carry deliberately.

**What this means for the project.** If the differentiator is the graph, we should expect
"why not VC?" and we do not currently have a strong answer — VC does the graph better. If
the differentiator is **embedding provenance into documents that already exist**, MSD has
a real position, and that is also the half C2PA cannot reach for PDF and Office.

That points somewhere specific and worth putting to the sponsor: MSD's defensible ground
is the intersection C2PA and VC both miss — **structured provenance carried inside
business documents** — not the dependency graph, where a W3C Recommendation already exists.

Companion notebooks: `c2pa_demo.ipynb`, a companion notebook.
