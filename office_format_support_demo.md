# C2PA Office Support: Shipped, but Not Yet Usable

**MSI5006 capstone — Team 3S × Staple AI**

On **2026-09-04**, `contentauth/c2pa-rs` merged
[PR #499](https://github.com/contentauth/c2pa-rs/pull/499) — *"Add ZIP support (+ EPUB,
Office Open XML, Open Document, and OpenXPS)"*. It had been open since **8 July 2024**,
blocked on a spec contradiction: C2PA requires the ZIP central-directory CRC32 to be zero,
while the ZIP specification requires CRC32 for integrity.

This matters to us more than any other upstream change. Every previous report said:

> *"Write support is media-only. PDF, CSV, JSON, TXT, HTML, DOCX, XLSX, PPTX all fail with
> `type is unsupported`."*

That statement is now out of date, and the Week 4 conclusion built on it — that MSD's
defensible ground is *structured provenance inside business documents* — needs re-testing
rather than repeating.

**This notebook establishes what actually works on `c2patool 0.27.22`.** The answer turns
out to be more interesting than either "it works" or "it doesn't".

| § | Question |
|---|---|
| 1 | Which formats does 0.27.22 accept? |
| 2 | Does a signed Office file round-trip and stay valid? |
| 3 | How is the manifest embedded? |
| 4 | ⚠️ Can it sign a **real** Office document? |
| 5 | The repack workaround, and what it costs |
| 6 | What is still unsupported |
| 7 | What this changes for the project |

## 1. Setup — and the format probe

Note this notebook pins **0.27.22** explicitly rather than using whatever is on `PATH`,
because the behaviour under test is new. Set `C2PATOOL` to your own 0.27.22+ binary.


```python
import json, subprocess, shutil, zipfile, os, io, contextlib
from pathlib import Path

ROOT   = Path.cwd()
SAMPLE = ROOT / "sample"
WORK   = ROOT / "office_out"
shutil.rmtree(WORK, ignore_errors=True); WORK.mkdir(exist_ok=True)

# 0.27.22+ required — Office handlers landed in 0.27.18..22
C2PATOOL = os.environ.get("C2PATOOL_0_27_22") or shutil.which("c2patool") \
           or str(Path.home() / "local_bin" / "c2patool")

def c2pa(*args):
    r = subprocess.run([C2PATOOL, *map(str, args)], capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr

ver = subprocess.run([C2PATOOL, "--version"], capture_output=True, text=True).stdout.strip()
print("c2patool:", ver)
if ver.split()[-1] < "0.27.18":
    print("  !! Office support needs >= 0.27.18 — results below will show 'type is unsupported'")
```

    c2patool: c2patool 0.27.22



```python
MANIFEST = {
    "claim_generator_info": [{"name": "StapleAI-office", "version": "0.1.0"}],
    "title": "office format probe", "alg": "es256",
    "private_key": str(SAMPLE / "es256_private.key"),
    "sign_cert":   str(SAMPLE / "es256_certs.pem"),
    "assertions": [{"label": "com.staple.record",
                    "data": {"payload_json": json.dumps(
                        {"invoice_no": "INV-8842", "total": 12340.50})}}],
}
MPATH = WORK / "manifest.json"; MPATH.write_text(json.dumps(MANIFEST))

def try_sign(src, tag):
    """Attempt to sign `src`; return (output_path_or_None, error_line)."""
    dst = WORK / f"signed_{tag}{Path(src).suffix}"
    if dst.exists(): dst.unlink()
    rc, _, err = c2pa(src, "-m", MPATH, "-o", dst, "-f")
    ok = dst.exists() and dst.stat().st_size > 0
    line = err.strip().splitlines()[-1].strip() if err.strip() else ""
    return (dst if ok else None), line
```

### The probe set

Minimal ZIP-based files, one per format the PR claims to support, plus the formats we know
are still out of scope.


```python
probes = {}
for ext in ("docx", "xlsx", "pptx"):
    p = WORK / f"min.{ext}"
    with zipfile.ZipFile(p, "w") as z:
        z.writestr("[Content_Types].xml", "<Types/>")
    probes[f"min.{ext}"] = p
for name, mime in (("min.epub", "application/epub+zip"),
                   ("min.odt",  "application/vnd.oasis.opendocument.text")):
    p = WORK / name
    with zipfile.ZipFile(p, "w") as z:
        z.writestr("mimetype", mime)
    probes[name] = p

(WORK / "t.csv").write_text("a,b\n1,2\n");     probes["t.csv"]  = WORK / "t.csv"
(WORK / "t.json").write_text('{"a":1}');         probes["t.json"] = WORK / "t.json"
(WORK / "t.txt").write_text("hello\n");         probes["t.txt"]  = WORK / "t.txt"
probes["adobe.pdf"] = SAMPLE / "adobe-pdf.pdf"

print(f"{'file':12} {'signs?':8} {'result'}")
print("-" * 64)
for name, path in probes.items():
    out, err = try_sign(path, name.replace(".", "_"))
    if out:
        print(f"{name:12} {'YES':8} {path.stat().st_size:,} -> {out.stat().st_size:,} bytes")
    else:
        print(f"{name:12} {'no':8} {err[:44]}")
```

    file         signs?   result
    ----------------------------------------------------------------
    min.docx     YES      144 -> 14,488 bytes
    min.xlsx     YES      144 -> 14,488 bytes
    min.pptx     YES      144 -> 14,488 bytes
    min.epub     YES      134 -> 14,456 bytes
    min.odt      YES      153 -> 14,474 bytes
    t.csv        no       type is unsupported
    t.json       no       type is unsupported
    t.txt        no       type is unsupported
    adobe.pdf    no       type is unsupported


**DOCX, XLSX, PPTX, EPUB and ODT now sign.** That is the headline, and it is real — the
handler exists and produces a valid manifest.

CSV and JSON still fail, as expected. `.txt` fails too: the A.8 plain-text handler
([#2494](https://github.com/contentauth/c2pa-rs/pull/2494)) and the A.9 structured-text
handler ([#2283](https://github.com/contentauth/c2pa-rs/pull/2283)) both merged on
2026-09-10/11, but as **experimental features behind non-default cargo flags**, so a stock
release binary does not enable them.

PDF still fails — see §6.

## 2. Does the signed Office file round-trip?

Signing is only useful if the payload comes back and the document still works.


```python
signed_docx, _ = try_sign(probes["min.docx"], "roundtrip")

rc, out, _ = c2pa(signed_docx)
store = json.loads(out)
active = store["manifests"][store["active_manifest"]]

print("assertions      :", [a["label"] for a in active["assertions"]])
recovered = next(a["data"] for a in active["assertions"] if a["label"] == "com.staple.record")
print("payload         :", recovered)
print("validation_state:", store.get("validation_state"))
print("status          :", [s["code"] for s in store.get("validation_status", [])])
```

    assertions      : ['com.staple.record', 'c2pa.actions.v2']
    payload         : {'payload_json': '{"invoice_no": "INV-8842", "total": 12340.5}'}
    validation_state: Valid
    status          : ['signingCredential.untrusted']


`Valid`, with only the expected `signingCredential.untrusted` (our dev cert is deliberately
off the trust list — see `CLAUDE.md`).


```python
# Tamper: flip one byte in the middle of the archive
tampered = WORK / "tampered.docx"
b = bytearray(signed_docx.read_bytes()); b[len(b) // 2] ^= 0xFF
tampered.write_bytes(b)

rc, out, err = c2pa(tampered)
print("tampered file:", (err.strip() or out[:80]))
```

    tampered file: Error: Invalid checksum


Tamper detection works — the ZIP structure itself fails integrity before C2PA validation
is even reached.

## 3. How is the manifest embedded?

Spec Appendix A.6 describes ZIP-based embedding. Worth seeing which mechanism the
implementation chose, since we predicted the ZIP *comment* field in an earlier report.


```python
print("original :", zipfile.ZipFile(probes["min.docx"]).namelist())
print("signed   :", zipfile.ZipFile(signed_docx).namelist())
print()
z = zipfile.ZipFile(signed_docx)
print("archive comment:", repr(z.comment) if z.comment else "(empty)")
```

    original : ['[Content_Types].xml']
    signed   : ['[Content_Types].xml', 'META-INF/', 'META-INF/content_credential.c2pa']
    
    archive comment: (empty)


The manifest goes in as **a new ZIP entry, `META-INF/content_credential.c2pa`** — not the
archive comment. That is a clean choice: OOXML readers ignore unknown `META-INF` entries,
so the document stays openable, and the manifest is a normal file rather than a metadata
field with size limits.

It also means the manifest is **trivially strippable** by re-zipping, exactly like the
image case (`c2pa_demo.ipynb` §4b).

## 4. ⚠️ Can it sign a *real* Office document?

Everything so far used minimal fixtures built by hand. The obvious next test is a genuine
document — and this is where the result changes.

We have one to hand: `sample/openai-chatgpt-unsigned.docx`, the real ChatGPT export from
Week 4 that shipped without a manifest.


```python
real = SAMPLE / "openai-chatgpt-unsigned.docx"
out, err = try_sign(real, "real")
print("signing the real ChatGPT .docx:", "OK" if out else f"FAILED — {err}")
```

    signing the real ChatGPT .docx: FAILED — 1: compression method not supported: 8


`compression method not supported: 8`.

Method 8 is **DEFLATE** — ordinary ZIP compression. The implementation only accepts
**STORED** (uncompressed) entries.

Our minimal fixtures passed only because a single tiny entry written by `zipfile` defaults
to STORED. Let us confirm the rule directly.


```python
for method, label in ((zipfile.ZIP_STORED, "STORED"), (zipfile.ZIP_DEFLATED, "DEFLATE")):
    p = WORK / f"probe_{label.lower()}.docx"
    with zipfile.ZipFile(p, "w", method) as z:
        z.writestr("[Content_Types].xml", "<Types/>")
    out, err = try_sign(p, label.lower())
    print(f"  {label:8} -> {'SIGNS' if out else 'FAILS: ' + err[:44]}")
```

      STORED   -> SIGNS
      DEFLATE  -> FAILS: 1: compression method not supported: 8



```python
# What do real-world Office files actually use?
import importlib.util

def compression_of(path):
    return {i.compress_type for i in zipfile.ZipFile(path).infolist()}

rows = [("ChatGPT export", real)]

if importlib.util.find_spec("docx"):
    import docx
    d = docx.Document(); d.add_heading("Invoice INV-8842", 0)
    d.add_paragraph("Acme Trading Pte Ltd")
    gen = WORK / "generated.docx"; d.save(gen)
    rows.append(("python-docx", gen))

if importlib.util.find_spec("openpyxl"):
    import openpyxl
    w = openpyxl.Workbook(); w.active["A1"] = "total"; w.active["B1"] = 12340.50
    genx = WORK / "generated.xlsx"; w.save(genx)
    rows.append(("openpyxl", genx))

names = {0: "STORED", 8: "DEFLATE"}
print(f"{'source':16} {'entries':>8}  compression")
print("-" * 46)
for label, path in rows:
    z = zipfile.ZipFile(path)
    used = ", ".join(sorted(names.get(m, str(m)) for m in compression_of(path)))
    print(f"{label:16} {len(z.namelist()):>8}  {used}")
```

    source            entries  compression
    ----------------------------------------------
    ChatGPT export         17  DEFLATE
    python-docx            17  DEFLATE
    openpyxl                9  DEFLATE


**Every real Office file uses DEFLATE**, because that is what the format is for — a
`.docx` is a compressed archive of XML. So:

> The Office handler shipped, but **it cannot sign any Office document produced by real
> software** — not Word, not `python-docx`, not `openpyxl`, not ChatGPT's own export.

This is not a subtle edge case. It is every file anyone would actually want to sign.

## 5. The repack workaround, and what it costs

The obvious fix is to rewrite the archive with no compression before signing.


```python
def repack_stored(src, dst):
    zin = zipfile.ZipFile(src)
    with zipfile.ZipFile(dst, "w", zipfile.ZIP_STORED) as zout:
        for info in zin.infolist():
            zout.writestr(info.filename, zin.read(info.filename))
    return dst

if any(label == "python-docx" for label, _ in rows):
    src = WORK / "generated.docx"
    stored = repack_stored(src, WORK / "generated_stored.docx")
    out, err = try_sign(stored, "repacked")

    print(f"original          : {src.stat().st_size:>9,} bytes  (DEFLATE)")
    print(f"repacked STORED   : {stored.stat().st_size:>9,} bytes")
    print(f"after signing     : {out.stat().st_size:>9,} bytes" if out else f"sign failed: {err}")
    print(f"size multiplier   : {stored.stat().st_size / src.stat().st_size:>9.1f}x")
```

    original          :    36,635 bytes  (DEFLATE)
    repacked STORED   :   828,294 bytes
    after signing     :   844,828 bytes
    size multiplier   :      22.6x



```python
# Does the signed, repacked file still open as a Word document?
if importlib.util.find_spec("docx") and out:
    import docx
    doc = docx.Document(out)
    print("opens in python-docx :", True)
    print("heading              :", repr(doc.paragraphs[0].text))
    print("c2pa entry           :",
          [n for n in zipfile.ZipFile(out).namelist() if "c2pa" in n.lower()])
```

    opens in python-docx : True
    heading              : 'Invoice INV-8842'
    c2pa entry           : ['META-INF/content_credential.c2pa']


So the workaround **does** work end to end: repack uncompressed, sign, and the result is
both a valid Word document and a valid C2PA asset.

The cost is the problem. A 36 KB document becomes **~828 KB — roughly 23×** — because
nothing is compressed any more. For Staple's use case, where an AML file set might contain
dozens of documents, that is not a viable production path.

It is also worth noting what this does to the earlier size finding: the manifest is not the
overhead here, the *decompression* is.

## 6. What is still unsupported


```python
still_failing = ["adobe.pdf", "t.csv", "t.json", "t.txt"]
print(f"{'format':12} {'error'}")
print("-" * 60)
for name in still_failing:
    out, err = try_sign(probes[name], "recheck_" + name.replace(".", "_"))
    print(f"{name:12} {'SIGNS (!)' if out else err[:46]}")
```

    format       error
    ------------------------------------------------------------
    adobe.pdf    type is unsupported
    t.csv        type is unsupported
    t.json       type is unsupported
    t.txt        type is unsupported


**PDF remains the significant one.** Upstream closed PDF write as `not_planned`
([#527](https://github.com/contentauth/c2pa-rs/issues/527)) and nothing has changed that.
PDF is now *the only* document format in Staple's pipeline that C2PA tooling cannot write —
and it is the format the AML demo actually delivers (`aml_use_case_demo.ipynb`).

Also unchanged: the **numeric-array corruption** defect
([#2570](https://github.com/contentauth/c2pa-rs/issues/2570)), still open, still present in
0.27.22. Verify quickly, since this notebook already has a signed asset to hand:


```python
arr_manifest = dict(MANIFEST)
arr_manifest["assertions"] = [{"label": "org.example.test",
                               "data": {"values": [96, 384], "bbox": [420, 164, 35, 24]}}]
ap = WORK / "arr.json"; ap.write_text(json.dumps(arr_manifest))
src = WORK / "arr_in.jpg"; shutil.copy(SAMPLE / "image.jpg", src)
dst = WORK / "arr_out.jpg"
c2pa(src, "-m", ap, "-o", dst, "-f")

rc, out, _ = c2pa(dst)
d = json.loads(out); am = d["manifests"][d["active_manifest"]]
got = next(a["data"] for a in am["assertions"] if a["label"] == "org.example.test")
print("values [96,384]      ->", json.dumps(got.get("values")))
print("bbox [420,164,35,24] ->", json.dumps(got.get("bbox")))
print("validation_state     :", d.get("validation_state"))
```

    values [96,384]      -> "YIA="
    bbox [420,164,35,24] -> "pKQjGA=="
    validation_state     : Valid


Unchanged — still silently corrupted, still reported `Valid`. The string-wrapping
workaround from `c2pa_demo.ipynb` §5 remains mandatory.

## 7. What this changes for the project

### The honest summary

| Claim | Status |
|---|---|
| "C2PA write support is media-only" | **out of date** — Office/ZIP handlers exist |
| "C2PA can sign Office documents" | **not yet true in practice** — DEFLATE rejected |
| "PDF is unsupported" | **still true**, and now the only document-format gap |
| "Numeric arrays corrupt silently" | **still true** on 0.27.22 |

The accurate one-liner is: **C2PA Office support shipped in September 2026, but cannot yet
sign a real Office document.**

### Effect on the Week 4 position

Week 4 concluded that MSD's defensible ground is *structured provenance inside business
documents* — the intersection C2PA and W3C VC both miss. That conclusion is **weakened but
not overturned**:

- The *structural* argument is gone. C2PA is no longer architecturally media-only; the
  handler is merged and will presumably accept DEFLATE in a future release.
- The *practical* gap remains today, for both Office (compression) and PDF (unimplemented).
- The timeline shifted. PR #499 took **26 months** from open to merge. A DEFLATE fix is a
  much smaller change, so the Office gap could close quickly — but PDF has no PR at all.

### What to say, and what not to say

Do **not** say "C2PA can't do Office documents" — it is falsifiable in one command now, and
the team has already had to retract two claims of that kind.

Do say: *the handler landed after two years, but it rejects compressed archives, so no
document produced by Word, python-docx, openpyxl or ChatGPT can be signed without a 23×
repack. PDF remains unimplemented.* That is specific, verifiable, and does not depend on a
gap that may close next month.

### Worth reporting upstream

No open issue tracks the DEFLATE limitation (searched 2026-09-14). Filing one — with the
repro in §4 — would be a small, genuine contribution to the standard the team is
evaluating, and it is the kind of artifact an examiner can point at.

Companions: `c2pa_demo.ipynb`, `aml_use_case_demo.ipynb`, `provenance_graph_demo.ipynb`,
`w3c_vc_comparison.ipynb`, `computational_operation_demo.ipynb`.
