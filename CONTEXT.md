# Context Handoff — C2PA / MSD verification session

## Who / what

MSI5006 capstone, Team 3S × Staple AI (Singapore). Topic: MSD (Meta Structured Data),
an open protocol for cryptographic provenance of AI-extracted structured data.
Comparing it against C2PA. Team of 3. Sponsor meeting Thursday.

Working dir: `~/workspace/msi5006_tests`
`c2patool 0.27.15` installed. `sample/` extracted from a c2pa-rs GitHub release:

```
sample/
├── allowed_list.pem      trust: allowed signer list
├── C.jpg                 pre-signed test image
├── es256_certs.pem       dev signing cert (NOT on C2PA trust list)
├── es256_private.key     dev private key
├── image.jpg             unsigned
├── ps256.pem / ps256.pub
├── store.cfg             trust config
├── test.json             manifest definition
└── trust_anchors.pem     trust: root anchors
```

## Goal of this session

Empirically verify claims made in the report. Priority order:

1. **PDF write** — `c2pa-rs` docs list PDF as read-only. Confirm `c2patool` refuses to
   sign a PDF, and capture the exact error. Confirm it *can* read a signed one.
2. **Office / CSV** — confirm docx/xlsx/csv are unsupported in the implementation.
3. **Trust flags** — verify `sample/C.jpg` twice: with and without
   `trust_anchors.pem` / `allowed_list.pem` / `store.cfg` loaded. Check
   `c2patool --help` for the current flag names (CLI surface has moved recently —
   read the actual help, don't assume).
4. **Tamper test** — sign `image.jpg`, flip one pixel, re-verify, capture the failure.
5. **Custom assertion** — sign with a `com.staple.field-derivation` label and confirm
   it round-trips through read.
6. **MSD comparison** — `pip install msd-sdk` (v0.2.8), sign/embed/verify a dict and
   a PDF. Confirm `verify()` returns `signature_is_trusted: False`.

## Key facts already established (don't re-derive)

**C2PA signature scope.** Signature covers the *claim*. Claim contains hashes of every
assertion + the hard binding (SHA-256 of asset bytes, with exclusions). So it transitively
covers content + assertions. COSE + X.509. Algs: ECDSA P-256/384, Ed25519, RSA-PSS.

**Data structure.** Read output is a manifest *store*: `active_manifest` pointer +
`manifests{urn: {claim_generator_info, assertions[], ingredients[], signature_info,
validation_status}}`. Each edit appends a manifest; prior ones reachable via `ingredients`.
Multi-parent ingredients supported. `validation_status` computed at read time.

**Container.** JUMBF (ISO 19566-5) embedded in file. Full cert chain travels inside →
offline verification works. `ta_url` = RFC 3161 timestamp, needs network at sign time.
Sidecar/external manifests exist for formats that can't embed.

**Manifest JSON is not the manifest** — it's a declarative input to produce binary JUMBF.
`alg` / `private_key` / `sign_cert` / `ta_url` are tool-specific, not spec fields.
Paths resolve relative to the manifest file unless `base_path` set.

**verify.contentauthenticity.org on sample/C.jpg** shows process detail (claim generator
"make test images", actions Created + Drawing, issuer "C2PA Test Signing Cert", 2022-08-20)
AND an "unrecognised issuer" warning. Two separate results: signature+binding VALID,
cert chain NOT on trust list. Do NOT call this "verification failed."

**MSD envelope.** `data (any Python type) + metadata (dict) + timestamp`, Ed25519 over
`BLAKE3(data) ‖ BLAKE3(metadata) ‖ timestamp`. Rust `zef` backend.
`embed()`: dicts via Unicode variation-selector steganography into an `__msd` key
(renders as 🔏, stays valid JSON); files via binary embedding incl. PDF/Word/Excel/PPT.
It's **signing, not encryption** — integrity + authenticity, no confidentiality.

**MSD known gaps (from README).** Trust chain not implemented — `verify()` always returns
`signature_is_trusted: False`. No edit-history primitive. No field-derivation schema
(`metadata` is a free-form dict, no convention, no validation).

**Format coverage — spec vs implementation (the crux).**
Spec 2.4 appendices define embedding for PDF (A.4), BMFF (A.5), ZIP-based i.e. Office (A.6),
HTML (A.7), unstructured text (A.8), **structured text (A.9)**. Spec 2.1 had only the first
three — C2PA is expanding toward MSD's territory. `c2pa-rs` implements media only,
PDF read-only, no Office/CSV. **So MSD's lead is implementation progress, not architecture.**

## Claims already retired (do not repeat)

- ❌ "MSD handles human modification, C2PA is AI-only" — `c2pa.actions` was built for
  human editing (Adobe/BBC) before generative AI.
- ❌ "MSD has better chain of custody" — C2PA has ingredients + X.509 + RFC 3161; MSD none.
- ❌ "C2PA can't work in a pipeline" — `c2pa-python` supports stream ops.
- ❌ "MSD does field-level provenance" — no primitive exists today.
- ❌ "C2PA can't express field provenance" — assertion labels are an open vocabulary; a
  custom `com.staple.field-derivation` assertion is hashed into the claim and signed.
  C2PA is *more* expressive here than MSD's unschema'd metadata dict.

## The surviving differentiator (narrow but defensible)

C2PA provenance is **anchored to an asset and resolved by reference** — to verify a value
downstream you must retrieve the source asset or a manifest repository, then re-hash and
compare. MSD provenance is **carried inside the value** — the JSON object verifies standing
alone, no retrieval, no dependency on the source file still existing.

Plus, holding today: signs objects with no bytes (in-memory dict); signature survives inside
JSON through REST/queues/Postgres jsonb; zero signing cost, no network; PDF/Office write.

## Open items

- 🔴 Read C2PA spec 2.4 **Appendix A.9 (Embedding Manifests into Structured Text)**.
  If it covers Staple's scenario the differentiation needs rebuilding.
- 🔴 Prepare an answer to: *why not just use a C2PA custom assertion instead of MSD?*
- Benchmark vs **W3C Verifiable Credentials** — JSON-native, W3C Rec, signed structured
  claims. Strongest expected challenge. Also in-toto/SLSA, Sigstore.
- Test `__msd` survival: JSON → Postgres → REST → pandas → CSV → Excel.

## Links

- spec 2.4 https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html
- c2pa-rs https://github.com/contentauth/c2pa-rs
- supported formats https://github.com/contentauth/c2pa-rs/blob/main/docs/supported-formats.md
- manifest docs https://github.com/contentauth/c2pa-rs/blob/main/cli/docs/manifest.md
- c2pa-python https://github.com/contentauth/c2pa-python
- verify https://verify.contentauthenticity.org/
- msd-sdk https://github.com/msd-protocol/msd-sdk-python
