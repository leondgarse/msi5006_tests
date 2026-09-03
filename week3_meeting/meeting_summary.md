# Context — Week 3 verification session

Continues from CONTEXT.md. Working dir `~/workspace/msi5006_tests`.
Week 2 report (C2PA capability tests) is done and was presented 08-28.
This file records what the 08-28 sponsor call changed, and what to verify next.

## Who said what (08-28 call)

- **Ulf Bissbort** — creator of MSD, MIT/SUTD. The authority on intent.
- **Josh Kettlewell** (Staple) — runs the project, wants a sellable pitch.
- **Zhuchao Li** (Staple Shanghai) — technical pre-sales, explains MSD to clients.
- Team: Gavin (leon.D. Garse), Lamphare.

## 🔴 The scope correction — this reframes everything

Ulf, ~00:11–00:12, verbatim gist:

> "the embedding into existing file types is **orthogonal** to the signing and the
> existence of metadata... C2PA is purely about the second part, that you embed it in
> there... I would recommend that we distinguish the two parts, because they're not
> the same thing."

MSD has two separable halves:

- **(a) External graph** — a tracked store of signed data + dependencies. The file
  itself need not know it was signed. Metadata can be attached later, by others.
- **(b) Embedding** — putting bytes into a file. This is all C2PA does.

**All of Week 2 tested (b).** Format coverage, size limits, array corruption, interop
ordering, nesting. That is the half where MSD is behind. The Week 2 recommendation
("adopt C2PA as the standard, MSD as document-format stopgap") was therefore reached
on the wrong axis and should be treated as provisional.

## The differentiator Ulf actually named (untested)

~00:30–00:33. A verifiable **dependency DAG with selective disclosure**:

- **Root nodes** = where data enters the digital world. Example he gave: a Food Panda
  delivery driver photographs a scribbled paper receipt, adds geolocation, signs it.
- **Derived data** = those records flow through Staple, get reconciled, end up as a
  figure in a quarterly earnings spreadsheet.
- **The question MSD answers:** looking at that spreadsheet cell, which inputs produced
  it — "other than trust me, bro."
- **Selective disclosure:** expose only the subgraph relevant to one customer or
  auditor. You do not hand over all your logs.
- **Post-hoc attachment:** "you can add the metadata later... somebody else can sign it
  and you can get it later... the auditor 5 years later can be like, hey I need this."

Josh's paraphrase, ~00:32: today Staple ships a signed log — still "here's what Staple
did according to Staple's logs." The advantage is letting a bank verify the **actual
source files**, not a signed log payload.

**Josh's limiting case (~00:24), unanswered:** if the recipient gets only ONE file,
interlinkability buys nothing — they are back to trusting the log. The differentiator
requires multi-file, multi-party context.

## 🔴 If the differentiator is the graph, the competitor set changes

C2PA stops being the relevant comparison. The real neighbours become:

- **W3C Verifiable Credentials** — JSON-native, W3C Recommendation, signed structured
  claims, selective disclosure via BBS+ / SD-JWT. Closest collision. Highest priority.
- **in-toto / SLSA** — signed attestation DAGs for supply chains. Same shape: artifacts,
  materials, products, link metadata.
- **W3C PROV-O** — the provenance data model itself (entity / activity / agent,
  wasDerivedFrom). No crypto, but the vocabulary MSD would need.
- **RFC 3161 / Sigstore** — timestamping and transparency logs.

## Verification tasks

### 1. Does the SDK support ANY of the graph story? (priority)
`~/workspace/msd-sdk-python`, v0.2.8 / zef 0.1.56.
- Is there any linking / reference / derivation primitive? Grep the API surface.
- Can envelope A reference envelope B by content hash? Is that verifiable?
- **Post-hoc attachment:** can a third party attach signed metadata to an existing
  entity *after* the fact, without re-signing the original? Ulf says yes by design.
  Test it. C2PA structurally cannot do this — manifests seal at sign time.
- Selective disclosure: any mechanism, or does verification need the whole graph?
- `add_to_trust_network()` / `is_trusted()` — what do they actually store?

Expected outcome: most of this is NOT in the Python SDK. Establish precisely what is
missing, because that gap is the capstone contribution.

### 2. Build the three-node demo
Minimal end-to-end: source receipt → extracted record → derived aggregate.
Sign each, link them, then answer "which inputs produced this number" by traversal.
If the SDK can't do it, do it manually with content hashes in `metadata` and document
exactly which primitives were missing. That artifact IS the deliverable.

### 3. W3C Verifiable Credentials head-to-head
`pip install didkit` or use `vc-data-model` examples. Sign a credential, do selective
disclosure with SD-JWT. Then answer, honestly: what does MSD do that VC does not?
This is the strongest expected challenge and nobody has prepared for it.

### 4. Gavin's assigned action item (nearly complete)
"Determine if public keys are accessible within C2PA metadata during verification."
Answered in Week 2 Addendum 4: leaf + ICA certs travel inside the file, chain to
Google C2PA Root CA G3, RFC 3161 timestamp, verifies offline.
Still to add: identity rests on the **C2PA Trust List** from the conformance program,
not a pointer to a key. And Ulf's real question — how does an ordinary employee check
this against corporate rules without opening Python — has the answer **no such tooling
exists, for C2PA or MSD**. That is a gap in both, which is a better finding than a
comparison win.

### 5. Re-check the tokolosh failure with the graph in mind
Week 2 found dict-`embed()` panics offline needing a network service on ports
27021–27040. If MSD's core is an external tracked store rather than embedding, that
network dependency may be intended architecture rather than a bug. Ulf is on the call —
ask him directly. Re-test whether `sign`/`verify`/link operations need the network too.

## ⚠️ Claims to correct before anything is published

- Gemini notes expand MSD as **"Media Signature Data"**. It is **Meta Structured Data**.
- Notes say "potential file corruption". The real finding is **silent numeric-array
  corruption inside custom assertions** (JSON→CBOR coercion) — narrower and more useful.
- Notes state Adobe **blocks** PDF write "by format ownership". Evidence supports
  deprioritisation (#527 closed `not_planned`), not intent. Adobe ships C2PA-signed PDFs
  via internal tooling. Say "upstream deprioritised it", not "Adobe blocks it".
- Josh floated positioning MSD by publicly attacking C2PA as closed-source Adobe
  control. **c2pa-rs is Apache-2.0/MIT under Linux Foundation JDF.** Falsifiable in one
  click. Do not run this line.
- "OpenAI/Anthropic use C2PA" is true only for **images/video**. Anthropic needed a
  separate statistical watermark for text. Do not cite as general validation.

## Other threads from the call

- **Lamphare — Visa Trusted Agent Protocol (TAP).** Verifying whether an AI agent is
  trusted to transact on a client's behalf. Josh liked it: "it doesn't matter who's
  using a protocol, human or automated flow." Note TAP is *authorisation* of agent
  actions, not *provenance* of data — complementary layer, not a competitor.
- **Ulf's adoption argument:** enterprise workers will not open Python to inspect
  metadata. Needs trust rules, key revocation, and automatic under-the-hood checks.
  "If it's going to reduce productivity by 20%, I don't see anybody using that."
  Independently corroborated by Huawei Shield Lab (08-31 session), who raised the same
  UX-borne-trust point from a different direction. The bottleneck is tooling, not crypto.
- **Josh, bluntly:** "MSD is not anywhere right now. It's in Staple." No ecosystem.

## Open questions for the sponsor

1. Is the project about (a) the graph or (b) the embedding? Ulf asked for this to be
   distinguished; it has not been decided. Everything else depends on it.
2. Is post-hoc third-party attachment actually implemented, or design intent?
3. Is the tokolosh network dependency intended architecture?
4. What is the answer to Josh's single-file limiting case?
5. Access: still no internal Jenkins. Sandbox tenant? Sample corpus? API key?

## Assigned next steps (from the call)

- [Gavin] Verify C2PA key accessibility — see §4, nearly done.
- [Group] Define the pitch: core customer problem + value proposition.
- [Group] Research MSD interlinkability — this is §1 and §2 above, and it is the
  real work.
- [Josh] Share MSD use-case videos; schedule a 1-hour follow-up.
