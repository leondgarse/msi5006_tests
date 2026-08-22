# C2PA: Embedding and Extracting Custom Data

**MSI5006 capstone — Team 3S × Staple AI**

Action item: *"Conduct an experiment to demonstrate updating a file with custom data via
C2PA and subsequently verify that the data can be correctly extracted."*

This notebook runs the experiment live. Run top to bottom (`Kernel → Restart & Run All`).

**What it shows**

| § | Demonstrates |
|---|---|
| 1 | Setup and preflight |
| 2 | Embed a custom OCR payload into an image and extract it back |
| 3 | Tamper detection — flip one byte, watch verification fail |
| 4 | Trust: signature validity vs. certificate trust are *separate* results |
| 4b | A real **Google/Gemini** production signature, verified offline |
| 5 | ⚠️ Silent data corruption, and the fix |
| 6 | How much data fits |
| 7 | What C2PA refuses to sign (the PDF / Office gap) |
| 7b | A real **Adobe** production-signed PDF: reads fine, cannot be re-signed |

Nothing here is mocked — every result is produced by the real `c2patool` binary.

## 1. Setup


```python
import json, subprocess, shutil, base64, time, os
from pathlib import Path

ROOT   = Path.cwd()
SAMPLE = ROOT / "sample"
WORK   = ROOT / "demo_out"
shutil.rmtree(WORK, ignore_errors=True)
WORK.mkdir(exist_ok=True)

C2PATOOL = shutil.which("c2patool") or str(Path.home() / "local_bin" / "c2patool")

KEY  = SAMPLE / "es256_private.key"     # dev signing key (test cert, not on the trust list)
CERT = SAMPLE / "es256_certs.pem"
IMG  = SAMPLE / "image.jpg"             # unsigned starting asset

def c2pa(*args, check=False, verbose=True):
    """Run c2patool and return (returncode, stdout, stderr)."""
    if verbose:
        print(f"cmd: c2patool {' '.join(map(str, args))}")
    r = subprocess.run([C2PATOOL, *map(str, args)], capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
    return r.returncode, r.stdout, r.stderr

def read_manifest(path, verbose=True):
    """Read a manifest store as a dict, or None if unsigned/unreadable."""
    rc, out, err = c2pa(path, verbose=verbose)
    return json.loads(out) if rc == 0 else None

print("c2patool :", C2PATOOL)
print("version  :", subprocess.run([C2PATOOL,"--version"],capture_output=True,text=True).stdout.strip())
for p in (KEY, CERT, IMG):
    print(f"  {'OK ' if p.exists() else 'MISSING'} {p}")
print("workdir  :", WORK)
```

    c2patool : /home/leondgarse/local_bin/c2patool
    version  : c2patool 0.27.15
      OK  /home/leondgarse/workspace/msi5006_tests/sample/es256_private.key
      OK  /home/leondgarse/workspace/msi5006_tests/sample/es256_certs.pem
      OK  /home/leondgarse/workspace/msi5006_tests/sample/image.jpg
    workdir  : /home/leondgarse/workspace/msi5006_tests/demo_out


### Preflight

Stop here if anything above is missing. `c2patool` must be on `PATH` (or at
`~/local_bin/c2patool`), and `sample/` must hold the dev key, cert and test image.

Two sections use real vendor-signed files and skip cleanly if absent:
§4b needs `sample/gemini_generated_image.jpeg` (plus
Pillow, for the strip test); §7b needs `sample/adobe-pdf.pdf`.

## 2. The core experiment — embed custom data, then extract it

This is the action item proper. We attach a **custom assertion** to a JPEG: a made-up
label `com.staple.field-derivation` carrying an OCR extraction record.

Two things to understand about the manifest definition below:

- Labels are an **open vocabulary**. `com.staple.*` is ours to define — C2PA does not
  need to know about it. It gets hashed into the claim and signed like any built-in one.
- `private_key` / `sign_cert` / `alg` are **c2patool conveniences**, not C2PA spec
  fields. The manifest JSON is a *declarative input*; the tool compiles it into the
  binary JUMBF structure that actually goes in the file.


```python
payload = {
    "document_id": "INV-8842",
    "extracted_by": "staple-ocr v2.1",
    "extracted_at": "2026-08-22T10:00:00Z",
    "fields": [
        {"name": "supplier", "value": "Acme Trading Pte Ltd", "confidence": 0.982,
         "source_page": 1, "method": "layout-lm"},
        {"name": "total",    "value": "12340.50", "confidence": 0.994,
         "source_page": 1, "method": "regex+validate"},
        {"name": "currency", "value": "SGD", "confidence": 0.999,
         "source_page": 1, "method": "lexicon"},
    ],
    "reconciliation": {"po_ref": "PO-5521", "matched": True, "variance": 0.0},
}

manifest = {
    "claim_generator_info": [{"name": "StapleAI-demo", "version": "0.1.0"}],
    "title": "Invoice INV-8842 extraction",
    "alg": "es256",
    "private_key": str(KEY),
    "sign_cert":   str(CERT),
    "assertions": [
        {"label": "c2pa.actions",
         "data": {"actions": [{
             "action": "c2pa.created",
             # required for c2pa.created, else validation reports
             # assertion.action.malformed
             "digitalSourceType":
                 "http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicMedia",
             "softwareAgent": "staple-ocr v2.1"}]}},
        {"label": "com.staple.field-derivation", "data": payload},
    ],
}

man_path = WORK / "manifest.json"
man_path.write_text(json.dumps(manifest, indent=2))
print(json.dumps(manifest, indent=2)[:700], "...")
```

    {
      "claim_generator_info": [
        {
          "name": "StapleAI-demo",
          "version": "0.1.0"
        }
      ],
      "title": "Invoice INV-8842 extraction",
      "alg": "es256",
      "private_key": "/home/leondgarse/workspace/msi5006_tests/sample/es256_private.key",
      "sign_cert": "/home/leondgarse/workspace/msi5006_tests/sample/es256_certs.pem",
      "assertions": [
        {
          "label": "c2pa.actions",
          "data": {
            "actions": [
              {
                "action": "c2pa.created",
                "digitalSourceType": "http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicMedia",
                "softwareAgent": "staple-ocr v2.1"
              }
            ]
          }
        },
        {
          "label": "com.staple.field-deri ...



```python
no_thumbnail_settings = """[builder]
thumbnail.enabled = false
"""

no_thumbnail_settings_path = WORK / "nothumb.toml"
no_thumbnail_settings_path.write_text(no_thumbnail_settings)
print(no_thumbnail_settings)
```

    [builder]
    thumbnail.enabled = false
    


### 2a. Sign — write the custom data into the file


```python
signed = WORK / "invoice_signed.jpg"
rc, out, err = c2pa(IMG, "-m", man_path, "-o", signed, "-f", check=True)

print(f"signed OK   {IMG.stat().st_size:,} bytes  ->  {signed.stat().st_size:,} bytes")
print(f"manifest overhead: {signed.stat().st_size - IMG.stat().st_size:,} bytes")
print("\nstill a valid JPEG:", signed.read_bytes()[:3] == b'\xff\xd8\xff')
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/image.jpg -m /home/leondgarse/workspace/msi5006_tests/demo_out/manifest.json -o /home/leondgarse/workspace/msi5006_tests/demo_out/invoice_signed.jpg -f
    signed OK   61,720 bytes  ->  125,364 bytes
    manifest overhead: 63,644 bytes
    
    still a valid JPEG: True


The image is visually unchanged — the manifest lives in a JUMBF box alongside the pixels.

Why is the signed file so much larger?

The manifest is far bigger than the data we put in it. Our payload is about 1 KB, but the file grew by tens of kilobytes. Almost none of that is our data.

By default c2patool adds a c2pa.thumbnail.claim assertion — a JPEG preview of the asset, embedded inside the manifest so a verifier can show what the content looked like when it was signed. On this image that thumbnail is roughly 49 KB, and it dominates everything else.

Disabling it isolates the real cost.


```python
signed_without_thumbnail = WORK / "invoice_signed_without_thumbnail.jpg"
rc, out, err = c2pa(IMG, "-m", man_path, "-o", signed_without_thumbnail, "-f", "--settings", no_thumbnail_settings_path, check=True)

a, b = signed.stat().st_size, signed_without_thumbnail.stat().st_size
print(f"with thumbnail    : {a:,}  (overhead {a - IMG.stat().st_size:,})")
print(f"without thumbnail : {b:,}  (overhead {b - IMG.stat().st_size:,})")
print(f"thumbnail costs   : {a - b:,} bytes")
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/image.jpg -m /home/leondgarse/workspace/msi5006_tests/demo_out/manifest.json -o /home/leondgarse/workspace/msi5006_tests/demo_out/invoice_signed_without_thumbnail.jpg -f --settings /home/leondgarse/workspace/msi5006_tests/demo_out/nothumb.toml
    with thumbnail    : 125,364  (overhead 63,644)
    without thumbnail : 75,816  (overhead 14,096)
    thumbnail costs   : 49,548 bytes


### 2b. Extract — read the custom data back out


```python
store = read_manifest(signed)
active = store["manifests"][store["active_manifest"]]

print("active manifest :", store["active_manifest"])
print("title           :", active.get("title"))
print("generator       :", json.dumps(active.get("claim_generator_info")))
print("signature       :", json.dumps(active.get("signature_info")))
print("assertions      :", [a["label"] for a in active["assertions"]])
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/demo_out/invoice_signed.jpg
    active manifest : urn:c2pa:22b17664-67be-4966-af82-94f42030cff7
    title           : Invoice INV-8842 extraction
    generator       : [{"name": "StapleAI-demo", "version": "0.1.0", "org.contentauth.c2pa_rs": "0.90.15"}]
    signature       : {"alg": "Es256", "issuer": "C2PA Test Signing Cert", "common_name": "C2PA Signer", "cert_serial_number": "640229841392226413189608867977836244731148734950"}
    assertions      : ['c2pa.actions.v2', 'com.staple.field-derivation']



```python
recovered = next(a["data"] for a in active["assertions"]
                 if a["label"] == "com.staple.field-derivation")

print(json.dumps(recovered, indent=2))
print()
print("round-trip byte-identical to what we embedded:", recovered == payload)
```

    {
      "document_id": "INV-8842",
      "extracted_at": "2026-08-22T10:00:00Z",
      "extracted_by": "staple-ocr v2.1",
      "fields": [
        {
          "confidence": 0.982,
          "method": "layout-lm",
          "name": "supplier",
          "source_page": 1,
          "value": "Acme Trading Pte Ltd"
        },
        {
          "confidence": 0.994,
          "method": "regex+validate",
          "name": "total",
          "source_page": 1,
          "value": "12340.50"
        },
        {
          "confidence": 0.999,
          "method": "lexicon",
          "name": "currency",
          "source_page": 1,
          "value": "SGD"
        }
      ],
      "reconciliation": {
        "matched": true,
        "po_ref": "PO-5521",
        "variance": 0.0
      }
    }
    
    round-trip byte-identical to what we embedded: True


> ⚠️ If that last line prints `False`, that is **not** a notebook bug — it is the real
> C2PA behaviour investigated in §5. With this particular payload it should print `True`,
> because every value here is a scalar or a string. Change `source_page` into a list like
> `[1,2]` and it will start failing.

**The action item is satisfied at this point:** custom data was written into a file via
C2PA and extracted back out. Everything below is the diligence that makes the result
trustworthy.

## 3. Tamper detection

Provenance is only worth anything if modification is detectable. The claim contains a
**hard binding** — a SHA-256 over the asset bytes. We flip a single byte of image data
and re-verify.


```python
tampered = WORK / "invoice_tampered.jpg"
raw = bytearray(signed.read_bytes())
offset = len(raw) - 2000                      # in the image data, past the manifest
before = raw[offset]
raw[offset] ^= 0xFF
tampered.write_bytes(raw)
print(f"flipped 1 byte at offset {offset:,}: {before:#04x} -> {raw[offset]:#04x}")
print(f"file size unchanged: {len(raw) == signed.stat().st_size}")
```

    flipped 1 byte at offset 123,364: 0x29 -> 0xd6
    file size unchanged: True



```python
def status_codes(store):
    return [s["code"] for s in (store or {}).get("validation_status", [])]

clean_codes   = status_codes(read_manifest(signed))
tampered_codes = status_codes(read_manifest(tampered))

print("original :", clean_codes or "(no problems)")
print("tampered :", tampered_codes or "(no problems)")
print()
new_codes = set(tampered_codes) - set(clean_codes)
print("codes introduced by the tamper:", new_codes or "(none)")
print("tamper detected:", "assertion.dataHash.mismatch" in new_codes)
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/demo_out/invoice_signed.jpg


    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/demo_out/invoice_tampered.jpg


    original : ['signingCredential.untrusted']
    tampered : ['signingCredential.untrusted', 'assertion.dataHash.mismatch']
    
    codes introduced by the tamper: {'assertion.dataHash.mismatch'}
    tamper detected: True


`assertion.dataHash.mismatch` — one flipped byte out of ~125,000 is caught.

We diff against the untampered baseline rather than expecting an empty list, because the
original already carries `signingCredential.untrusted` (our dev cert is not on the trust
list). That is a *pre-existing* condition, not a consequence of the tamper — §4 unpacks
why the two must be reported separately.

## 4. Signature validity ≠ certificate trust

A point worth getting right before the sponsor meeting, because it is easy to
misreport.

Our dev certificate is deliberately **not** on the C2PA trust list, so a plain read
reports `signingCredential.untrusted`. That does **not** mean verification failed — the
signature and the hard binding are perfectly valid. It means *"I cannot vouch for who
signed this."* Two separate questions:

1. Is the content intact and the signature mathematically valid?
2. Do I recognise the signer?

Loading the trust list answers the second. Note the CLI moved recently — trust flags are
a **subcommand**, not top-level options.


```python
print("WITHOUT trust list:", status_codes(read_manifest(SAMPLE / "C.jpg")) or "(clean)")

rc, out, err = c2pa(SAMPLE / "C.jpg", "trust",
                    "--trust_anchors", SAMPLE / "trust_anchors.pem",
                    "--allowed_list",  SAMPLE / "allowed_list.pem",
                    "--trust_config",  SAMPLE / "store.cfg")
with_trust = json.loads(out) if rc == 0 else None
print("WITH trust list   :", status_codes(with_trust) or "(clean — signer recognised)")
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/C.jpg
    WITHOUT trust list: ['signingCredential.untrusted']
    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/C.jpg trust --trust_anchors /home/leondgarse/workspace/msi5006_tests/sample/trust_anchors.pem --allowed_list /home/leondgarse/workspace/msi5006_tests/sample/allowed_list.pem --trust_config /home/leondgarse/workspace/msi5006_tests/sample/store.cfg
    WITH trust list   : (clean — signer recognised)


Same file, same bytes, same signature — only our knowledge of the issuer changed.

So when reporting results: *"signature and binding valid; issuer not on the trust list"*.
Never *"verification failed."*

## 4b. A real vendor signature — Google / Gemini

Everything above used our dev certificate. This section verifies a genuine
**production Google signature** on an image generated by Gemini, to show what
real-world Content Credentials look like.

Set `GEMINI_IMG` to the file if you have one; the section skips cleanly if not.


```python
GEMINI_IMG = SAMPLE / "gemini_generated_image.jpeg"

if not GEMINI_IMG.exists():
    print("no vendor image present — skipping section 4b")
else:
    st = read_manifest(GEMINI_IMG)
    am = st["manifests"][st["active_manifest"]]
    print("generator     :", am["claim_generator_info"][0]["name"])
    print("signature     :", json.dumps(am["signature_info"], indent=16)[:400])
    print("claim_version :", am.get("claim_version"))
    print("assertions    :", [a["label"] for a in am["assertions"]])
    print()
    for act in am["assertions"][0]["data"]["actions"]:
        print(f"  {act['action']:14} {act.get('description','')}")
        print(f"  {'':14} digitalSourceType={act.get('digitalSourceType','').split('/')[-1]}")
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/gemini_generated_image.jpeg


    generator     : Google C2PA Core Generator Library
    signature     : {
                    "alg": "Es256",
                    "issuer": "Google LLC",
                    "common_name": "Google Media Processing Services",
                    "cert_serial_number": "3728703941473617107295662634367656681385811298",
                    "time": "2026-08-22T03:22:37+00:00"
    }
    claim_version : 2
    assertions    : ['c2pa.actions.v2']
    
      c2pa.created   Created by Google Generative AI.
                     digitalSourceType=trainedAlgorithmicMedia
      c2pa.edited    Applied imperceptible SynthID watermark.
                     digitalSourceType=trainedAlgorithmicMedia


Note what Google actually ships: a **minimal disclosure manifest**. One assertion
(`c2pa.actions.v2`), no custom data, no ingredients — just "created by generative AI"
plus a note that a SynthID watermark was applied. Total manifest ~6 KB, 0.73% of the
file.

That is worth contrasting with our §2 experiment: Google uses C2PA for *disclosure*,
whereas Staple wants it for *structured data transport*. Same standard, very different
payloads — and only ours runs into the §5 corruption problem.


```python
if GEMINI_IMG.exists():
    vr = read_manifest(GEMINI_IMG).get("validation_results", {}).get("activeManifest", {})
    print("success       :", [x["code"] for x in vr.get("success", [])])
    print("failure       :", [x["code"] for x in vr.get("failure", [])])
    print("informational :", [x["code"] for x in vr.get("informational", [])])
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/gemini_generated_image.jpeg


    success       : ['timeStamp.validated', 'claimSignature.insideValidity', 'claimSignature.validated', 'assertion.hashedURI.match', 'assertion.hashedURI.match', 'assertion.dataHash.match']
    failure       : ['signingCredential.untrusted']
    informational : ['timeStamp.untrusted']


`timeStamp.validated` — Google applies an **RFC 3161 timestamp** at sign time (TSA
"Google Core Time Stamping Authority T10"), proving *when* it was signed independently
of the signer's clock. `claimSignature.validated` and `assertion.dataHash.match` confirm
signature and binding.

The whole certificate chain travels **inside the file**, so this verifies with no
network access:


```python
if GEMINI_IMG.exists():
    chain = WORK / "google_chain.pem"
    rc, out, _ = c2pa(GEMINI_IMG, "--certs")
    chain.write_text(out)
    print("certificates in chain:", out.count("BEGIN CERTIFICATE"))

    import re
    for block in re.findall(r"-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----",
                            out, re.S):
        r = subprocess.run(["openssl","x509","-noout","-subject","-issuer","-dates"],
                           input=block, capture_output=True, text=True)
        print(); print(r.stdout.strip())
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/gemini_generated_image.jpeg --certs


    certificates in chain: 2


    
    subject=C = US, O = Google LLC, OU = Google System 60032, CN = Google Media Processing Services
    issuer=C = US, O = Google LLC, CN = Google C2PA Media Services 1P ICA G3
    notBefore=Feb 25 15:15:54 2026 GMT
    notAfter=Feb 20 15:15:53 2027 GMT


    
    subject=C = US, O = Google LLC, CN = Google C2PA Media Services 1P ICA G3
    issuer=C = US, O = Google LLC, CN = Google C2PA Root CA G3
    notBefore=May  8 22:36:26 2025 GMT
    notAfter=May  8 22:36:26 2030 GMT


### The three validation states, on one real file

This is the clearest demonstration of §4's point — same bytes, three different verdicts
depending only on what we know and whether the file was altered.


```python
if GEMINI_IMG.exists():
    # 1. default — Google's root is not in c2patool's trust list
    st = read_manifest(GEMINI_IMG)
    print("1. default           :", st.get("validation_state"),
          "|", [x["code"] for x in st.get("validation_status", [])])

    # 2. trusting Google's own chain
    rc, out, _ = c2pa(GEMINI_IMG, "trust", "--trust_anchors", WORK / "google_chain.pem")
    st2 = json.loads(out)
    print("2. with Google chain :", st2.get("validation_state"),
          "|", [x["code"] for x in st2.get("validation_status", [])] or "(clean)")

    # 3. tampered
    tam = WORK / "gemini_tampered.jpg"
    b = bytearray(GEMINI_IMG.read_bytes()); b[len(b)-3000] ^= 0xFF
    tam.write_bytes(b)
    st3 = read_manifest(tam)
    vr3 = st3.get("validation_results", {}).get("activeManifest", {})
    print("3. one byte flipped  :", st3.get("validation_state"),
          "|", [x["code"] for x in vr3.get("failure", [])])
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/gemini_generated_image.jpeg


    1. default           : Valid | ['signingCredential.untrusted']
    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/gemini_generated_image.jpeg trust --trust_anchors /home/leondgarse/workspace/msi5006_tests/demo_out/google_chain.pem


    2. with Google chain : Trusted | (clean)
    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/demo_out/gemini_tampered.jpg


    3. one byte flipped  : Invalid | ['signingCredential.untrusted', 'assertion.dataHash.mismatch']


**`Valid` → `Trusted` → `Invalid`.** Exactly the distinction from §4, now on genuine
vendor content: `Valid` means the signature and binding check out; `Trusted` additionally
means we recognise the issuer; `Invalid` means the content was altered.

### Caveat: C2PA is trivially strippable

A plain re-save through an ordinary image library destroys the manifest:


```python
if GEMINI_IMG.exists():
    try:
        from PIL import Image
        resaved = WORK / "gemini_resaved.jpg"
        Image.open(GEMINI_IMG).save(resaved, quality=95)
        rc, out, err = c2pa(resaved)
        print("after PIL re-save:", err.strip() or "manifest still present")
    except ImportError:
        print("Pillow not installed — skipping")
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/demo_out/gemini_resaved.jpg
    after PIL re-save: Error: No claim found


`No claim found`. C2PA survives *copying* a file, not *re-encoding* it. Any screenshot,
format conversion, or platform that re-processes on upload silently removes provenance —
and removal is indistinguishable from never having had it.

This is why Google pairs C2PA with **SynthID**, a pixel-level watermark that survives
re-encoding. The lesson for our project: C2PA proves provenance when present, but its
absence proves nothing. A pipeline that depends on it needs the manifest preserved
deliberately, or a second, more robust channel.

## 5. ⚠️ The finding that matters most: silent data corruption

C2PA converts assertion JSON to **CBOR** at sign time. Homogeneous numeric arrays get
coerced into CBOR byte strings — and values that do not fit in a single byte are
**destroyed with no error at all**.

This is the single most important practical result of our testing, because it lands
squarely on OCR bounding boxes.


```python
probe = {
    "small_ints":  [1, 2, 3, 255],       # fits in bytes
    "over_255":    [1, 2, 3, 256],       # 256 does NOT fit
    "negatives":   [-1, 2, 3],
    "floats":      [1.5, 2.5],
    "bbox":        [420, 164, 35, 24],   # a real OCR bounding box
    "mixed":       [1, "a", 2],          # not homogeneous
    "text":        "plain string",
    "number":      42,
    "nested":      {"inner": [10, 20, 30]},
}

probe_manifest = {
    "claim_generator_info": [{"name": "StapleAI-demo", "version": "0.1.0"}],
    "title": "type fidelity probe", "alg": "es256",
    "private_key": str(KEY), "sign_cert": str(CERT),
    "assertions": [{"label": "com.staple.typeprobe", "data": probe}],
}
p = WORK / "probe.json"; p.write_text(json.dumps(probe_manifest))
probe_img = WORK / "probe.jpg"
c2pa(IMG, "-m", p, "-o", probe_img, "-f", check=True)

st = read_manifest(probe_img)
am = st["manifests"][st["active_manifest"]]
got = next(a["data"] for a in am["assertions"] if a["label"] == "com.staple.typeprobe")

print(f"{'key':12} {'sent':28} {'received':28} ok")
print("-" * 78)
for k, v in probe.items():
    g = got.get(k, "<<MISSING>>")
    ok = "OK" if v == g else "XX"
    print(f"{k:12} {json.dumps(v)[:26]:28} {json.dumps(g)[:26]:28} {ok}")
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/image.jpg -m /home/leondgarse/workspace/msi5006_tests/demo_out/probe.json -o /home/leondgarse/workspace/msi5006_tests/demo_out/probe.jpg -f


    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/demo_out/probe.jpg
    key          sent                         received                     ok
    ------------------------------------------------------------------------------
    small_ints   [1, 2, 3, 255]               "AQID/w=="                   XX
    over_255     [1, 2, 3, 256]               "AQIDAA=="                   XX
    negatives    [-1, 2, 3]                   "AgM="                       XX
    floats       [1.5, 2.5]                   ""                           XX
    bbox         [420, 164, 35, 24]           "pKQjGA=="                   XX
    mixed        [1, "a", 2]                  [1, "a", 2]                  OK
    text         "plain string"               "plain string"               OK
    number       42                           42                           OK
    nested       {"inner": [10, 20, 30]}      {"inner": "ChQe"}            XX


Read that table carefully:

- `[1,2,3,256]` → `"AQIDAA=="`, which decodes to bytes `01 02 03 00`. **256 became 0.**
- `[-1,2,3]` → two bytes. **The negative was dropped.**
- `[1.5,2.5]` → `""`. **The array vanished.**
- `[420,164,35,24]` → a base64 blob. **The bounding box is gone.**

Mixed arrays and scalars survive. Anything homogeneous and numeric is at risk.


```python
# The corruption is in the SIGNED bytes, not the read path — so validation still passes.
st = read_manifest(probe_img)
print("validation status :", status_codes(st) or "(clean)")
print("validation_state  :", st.get("validation_state"))
print()
print(">>> C2PA reports the file as VALID while the data inside is corrupted.")
print(">>> The signature faithfully attests to already-corrupted bytes.")
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/demo_out/probe.jpg
    validation status : ['signingCredential.untrusted']
    validation_state  : Valid
    
    >>> C2PA reports the file as VALID while the data inside is corrupted.
    >>> The signature faithfully attests to already-corrupted bytes.


That is the dangerous part. There is no error, no warning, and the file verifies. A
downstream consumer has no way to tell.

### The fix: serialize to a string first

A JSON string is not a numeric array, so nothing gets coerced.


```python
wrapped_manifest = {
    "claim_generator_info": [{"name": "StapleAI-demo", "version": "0.1.0"}],
    "title": "string-wrapped payload", "alg": "es256",
    "private_key": str(KEY), "sign_cert": str(CERT),
    "assertions": [{"label": "com.staple.field-derivation",
                    "data": {"payload_json": json.dumps(probe)}}],   # <-- the fix
}
w = WORK / "wrapped.json"; w.write_text(json.dumps(wrapped_manifest))
wrapped_img = WORK / "wrapped.jpg"
c2pa(IMG, "-m", w, "-o", wrapped_img, "-f", check=True)

st = read_manifest(wrapped_img)
am = st["manifests"][st["active_manifest"]]
s = next(a["data"] for a in am["assertions"]
         if a["label"] == "com.staple.field-derivation")["payload_json"]
restored = json.loads(s)

print("bbox      :", restored["bbox"])
print("floats    :", restored["floats"])
print("over_255  :", restored["over_255"])
print("negatives :", restored["negatives"])
print()
print("LOSSLESS round-trip:", restored == probe)
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/image.jpg -m /home/leondgarse/workspace/msi5006_tests/demo_out/wrapped.json -o /home/leondgarse/workspace/msi5006_tests/demo_out/wrapped.jpg -f


    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/demo_out/wrapped.jpg
    bbox      : [420, 164, 35, 24]
    floats    : [1.5, 2.5]
    over_255  : [1, 2, 3, 256]
    negatives : [-1, 2, 3]
    
    LOSSLESS round-trip: True


**Rule for our pipeline: never hand raw structured data to a C2PA assertion.**
`json.dumps` it first. The cost is that the assertion is no longer queryable as
structure — an acceptable trade against silent corruption.

## 6. How much custom data fits?

The team asked about maximum size. There is no hard cap in practice — the real limit is
memory. Peak RSS runs roughly 40× the payload.

Sizes kept modest here so the notebook stays fast; raise `SIZES_KB` if you want to push it.


```python
SIZES_KB = [10, 100, 1000, 5000]     # add 20000 / 50000 to stress it (slow, GBs of RAM)

def make_rows(target_bytes):
    rows, size, i = [], 0, 0
    while size < target_bytes:
        r = {"page": i // 20, "line": i % 20,
             "text": "sample extracted line of text %06d" % i,
             "conf": 0.9}
        rows.append(r); size += len(json.dumps(r)) + 1; i += 1
    return rows

print(f"{'payload':>10} {'sign':>8} {'output':>12} {'rows back':>10}  ok")
print("-" * 52)
for kb in SIZES_KB:
    rows = make_rows(kb * 1024)
    mf = {"claim_generator_info": [{"name": "StapleAI-demo", "version": "0.1.0"}],
          "title": f"size probe {kb}KB", "alg": "es256",
          "private_key": str(KEY), "sign_cert": str(CERT),
          # string-wrapped, per section 5
          "assertions": [{"label": "com.staple.ocr-log",
                          "data": {"payload_json": json.dumps(rows)}}]}
    mp = WORK / f"big_{kb}.json"; mp.write_text(json.dumps(mf))
    op = WORK / f"big_{kb}.jpg"

    t0 = time.time(); rc, _, err = c2pa(IMG, "-m", mp, "-o", op, "-f", verbose=False); dt = time.time() - t0
    if rc != 0:
        print(f"{kb:>8}KB {'FAILED':>8}  {err.strip()[:40]}"); continue

    st = read_manifest(op, verbose=False)
    am = st["manifests"][st["active_manifest"]]
    back = json.loads(next(a["data"] for a in am["assertions"]
                           if a["label"] == "com.staple.ocr-log")["payload_json"])
    print(f"{kb:>8}KB {dt:>7.2f}s {op.stat().st_size:>11,} {len(back):>10,}  "
          f"{'OK' if back == rows else 'XX'}")
```

       payload     sign       output  rows back  ok
    ----------------------------------------------------


          10KB    0.19s     185,346        122  OK


         100KB    0.19s     278,559      1,200  OK


        1000KB    0.30s   1,211,138     11,864  OK


        5000KB    0.59s   5,355,392     58,769  OK


Scales linearly and round-trips exactly. Measured separately, outside this notebook:
150 MB embedded fine in 42 s, at 6.6 GB peak RSS.

**Size is not the blocker for our use case — file format is.**

## 7. What C2PA refuses to sign

The constraint that actually decides the project. `c2pa-rs` implements **media only**.


```python
import zipfile

probes = {}
probes["t.csv"]  = b"field,value\nvendor,ACME\n"
probes["t.json"] = b'{"vendor":"ACME"}'
probes["t.txt"]  = b"hello\n"
probes["t.html"] = b"<html><body>hi</body></html>"
for ext in ("docx", "xlsx", "pptx"):
    fp = WORK / f"t.{ext}"
    with zipfile.ZipFile(fp, "w") as z:
        z.writestr("[Content_Types].xml", "<Types/>")
    probes[f"t.{ext}"] = None
for name, data in probes.items():
    if data is not None:
        (WORK / name).write_bytes(data)

# a structurally valid 1-page PDF
objs = [b"<</Type/Catalog/Pages 2 0 R>>", b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
        b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>"]
buf, offs = bytearray(b"%PDF-1.4\n"), []
for i, o in enumerate(objs, 1):
    offs.append(len(buf)); buf += b"%d 0 obj\n" % i + o + b"\nendobj\n"
x = len(buf)
buf += b"xref\n0 %d\n" % (len(objs)+1) + b"0000000000 65535 f \n"
for o in offs: buf += b"%010d 00000 n \n" % o
buf += b"trailer\n<</Size %d/Root 1 0 R>>\nstartxref\n%d\n%%%%EOF\n" % (len(objs)+1, x)
(WORK / "t.pdf").write_bytes(bytes(buf))

targets = ["t.pdf", "t.csv", "t.json", "t.txt", "t.html", "t.docx", "t.xlsx", "t.pptx"]
print(f"{'file':10} {'sign?':6} error")
print("-" * 62)
print(f"{'(jpeg)':10} {'YES':6} —")
for name in targets:
    rc, _, err = c2pa(WORK / name, "-m", man_path, "-o", WORK / f"signed_{name}", "-f", verbose=False)
    detail = err.strip().splitlines()[-1].strip() if rc else "—"
    print(f"{name:10} {'YES' if rc == 0 else 'NO':6} {detail[:44]}")
```

    file       sign?  error
    --------------------------------------------------------------
    (jpeg)     YES    —
    t.pdf      NO     type is unsupported
    t.csv      NO     type is unsupported
    t.json     NO     type is unsupported
    t.txt      NO     type is unsupported
    t.html     NO     type is unsupported
    t.docx     NO     type is unsupported
    t.xlsx     NO     type is unsupported
    t.pptx     NO     type is unsupported


PDF fails **identically to the rest on the write path** — `type is unsupported`, the
same error as CSV and DOCX.

The asymmetry is on the **read** path, and the cell below shows it: a valid PDF parses
fine and reports only that it has no manifest, whereas a CSV is not a recognised type at
all. So PDF is genuinely **read-only** — implemented for reading, absent for writing —
while the others are unknown types entirely.


```python
rc, out, err = c2pa(WORK / "t.pdf")
print("read valid PDF :", (err.strip() or out[:60]))     # parses fine, just has no manifest
rc, out, err = c2pa(WORK / "t.csv")
print("read CSV       :", err.strip())                    # not even recognised
print()
print("--sidecar rescue attempt:")
rc, _, err = c2pa(WORK / "t.pdf", "-m", man_path, "-o", WORK / "sc.pdf", "-s", "-f")
print("  PDF sidecar  :", "OK" if rc == 0 else err.strip().splitlines()[-1])
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/demo_out/t.pdf
    read valid PDF : Error: No claim found
    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/demo_out/t.csv
    read CSV       : Error: Unsupported file type
    
    --sidecar rescue attempt:
    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/demo_out/t.pdf -m /home/leondgarse/workspace/msi5006_tests/demo_out/manifest.json -o /home/leondgarse/workspace/msi5006_tests/demo_out/sc.pdf -s -f
      PDF sidecar  :     type is unsupported


**PDF is read-only and `--sidecar` does not help.** There is no route to attach C2PA to
a PDF or Office document with this tool.

Worth knowing for context: Adobe *does* ship C2PA-signed PDFs in production (we verified
a real one, issuer "Adobe Inc.") using internal tooling. So this is a **tooling gap in
the open-source library, not a limitation of the standard**.

### 7b. Proof that PDF read really works: a production Adobe-signed PDF

`sample/adobe-pdf.pdf` is a real PDF signed by Adobe in production — not a test fixture. It settles the read/write question with evidence rather than error messages.


```python
ADOBE_PDF = SAMPLE / "adobe-pdf.pdf"

if not ADOBE_PDF.exists():
    print("sample/adobe-pdf.pdf not present — skipping")
else:
    store = read_manifest(ADOBE_PDF)
    am = store["manifests"][store["active_manifest"]]
    print("file            :", ADOBE_PDF.name, f"({ADOBE_PDF.stat().st_size:,} bytes)")
    print("format          :", am.get("format"))
    print("claim_generator :", am.get("claim_generator"))
    print("issuer          :", am["signature_info"]["issuer"],
        "/", am["signature_info"]["common_name"])
    print("signed at       :", am["signature_info"]["time"])
    print("manifests       :", len(store["manifests"]), "(edit history)")
    print("validation_state:", store.get("validation_state"))
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/adobe-pdf.pdf
    file            : adobe-pdf.pdf (626,615 bytes)
    format          : application/pdf
    claim_generator : Adobe_Express/1.0.0 adobe_c2pa/0.7.11 c2pa-rs/0.28.1
    issuer          : Adobe Inc. / cai-prod
    signed at       : 2023-11-27T17:46:19+00:00
    manifests       : 3 (edit history)
    validation_state: Valid


`issuer: Adobe Inc.`, `common_name: cai-prod` — a genuine production certificate, not
the test cert used elsewhere in this notebook. The store holds **3 manifests**: an edit
history, reachable through ingredients.

So C2PA-in-PDF is not hypothetical. Adobe shipped it in 2023 using internal tooling
(`adobe_c2pa/0.7.11` alongside `c2pa-rs/0.28.1`). Our `c2patool` reads it perfectly —
but watch what happens when we try to write:


```python
if ADOBE_PDF.exists():
    rc, out, err = c2pa(ADOBE_PDF, "-m", man_path, "-o", WORK / "adobe_resigned.pdf", "-f")
    print("re-sign the same PDF we just read:",
          "OK" if rc == 0 else err.strip().splitlines()[-1])
```

    cmd: c2patool /home/leondgarse/workspace/msi5006_tests/sample/adobe-pdf.pdf -m /home/leondgarse/workspace/msi5006_tests/demo_out/manifest.json -o /home/leondgarse/workspace/msi5006_tests/demo_out/adobe_resigned.pdf -f


    re-sign the same PDF we just read:     type is unsupported


`type is unsupported`. We can **read** Adobe's signed PDF in full but cannot **write**
one — even to the very file we just parsed.

That reframes the project's central constraint: this is a **tooling gap in the
open-source library, not a limitation of the C2PA standard**. The format supports it and
Adobe ships it. Upstream, PDF write was closed `not_planned` (issue #527), so the gap
will not close on its own — which is precisely why the hybrid with MSD exists.

## Summary

| Question | Answer |
|---|---|
| Can C2PA carry custom JSON? | **Yes** — open vocabulary, any label |
| Can we extract it back? | **Yes** — verified round-trip |
| Maximum size? | **No practical cap** — memory-bound, not spec-bound (§6) |
| Is tampering detected? | **Yes** — `assertion.dataHash.mismatch` on one flipped byte |
| Is structured data safe? | **No — must be string-wrapped** (§5) |
| Which file types? | **Write media only; PDF reads.** No CSV or Office support |

**Two things to carry into the sponsor meeting**

1. C2PA handles our data volume comfortably, but numeric arrays are silently corrupted
   unless we serialize them to strings first. That is a hard requirement, not a
   preference.
2. The blocker is file format, not capacity. Since the stated objective is *document*
   auditability, and C2PA cannot write a single document format today, that gap — not
   the standard's design — is what the adoption decision turns on.

Artifacts are in `demo_out/`. Full written analysis: `WEEK2_FINDINGS.md`.
