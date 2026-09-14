# in-toto vs MSD: the Policy Layer

**MSI5006 capstone — Team 3S × Staple AI**

Ulf, 09-04, describing MSD's intended differentiator:

> "you want to be able to specify the exact computational operation... together with the
> input data, and **verify that that is the result**... the crucial point especially in the
> space of accounting is the ability to go further and say the actual computation, than just
> the parent child relationship."

Now compare **in-toto**, published in 2019 (Torres-Arias et al., USENIX Security),
CNCF-graduated, with multiple production implementations. Its `link` metadata attests:

> *this artifact was produced by **this step**, from **these materials**, by **this
> functionary***

That is Ulf's description almost word for word, applied to software supply chains instead of
accounting. If MSD's pitch is verifiable computational provenance and in-toto goes
unaddressed, it is the first question a reviewer asks.

This notebook builds the AML pipeline in in-toto and finds the one capability that is
genuinely absent from both MSD and C2PA.

| § | Question |
|---|---|
| 1 | Modelling the AML pipeline with multiple signers |
| 2 | The layout — a signed policy document |
| 3 | Verification |
| 4 | ⚠️ The attack that MSD and C2PA both miss |
| 5 | What in-toto does *not* do |
| 6 | Head-to-head |

Companions: `computational_operation_demo.ipynb`, `w3c_vc_comparison.ipynb`,
`provenance_graph_demo.ipynb`, `aml_use_case_demo.ipynb`.

## 1. The AML pipeline, with separate signers

The crucial design choice: **each step is signed by a different party.** This is what
answers Josh's single-file limiting case — provenance across parties, not one vendor's
internal log.


```python
# pip install in-toto
import json, os, shutil, tempfile
from pathlib import Path

from securesystemslib.signer import CryptoSigner
from in_toto.models.layout import Layout, Step
from in_toto.models.metadata import Envelope
from in_toto import runlib
from in_toto.verifylib import in_toto_verify
from in_toto.exceptions import RuleVerificationError

import in_toto
print("in-toto:", getattr(in_toto, "__version__", "3.x"))

WORK = Path.cwd() / "intoto_out"
shutil.rmtree(WORK, ignore_errors=True); WORK.mkdir(exist_ok=True)
os.chdir(WORK)          # in_toto_run writes .link files to cwd

def key_dict(pk):
    """in-toto's verify API wants the keyid inside the dict."""
    d = pk.to_dict(); d["keyid"] = pk.keyid; return d
```

    in-toto: 3.1.0



```python
# Three distinct parties — this is the point
extractor  = CryptoSigner.generate_ecdsa()   # Staple's OCR service
reconciler = CryptoSigner.generate_ecdsa()   # the reconciliation engine
owner      = CryptoSigner.generate_ecdsa()   # the bank, who defines the policy

for name, s in (("extractor", extractor), ("reconciler", reconciler), ("owner", owner)):
    print(f"  {name:11} keyid {s.public_key.keyid[:24]}")
```

      extractor   keyid 7b1b2e479b45e75ee5da6a1f
      reconciler  keyid 92884652f056e7b84fb02a47
      owner       keyid 80a53ecea758f9ef8ee2938c



```python
# The source document entering the pipeline
Path("receipt.json").write_text(json.dumps({"doc": "receipt-001", "amount": 12340.50}))

EXTRACT = ["python3", "-c",
    "import json;d=json.load(open('receipt.json'));"
    "json.dump({'invoice':'INV-8842','total':d['amount']},open('extracted.json','w'))"]
RECONCILE = ["python3", "-c",
    "import json;d=json.load(open('extracted.json'));"
    "json.dump({'status':'Not Reconciled','total':d['total']},open('report.json','w'))"]

runlib.in_toto_run(name="extract", material_list=["receipt.json"],
                   product_list=["extracted.json"], link_cmd_args=EXTRACT, signer=extractor)
runlib.in_toto_run(name="reconcile", material_list=["extracted.json"],
                   product_list=["report.json"], link_cmd_args=RECONCILE, signer=reconciler)

print("link metadata produced:")
for f in sorted(Path(".").glob("*.link")):
    print("   ", f.name)
```

    link metadata produced:
        extract.7b1b2e47.link
        reconcile.92884652.link



```python
# What is actually inside a link file?
link = json.loads(sorted(Path(".").glob("extract.*.link"))[0].read_text())
print("envelope keys:", list(link))
payload = link["signed"]                      # classic signed/signatures format
print()
for k in ("_type", "name", "command"):
    print(f"{k:12}:", json.dumps(payload.get(k))[:90])
print(f"{'materials':12}:", json.dumps(payload.get("materials"))[:110])
print(f"{'products':12}:", json.dumps(payload.get("products"))[:110])
print()
print("signed by keyid:", link["signatures"][0]["keyid"][:32])
```

    envelope keys: ['signatures', 'signed']
    
    _type       : "link"
    name        : "extract"
    command     : ["python3", "-c", "import json;d=json.load(open('receipt.json'));json.dump({'invoice':'INV
    materials   : {"receipt.json": {"sha256": "e644c4c5325f7bd106873813c34e8f955dd76d6ef907185e74d1648b0114e305"}}
    products    : {"extracted.json": {"sha256": "ed1f584289417d69879134291cd5442b2928fe924be761114816970779389fd3"}}
    
    signed by keyid: 7b1b2e479b45e75ee5da6a1fd6cf6a59


Each link records **materials** (inputs) and **products** (outputs) by cryptographic hash,
the command that ran, and is signed by the functionary who performed the step. So far this
is comparable to what we hand-rolled for MSD in `provenance_graph_demo.ipynb`.

The difference comes next.

## 2. The layout — a signed policy document

This has **no counterpart in MSD or C2PA.** The layout is signed by the project owner and
declares what a *legitimate* pipeline looks like: which steps must run, who may perform
each, and what each may consume and produce.


```python
layout = Layout()
layout.set_relative_expiration(months=1)

s1 = Step(name="extract")
s1.pubkeys = [extractor.public_key.keyid]                    # only the extractor may sign
s1.expected_materials = [["ALLOW", "receipt.json"], ["DISALLOW", "*"]]
s1.expected_products  = [["ALLOW", "extracted.json"], ["DISALLOW", "*"]]

s2 = Step(name="reconcile")
s2.pubkeys = [reconciler.public_key.keyid]                   # only the reconciler may sign
# THE KEY CONSTRAINT — reconcile may only consume what extract actually produced
s2.expected_materials = [["MATCH", "extracted.json", "WITH", "PRODUCTS", "FROM", "extract"],
                         ["DISALLOW", "*"]]
s2.expected_products  = [["ALLOW", "report.json"], ["DISALLOW", "*"]]

layout.steps = [s1, s2]
layout.keys = {k.keyid: key_dict(k) for k in (extractor.public_key, reconciler.public_key)}

envelope = Envelope.from_signable(layout)
envelope.create_signature(owner)

print("steps           :", layout.get_step_name_list())
print("authorised keys :", len(layout.keys))
print("expires         :", layout.expires)
```

    steps           : ['extract', 'reconcile']
    authorised keys : 2
    expires         : 2026-10-14T16:00:42Z


Read the `MATCH` rule carefully — it is the whole argument:

```
["MATCH", "extracted.json", "WITH", "PRODUCTS", "FROM", "extract"]
```

*"The file `reconcile` consumes must be byte-identical to the file `extract` produced."*
Enforced at verification time, across two mutually untrusting parties, by a policy a third
party signed.

## 3. Verification


```python
in_toto_verify(envelope, {owner.public_key.keyid: key_dict(owner.public_key)})
print(">>> VERIFICATION PASSED")
print("    2 steps, 2 different signers, MATCH rule satisfied")
```

    Run command '['python3', '-c', "import json;d=json.load(open('receipt.json'));json.dump({'invoice':'INV-8842','total':d['amount']},open('extracted.json','w'))"]' differs from expected command '[]'


    Run command '['python3', '-c', "import json;d=json.load(open('extracted.json'));json.dump({'status':'Not Reconciled','total':d['total']},open('report.json','w'))"]' differs from expected command '[]'


    >>> VERIFICATION PASSED
        2 steps, 2 different signers, MATCH rule satisfied


(The `Run command ... differs from expected command '[]'` warnings above are cosmetic — we
left `expected_command` unset on the steps, so in-toto notes the mismatch without failing.)

## 4. ⚠️ The attack that MSD and C2PA both miss

Now the test that matters. An attacker substitutes the intermediate file **between** the two
steps — the extraction result is replaced before reconciliation consumes it.

In `computational_operation_demo.ipynb` §2 we showed that **both C2PA and MSD sign a forged
operation record without complaint.** Does in-toto?


```python
shutil.rmtree(WORK / "attack", ignore_errors=True)
(WORK / "attack").mkdir()
os.chdir(WORK / "attack")

ex2 = CryptoSigner.generate_ecdsa(); rc2 = CryptoSigner.generate_ecdsa()
ow2 = CryptoSigner.generate_ecdsa()

Path("receipt.json").write_text(json.dumps({"doc": "receipt-001", "amount": 12340.50}))
runlib.in_toto_run(name="extract", material_list=["receipt.json"],
                   product_list=["extracted.json"], link_cmd_args=EXTRACT, signer=ex2)

# *** THE ATTACK: swap the intermediate before step 2 runs ***
Path("extracted.json").write_text(json.dumps({"invoice": "INV-8842", "total": 999999.99}))
print("*** substituted extracted.json: total 12340.50 -> 999999.99 ***")

runlib.in_toto_run(name="reconcile", material_list=["extracted.json"],
                   product_list=["report.json"], link_cmd_args=RECONCILE, signer=rc2)
print("    both steps signed successfully — the signatures themselves are valid")
```

    *** substituted extracted.json: total 12340.50 -> 999999.99 ***
        both steps signed successfully — the signatures themselves are valid



```python
lay2 = Layout(); lay2.set_relative_expiration(months=1)
a1 = Step(name="extract"); a1.pubkeys = [ex2.public_key.keyid]
a1.expected_materials = [["ALLOW", "receipt.json"], ["DISALLOW", "*"]]
a1.expected_products  = [["ALLOW", "extracted.json"], ["DISALLOW", "*"]]
a2 = Step(name="reconcile"); a2.pubkeys = [rc2.public_key.keyid]
a2.expected_materials = [["MATCH", "extracted.json", "WITH", "PRODUCTS", "FROM", "extract"],
                         ["DISALLOW", "*"]]
a2.expected_products  = [["ALLOW", "report.json"], ["DISALLOW", "*"]]
lay2.steps = [a1, a2]
lay2.keys = {k.keyid: key_dict(k) for k in (ex2.public_key, rc2.public_key)}

env2 = Envelope.from_signable(lay2); env2.create_signature(ow2)

try:
    in_toto_verify(env2, {ow2.public_key.keyid: key_dict(ow2.public_key)})
    print(">>> PASSED — attack NOT detected")
except RuleVerificationError as e:
    print(">>> REJECTED")
    print("   ", str(e).splitlines()[0][:110])
```

    Run command '['python3', '-c', "import json;d=json.load(open('receipt.json'));json.dump({'invoice':'INV-8842','total':d['amount']},open('extracted.json','w'))"]' differs from expected command '[]'


    Run command '['python3', '-c', "import json;d=json.load(open('extracted.json'));json.dump({'status':'Not Reconciled','total':d['total']},open('report.json','w'))"]' differs from expected command '[]'


    >>> REJECTED
        'DISALLOW *' matched the following artifacts: ['extracted.json']


**Rejected.**

Note precisely *why*. Every signature in that pipeline is cryptographically valid — the
extractor really signed its link, the reconciler really signed its own. A signature-only
system sees nothing wrong, which is exactly what we demonstrated for MSD and C2PA.

What fails is the **policy**: the hash of the file `reconcile` consumed does not match the
hash of the file `extract` produced, so the `MATCH` rule is violated and the `DISALLOW *`
fallback catches the orphaned artifact.

This is the substantive gap. MSD and C2PA both answer *"was this signed, and by whom?"*
in-toto additionally answers *"was this the pipeline that was supposed to run?"*

## 5. What in-toto does *not* do

For a fair comparison, the limits matter as much as the capability.

- **No embedding.** Links and layouts are *separate files* — `.link`, `.layout`. Nothing is
  written inside the artifact. The recipient must be handed the artifact *and* its metadata
  and keep them together, which is precisely the objection Josh raised against W3C VC.
- **Artifact-oriented, not value-oriented.** Materials and products are files identified by
  path and hash. It has no concept of a field within a document, so "which inputs produced
  *this cell*" is out of scope.
- **Requires a pre-declared policy.** The layout must be written and signed *before*
  verification. That suits a repeatable build pipeline; it fits less naturally where the
  processing graph is discovered per document.
- **Non-deterministic steps.** Like everything else in this space, it attests that a step
  ran and what it consumed and produced — it cannot prove an OCR or LLM call was performed
  correctly. The attestation-vs-proof boundary from
  `computational_operation_demo.ipynb` §7 applies here too.

## 6. Head-to-head


```python
rows = [
    ("expresses a derivation edge",        "yes (link)",        "hand-rolled",    "yes (ingredients)"),
    ("multi-party signing",                "yes (functionary)", "yes",            "yes"),
    ("detects a substituted intermediate", "YES (MATCH)",       "no",             "no"),
    ("signed policy / expected pipeline",  "YES (layout)",      "none",           "none"),
    ("verifier tooling",                   "in-toto-verify",    "none",           "c2patool"),
    ("embeds into the artifact",           "NO (side files)",   "YES",            "yes (media/Office)"),
    ("field-level granularity",            "no (file-level)",   "yes",            "no"),
    ("identity model",                     "keyid / owner sig", "self-asserted",  "X.509 + trust list"),
    ("standardisation",                    "CNCF graduated",    "one vendor",     "ISO + C2PA"),
]
print(f"{'':36}{'in-toto':<20}{'MSD':<17}{'C2PA'}")
print("-" * 88)
for r in rows:
    print(f"{r[0]:36}{r[1]:<20}{r[2]:<17}{r[3]}")
```

                                        in-toto             MSD              C2PA
    ----------------------------------------------------------------------------------------
    expresses a derivation edge         yes (link)          hand-rolled      yes (ingredients)
    multi-party signing                 yes (functionary)   yes              yes
    detects a substituted intermediate  YES (MATCH)         no               no
    signed policy / expected pipeline   YES (layout)        none             none
    verifier tooling                    in-toto-verify      none             c2patool
    embeds into the artifact            NO (side files)     YES              yes (media/Office)
    field-level granularity             no (file-level)     yes              no
    identity model                      keyid / owner sig   self-asserted    X.509 + trust list
    standardisation                     CNCF graduated      one vendor       ISO + C2PA


### What this means for the project

**On the "graph" axis (Ulf's option (a)), MSD is not competitive today.** in-toto has a
signed policy layer, multi-party functionaries, and enforcement that catches an attack both
MSD and C2PA sign happily — published 2019, CNCF-graduated. MSD has **no graph or operation
primitive at all** (`computational_operation_demo.ipynb` §5). Competing there means an
unbuilt feature against a mature standard.

**What in-toto does not take is the embedding axis (option (b)).** Its links are side files,
by design. So the honest positioning is unchanged from Week 5: MSD's distinct ground is
provenance carried *inside* the business document, which neither in-toto nor W3C VC attempts
and which C2PA still cannot do for PDF.

**The idea worth stealing:** the layout. A signed statement of *what the pipeline should be*
is cheap to add — it is a hash-comparison policy, not new cryptography — and it is the
difference between "Staple says this happened" and "this matches the process the bank
approved." That is a concrete, defensible answer to Josh's *"trust me, bro"* characterisation
of the current implementation.

**For the literature review**, in-toto is the strongest citation available: Torres-Arias,
S., Awwad, T., Cappos, J., et al. (2019). *in-toto: Providing farm-to-table guarantees for
bits and bytes.* USENIX Security Symposium.
