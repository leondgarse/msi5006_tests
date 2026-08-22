# C2PA demo notebook

Live demonstration for the Week 2 action item:
*"Conduct an experiment to demonstrate updating a file with custom data via C2PA and
subsequently verify that the data can be correctly extracted."*

## Run it

```bash
cd ~/workspace/msi5006_tests
jupyter notebook c2pa_demo.ipynb      # then Kernel -> Restart & Run All
```

Or headless:

```bash
jupyter nbconvert --to notebook --execute --inplace c2pa_demo.ipynb
```

Takes ~30 s. Outputs land in `demo_out/` (~15 MB, safe to delete; regenerated on run).

## Requirements

- `c2patool` on `PATH` or at `~/local_bin/c2patool` (tested with 0.27.15)
- `sample/` containing `es256_private.key`, `es256_certs.pem`, `image.jpg`, `C.jpg`,
  `trust_anchors.pem`, `allowed_list.pem`, `store.cfg`
- Python: `nbformat`, `jupyter`

No network access needed.

## Sections

1. Setup and preflight
2. **The action item** — embed a custom OCR payload, extract it back, verify round-trip
3. Tamper detection — flip one byte, catch `assertion.dataHash.mismatch`
4. Signature validity vs. certificate trust (two separate results)
4b. **A real Google/Gemini production signature** — full cert chain, RFC 3161 timestamp,
    the `Valid` → `Trusted` → `Invalid` progression, and manifest strippability
5. ⚠️ Silent numeric-array corruption, and the string-wrapping fix
6. Payload size scaling
7. Format support — what C2PA refuses to sign

## Notes for presenting

- §5 is the finding worth pausing on: C2PA reports `validation_state: Valid` while the
  embedded data is corrupted. Numeric arrays like `[420,164,35,24]` do not survive.
- §4 matters for reporting accuracy: `signingCredential.untrusted` means *"unrecognised
  issuer"*, not *"verification failed"*. The dev cert is deliberately off the trust list.
- §7 is the constraint the adoption decision turns on — media only, no PDF or Office write.
- §4b is the most convincing section for a sceptical audience: a genuine Google
  signature, verified offline from the chain inside the file. It also shows a plain
  image re-save silently stripping the manifest.

§4b needs `Gemini_Generated_Image_cdcj9jcdcj9jcdcj.jpeg` in the project root and Pillow
for the strip test; it skips cleanly if either is missing.

`c2pa_demo.ipynb` is the source of truth — edit it directly in Jupyter. To refresh the
exported `c2pa_demo.md` after changes:

```bash
jupyter nbconvert --to markdown c2pa_demo.ipynb
```

Full written analysis: `WEEK2_FINDINGS.md`.
