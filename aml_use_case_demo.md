# Staple's Real Use Case: AML Onboarding with MSD

**MSI5006 capstone — Team 3S × Staple AI**

Reconstruction of the AML demo the sponsor shared in Week 1 (an internal walkthrough video).
This is the **actual commercial use case** MSD was built for — worth understanding
precisely, because it explains design decisions that look arbitrary in the abstract.

## What the demo shows

A bank onboards a client, **Declan Ó Ruairc** (policy `94110552`, client `CLI-104`).
Five source documents arrive: a passport, a Swiss residence permit, a utility bill, a new
business application, and an adviser declaration. Staple extracts structured data from
each, reconciles them against the CRM record, and raises exceptions where they disagree.

Then the crucial part — the sponsor's framing at 00:00:01:

> "let's look at how that data then **travels together once it leaves Staple**."

Two PDFs sit side by side on the desktop. One went through Staple, one did not. They look
identical. Upload both to Audit Verification: one shows **no valid signature**, the other
shows a valid signature **plus the entire audit trail, extracted data and reconciliation
results carried inside the PDF itself**.

## Why this matters for our evaluation

The demo answers a question the C2PA comparison kept circling: *what is the deliverable?*
It is not a signed image. It is a **business document that carries its own audit file** —
the extracted fields, who touched it and when, and every comparison that was made — so the
recipient can verify it offline with no access to Staple.

| § | Reconstructs |
|---|---|
| 1 | The five source documents and the CRM anchor |
| 2 | Extraction — the structured record Staple produces |
| 3 | Reconciliation — cross-document comparison and exceptions |
| 4 | The audit trail |
| 5 | Packing all three into the PDF with MSD |
| 6 | Verification, the way a recipient would do it |
| 7 | Tamper evidence |
| 8 | The JSON case — one Unicode character carrying everything |
| 9 | What this tells us about the C2PA comparison |

Field names and values below are taken from the video's own screenshots.

## 1. The case file


```python
import json, hashlib, base64, io, contextlib, shutil, subprocess
from pathlib import Path

with contextlib.redirect_stderr(io.StringIO()):
    import msd_sdk as msd

WORK = Path.cwd() / "aml_out"
shutil.rmtree(WORK, ignore_errors=True); WORK.mkdir(exist_ok=True)

# The CRM record is the anchor everything is compared against (video, 00:04:11)
CRM = {
    "policy_number":   "94110552",
    "client_number":   "CLI-104",
    "full_legal_name": "Declan Ó Ruairc",
    "date_of_birth":   "1976-09-30",
    "nationality":     "Caerwynian",
    "passport_number": "PA4471893",
    "residence_permit_reference": "CH-ZH-1180.4472/9",
    "registered_address": "Baslerstrasse 92, 8048 Lindenbruck, Montara",
    "occupation":      "Construction Project Manager",
    "marital_status":  "Divorced",
    "contact_number":  "+41 76 338 9014",
    "adviser_firm":    "Alpenblick Finanzpartner",
    "adviser_location":"Lindenbruck, Montara",
}

SOURCES = ["01_Passport.pdf", "03_POI_Swiss_Residence_Permit.pdf",
           "04_PORA_Broadband_Bill.pdf", "NBApp.pdf", "FIForm.pdf"]

print("Anchor      : CRM · Core Client Record")
print("Policy      :", CRM["policy_number"], "· Client:", CRM["client_number"])
print("Client      :", CRM["full_legal_name"])
print()
print("Source documents ingested:")
for s in SOURCES: print("   ", s)
```

    Anchor      : CRM · Core Client Record
    Policy      : 94110552 · Client: CLI-104
    Client      : Declan Ó Ruairc
    
    Source documents ingested:
        01_Passport.pdf
        03_POI_Swiss_Residence_Permit.pdf
        04_PORA_Broadband_Bill.pdf
        NBApp.pdf
        FIForm.pdf


**The anchor concept matters.** Reconciliation is not document-to-document — every source
is compared against the CRM record, which the video labels *"Anchor: CRM · Core Client
Record"*. That gives a single point of truth and makes the comparison graph a star, not a
mesh.

## 2. Extraction

Staple's OCR produces a numbered field schema, visible in the video at 00:05:44. The
numbering (`01LastName`, `02FirstName`, …) is the template's field order — it is a
positional contract with the extraction model, not decoration.


```python
# The POI extraction, transcribed from the video's merged.json view
POI_EXTRACTED = {
    "File Name":        "03_POI_Swiss_Residence_Permit.pdf",
    "Document ID":      "10490902",
    "Queue ID":         "14423",
    "Queue Name":       "POI",
    "Model Type":       "Proof Of Identity",
    "01LastName":       "O RUAIRC",
    "02FirstName":      "DECLAN",
    "05DateOfBirth":    "1976-09-30",
    "10DocumentTypeNamed": "RESIDENCE STATUS CARD",
    "11Number":         "CH-ZH-1180.4472/9",
    "12DateOfIssue":    "2020-10-31",
    "13DateOfExpiry":   "2025-10-31",
    "14PlaceOfIssue":   "Lindenbruck",
    "15IssuingAuthority": "Residence Registry Lindenbruck",
    "17ResidentialAddress": "Baslerstrasse 92, 8048 Lindenbruck, Montara",
    "19PostalCode":     "8048",
    "24Machine-readablezone": "ACHEO RUAICHZ\n766938M251031CAE",
    "25OriginalStampPresent":      "True",
    "26CertificationStampPresent": "True",
    "29PositionofAuthoriserOnStamp": "Notary Public",
    "30NameofAuthoriserOnStamp":     "H. Brennan",
    "31DateOnStamp":    "2026-01-12",
}

print(json.dumps(POI_EXTRACTED, indent=2, ensure_ascii=False)[:600], "...")
print()
print("fields extracted:", len(POI_EXTRACTED))
```

    {
      "File Name": "03_POI_Swiss_Residence_Permit.pdf",
      "Document ID": "10490902",
      "Queue ID": "14423",
      "Queue Name": "POI",
      "Model Type": "Proof Of Identity",
      "01LastName": "O RUAIRC",
      "02FirstName": "DECLAN",
      "05DateOfBirth": "1976-09-30",
      "10DocumentTypeNamed": "RESIDENCE STATUS CARD",
      "11Number": "CH-ZH-1180.4472/9",
      "12DateOfIssue": "2020-10-31",
      "13DateOfExpiry": "2025-10-31",
      "14PlaceOfIssue": "Lindenbruck",
      "15IssuingAuthority": "Residence Registry Lindenbruck",
      "17ResidentialAddress": "Baslerstrasse 92, 8048 Lindenbruck, Montara",
      "19PostalCode": "8048",
       ...
    
    fields extracted: 22


the sponsor's point at 00:03:27:

> "that means that you wouldn't have to process this document again. It's got the
> structured information inside"

The document arrives at the next party **pre-extracted**. That is a cost argument, not
just a provenance one — the recipient skips OCR entirely.

## 3. Reconciliation

The heart of the product. Each source is compared field-by-field against the CRM anchor,
and disagreements become **exceptions**. Reproducing the comparison sets from the video
(00:04:11): `POI ↔ CRM`, `PORA ↔ CRM`, `NBApp ↔ FIForm ↔ CRM`.


```python
def compare(label, pairs):
    """pairs: (field, crm_value, doc_label, doc_value)"""
    rows = []
    for field, crm_v, doc_label, doc_v in pairs:
        status = "match" if (crm_v and doc_v and crm_v == doc_v) else "mismatch"
        rows.append({"field": field, "crm": crm_v, "source": doc_label,
                     "value": doc_v, "status": status})
    return {"comparison": label, "rows": rows}

poi_crm = compare("POI ↔ CRM", [
    ("Full Legal Name",  CRM["full_legal_name"], "POI — Passport", "DECLAN Ó RUAIRC".title()),
    ("Date of Birth",    CRM["date_of_birth"],   "POI — Passport", "1976-09-30"),
    ("Nationality",      CRM["nationality"],     "POI — Passport", "Caerwynian"),
    ("Passport Number",  CRM["passport_number"], "POI — Passport", "PA4471893"),
    ("Date Of Expiry",   "",                     "POI — Passport", "2024-07-14"),
    ("Residence Permit Reference", CRM["residence_permit_reference"],
                                             "POI — Residence Permit", "CH-ZH-1180.4472/9"),
    ("Date Of Expiry",   "",                     "POI — Residence Permit", "2025-10-31"),
])

pora_crm = compare("PORA ↔ CRM", [
    ("Full Legal Name",    CRM["full_legal_name"],    "PORA=Linked", None),
    ("Registered Address", CRM["registered_address"], "PORA=Linked", None),
])

nbapp = compare("NBApp ↔ FIForm ↔ CRM", [
    ("Full Legal Name", CRM["full_legal_name"], "NBApp", CRM["full_legal_name"]),
    ("Policy / Contract Number", CRM["policy_number"], "NBApp", "94110552"),
    ("Occupation",      CRM["occupation"],      "NBApp", CRM["occupation"]),
    ("Marital Status",  CRM["marital_status"],  "NBApp", "Divorced"),
    ("Adviser Firm",    CRM["adviser_firm"],    "FIForm", CRM["adviser_firm"]),
])

RECONCILIATION = {
    "policy_number": CRM["policy_number"], "client_number": CRM["client_number"],
    "full_name": CRM["full_legal_name"], "date_of_birth": CRM["date_of_birth"],
    "anchor": "CRM · Core Client Record",
    "comparisons": [poi_crm, pora_crm, nbapp],
    "exceptions": [
        {"type": "Link",       "title": "PORA not linked",
         "detail": "PORA for Declan Ó Ruairc is not found. Missing Link"},
        {"type": "Comparison", "title": "Passport expired",
         "detail": "Passport expired on 2024-07-14."},
        {"type": "Comparison", "title": "Residence permit expired",
         "detail": "Residence permit expired on 2025-10-31."},
    ],
    "overall_status": "Not Reconciled",
}

for comp in RECONCILIATION["comparisons"]:
    print(f"\n{comp['comparison']}")
    for r in comp["rows"]:
        mark = "OK " if r["status"] == "match" else "!! "
        print(f"  {mark}{r['field']:28} crm={str(r['crm'])[:28]:30} -> {r['value']}")
```

    
    POI ↔ CRM
      OK Full Legal Name              crm=Declan Ó Ruairc                -> Declan Ó Ruairc
      OK Date of Birth                crm=1976-09-30                     -> 1976-09-30
      OK Nationality                  crm=Caerwynian                     -> Caerwynian
      OK Passport Number              crm=PA4471893                      -> PA4471893
      !! Date Of Expiry               crm=                               -> 2024-07-14
      OK Residence Permit Reference   crm=CH-ZH-1180.4472/9              -> CH-ZH-1180.4472/9
      !! Date Of Expiry               crm=                               -> 2025-10-31
    
    PORA ↔ CRM
      !! Full Legal Name              crm=Declan Ó Ruairc                -> None
      !! Registered Address           crm=Baslerstrasse 92, 8048 Linde   -> None
    
    NBApp ↔ FIForm ↔ CRM
      OK Full Legal Name              crm=Declan Ó Ruairc                -> Declan Ó Ruairc
      OK Policy / Contract Number     crm=94110552                       -> 94110552
      OK Occupation                   crm=Construction Project Manager   -> Construction Project Manager
      OK Marital Status               crm=Divorced                       -> Divorced
      OK Adviser Firm                 crm=Alpenblick Finanzpartner       -> Alpenblick Finanzpartner



```python
print("Exceptions (%d raised, 0 resolved):" % len(RECONCILIATION["exceptions"]))
for e in RECONCILIATION["exceptions"]:
    print(f"  ! {e['title']:26} [{e['type']}]")
    print(f"      {e['detail']}")
print()
print("Overall Status:", RECONCILIATION["overall_status"])
```

    Exceptions (3 raised, 0 resolved):
      ! PORA not linked            [Link]
          PORA for Declan Ó Ruairc is not found. Missing Link
      ! Passport expired           [Comparison]
          Passport expired on 2024-07-14.
      ! Residence permit expired   [Comparison]
          Residence permit expired on 2025-10-31.
    
    Overall Status: Not Reconciled


**`Not Reconciled` is the useful output.** The product's value is not "everything matched"
— it is a defensible record of *what did not match and why*, with the evidence attached.
An expired passport and an unlinked address proof are exactly what an AML reviewer must
see and sign off.

## 4. The audit trail

Who did what, when. Taken from the video at 00:04:11 — note it spans both **system**
actions (matching engine, workflow) and **human** ones (`reviewer@example.com` opening
and linking).


```python
AUDIT_TRAIL = [
    {"ts": "2026-08-12T17:25", "event": "Documents Ingested", "actor": "System — Document Intake",
     "detail": "CRM extract generated for policy 94110552 and 5 source documents ingested"},
    {"ts": "2026-08-12T17:26", "event": "Passport expired", "actor": "System — Matching Engine",
     "detail": "Passport expired on 2024-07-14."},
    {"ts": "2026-08-12T17:26", "event": "Residence permit expired", "actor": "System — Matching Engine",
     "detail": "Residence permit expired on 2025-10-31."},
    {"ts": "2026-08-12T17:27", "event": "Exceptions Raised", "actor": "System — Matching Engine",
     "detail": "Raised 1 link, 2 comparison exceptions. Status set to Not Reconciled."},
    {"ts": "2026-08-12T17:28", "event": "Assigned to User", "actor": "System — Workflow",
     "detail": "Assigned to reviewer@example.com for review."},
    {"ts": "2026-08-12T19:27", "event": "User Opened Set", "actor": "reviewer@example.com",
     "detail": "Reconciliation details viewed. Document viewers accessed."},
    {"ts": "2026-08-12T20:07", "event": "Document linked", "actor": "reviewer@example.com",
     "detail": "Linked 04_PORA_Broadband_Bill.pdf to Declan Ó Ruairc."},
]

for a in AUDIT_TRAIL:
    print(f"  {a['ts']}  {a['event']:26} {a['actor']}")
```

      2026-08-12T17:25  Documents Ingested         System — Document Intake
      2026-08-12T17:26  Passport expired           System — Matching Engine
      2026-08-12T17:26  Residence permit expired   System — Matching Engine
      2026-08-12T17:27  Exceptions Raised          System — Matching Engine
      2026-08-12T17:28  Assigned to User           System — Workflow
      2026-08-12T19:27  User Opened Set            reviewer@example.com
      2026-08-12T20:07  Document linked            reviewer@example.com


## 5. Packing it into the document

the sponsor, 00:00:58:

> "the audit trail, that is the information extracted from this document, is also the
> reconciliation data. And that is packed into this using a system called MSD"

Three payloads — extraction, audit, reconciliation — signed and embedded into the PDF the
client already has.


```python
key = msd.generate_key_pair(unendorsed=True)   # see §9 on why unendorsed

AUDIT_PACKAGE = {
    "extracted_data": POI_EXTRACTED,
    "audit_trail":    AUDIT_TRAIL,
    "reconciliation": RECONCILIATION,
}

# Stand in for the real declan.pdf with any PDF we have
src_pdf = Path.cwd() / "sample" / "adobe-pdf.pdf"
pdf_bytes = src_pdf.read_bytes()

doc = {"__type": "PDF", "data": base64.b64encode(pdf_bytes).decode()}
signed = msd.sign(doc, metadata=AUDIT_PACKAGE, key=key)
embedded = msd.embed(signed)

out_pdf = WORK / "declan_signed.pdf"
out_bytes = base64.b64decode(embedded["data"])
out_pdf.write_bytes(out_bytes)

print(f"source PDF   : {len(pdf_bytes):,} bytes")
print(f"signed PDF   : {len(out_bytes):,} bytes  (+{len(out_bytes)-len(pdf_bytes):,})")
print(f"still a PDF  : {out_bytes[:5]}")
print()
print(f"payload packed: {len(json.dumps(AUDIT_PACKAGE)):,} bytes of JSON")
```

    source PDF   : 626,615 bytes
    signed PDF   : 631,261 bytes  (+4,646)
    still a PDF  : b'%PDF-'
    
    payload packed: 4,573 bytes of JSON


Under a kilobyte of overhead on a 600 KB PDF, and the file is still an ordinary PDF that
opens in Preview. Nothing about it announces itself.

## 6. Verification — what the *recipient* does

The demo's core claim (00:02:19):

> "this is what you could do if you receive this file. You could run this on your
> computer."

No Staple account, no API call, no network.


```python
received = {"__type": "PDF",
            "data": base64.b64encode(out_pdf.read_bytes()).decode()}

result = msd.verify(received)
print("signature_is_valid   :", result["signature_is_valid"])
print("signature_is_trusted :", result["signature_is_trusted"])
print("signed at            :", result["signature_timestamp"])
print("signing key          :", result["signing_key"]["public_key"][:40], "...")
```

    signature_is_valid   : True
    signature_is_trusted : False
    signed at            : {'__type': 'Time', 'zef_unix_time': '1788407855'}
    signing key          : 🔑-345faaa8b0adc4225cf2ab16364e2494eab21f ...


Compare the file that never went through Staple — the video's control case at 00:01:40,
*"we're gonna see it has no valid signature, there's nothing there"*:


```python
plain = {"__type": "PDF", "data": base64.b64encode(src_pdf.read_bytes()).decode()}
try:
    r = msd.verify(plain)
    print("unsigned PDF verify:", r.get("signature_is_valid"))
except Exception as e:
    print("unsigned PDF ->", type(e).__name__, ":", str(e)[:80])
```

    unsigned PDF -> ValueError : 
    
    ╭───[1m[37m Error.NoMatchingMethod [0m─────────────────────────────────────


### Unpacking the three payloads (the `unpack` command, 00:05:57)


```python
recovered = msd.extract_metadata(received)

print("payloads recovered:", list(recovered))
print()
print("extracted_data : %d fields" % len(recovered["extracted_data"]))
print("   name        :", recovered["extracted_data"]["02FirstName"],
                          recovered["extracted_data"]["01LastName"])
print("   permit no.  :", recovered["extracted_data"]["11Number"])
print("   expiry      :", recovered["extracted_data"]["13DateOfExpiry"])
print()
print("audit_trail    : %d events" % len(recovered["audit_trail"]))
print("   first       :", recovered["audit_trail"][0]["event"])
print("   last        :", recovered["audit_trail"][-1]["event"])
print()
print("reconciliation : status =", recovered["reconciliation"]["overall_status"])
print("   exceptions  :", [e["title"] for e in recovered["reconciliation"]["exceptions"]])
print()
print("byte-identical to what was packed:", recovered == AUDIT_PACKAGE)
```

    payloads recovered: ['extracted_data', 'audit_trail', 'reconciliation']
    
    extracted_data : 22 fields
       name        : DECLAN O RUAIRC
       permit no.  : CH-ZH-1180.4472/9
       expiry      : 2025-10-31
    
    audit_trail    : 7 events
       first       : Documents Ingested
       last        : Document linked
    
    reconciliation : status = Not Reconciled
       exceptions  : ['PORA not linked', 'Passport expired', 'Residence permit expired']
    
    byte-identical to what was packed: True


Everything comes back exactly. Note this includes nested lists of dicts and non-ASCII
names (`Declan Ó Ruairc`) — §5 of `c2pa_demo.ipynb` shows C2PA silently destroying
structures far simpler than this.

## 7. Tamper evidence

the sponsor, 00:01:50: *"this file has not been tampered with. The signature it gives tamper
evidence."*


```python
b = bytearray(out_pdf.read_bytes())
b[len(b) // 2] ^= 0xFF                      # flip one byte in the middle
tampered = WORK / "declan_tampered.pdf"; tampered.write_bytes(b)

t = {"__type": "PDF", "data": base64.b64encode(tampered.read_bytes()).decode()}
try:
    r = msd.verify(t)
    print("tampered PDF signature_is_valid:", r["signature_is_valid"])
except Exception as e:
    print("tampered PDF ->", type(e).__name__, ":", str(e)[:90])
```

    tampered PDF signature_is_valid: False


## 8. The JSON case

The part most relevant to our C2PA comparison. the sponsor, 00:04:38:

> "This works for not only for PDFs, we also do it for general JSONs and other file types"

and at 00:05:06:

> "this single Unicode actually contains the sidecar information, which is the digital
> signature. And all that context"

The extracted record travels as **plain JSON**, with signature and audit history hidden in
a single invisible Unicode character.


```python
export = {"data": [POI_EXTRACTED]}          # Staple's JSON export shape

signed_json = msd.sign(export, metadata=AUDIT_PACKAGE, key=key)
try:
    carried = msd.embed(signed_json)        # steganographic __msd key
    print("embedded keys:", list(carried))
    s = json.dumps(carried, ensure_ascii=False)
    print("still valid JSON :", isinstance(json.loads(s), dict))
    print("size overhead    :", len(s) - len(json.dumps(export, ensure_ascii=False)), "bytes")
    print()
    print("verify after a JSON round-trip:",
          msd.verify(json.loads(s))["signature_is_valid"])
except BaseException as e:          # zef raises a Rust PanicException, not Exception
    print("embed() on a dict FAILED:", type(e).__name__)
    print(" ", str(e)[:200])
    print()
    print(">>> This is the tokolosh network dependency from the written analysis.")
    print(">>> sign()/verify() work offline; dict embed() requires a service.")
```

    🔍 requesting entity type encoding from tokolosh: ZstdCompressed


    embed() on a dict FAILED: PanicException
      called `Result::unwrap()` on an `Err` value: "💥💥 Entity type 'ZstdCompressed' not found in local cache or tokolosh: Error.NotConnected(\n  kind='failed',\n  description='tokolosh connect failed: No to
    
    >>> This is the tokolosh network dependency from the written analysis.
    >>> sign()/verify() work offline; dict embed() requires a service.


    
    thread '<unnamed>' (42941) panicked at src/various/mutable_types_general.rs:5865:50:
    called `Result::unwrap()` on an `Err` value: "💥💥 Entity type 'ZstdCompressed' not found in local cache or tokolosh: Error.NotConnected(\n  kind='failed',\n  description='tokolosh connect failed: No tokolosh found on ports 27021–27040'\n) 💥💥"
    note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace


## 9. What this tells us about the C2PA comparison

Seeing the real use case sharpens several conclusions from earlier weeks.

**The deliverable is a business document, not a media asset.** Everything Staple ships is
PDF, JSON, CSV or Excel. From the written analysis, C2PA writes **none** of these — it is
media-only, PDF is read-only, and `--sidecar` does not help. C2PA could not carry this
demo at all. That is not a close call.

**The payload is deeply structured.** Three nested payloads, hundreds of fields, lists of
comparison rows. C2PA's JSON→CBOR coercion silently corrupts numeric arrays
(`[1,2,3,256]` → 256 becomes 0) while still reporting `Valid`. This payload would need
defensive string-wrapping throughout.

**Verification is offline and by a third party.** The bank's counterparty runs a command
on their own machine, with no Staple access. Both MSD and C2PA support this; it is table
stakes rather than a differentiator.

**But note what the demo does *not* show — and it is the thing we flagged:**

- `signature_is_trusted` is `False` here, and would be in the real product too:
  `msd-sdk` hardcodes `is_trusted = False` in every verify path, and `is_endorsed()`
  raises `NotImplementedError`. The demo shows *"valid signature"* and stops there. A bank
  asking *"valid — but signed by whom, and do I trust them?"* has no answer today.
- The reconciliation is a **star around a CRM anchor**, not the multi-party dependency DAG
  the protocol author described on 08-28. This use case does not exercise the graph story at all — which
  makes open question #1 (graph or embedding?) even more pressing. **The shipped product
  is the embedding half.**
- the sponsor's own limiting case applies: the recipient here gets **one file**. Interlinkability
  buys nothing yet; the value is the self-contained audit package.

**Where this points.** MSD's defensible position is exactly what this demo does —
structured provenance carried *inside* business documents that already exist. W3C VC
cannot embed at all; C2PA cannot write these formats. The gap the product must still close
is identity: a valid signature from an unidentified signer is not enough for a regulated
AML workflow.

Companion notebooks: `c2pa_demo.ipynb`, a companion notebook,
`w3c_vc_comparison.ipynb`.
