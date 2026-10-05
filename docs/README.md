# Marketing site — draft

Four layers, matching the structure agreed on the 10-02 call.

```
index.html              landing — high level, catchy, mostly links (~300 words)
business.html           "if I'm in finance, how do I understand this?"
cases/accounting.html   accounts payable
cases/kyc.html          KYC onboarding
cases/ai-agent.html     AI agent decisions
style.css               shared styles
media/                  videos + poster frames
```

**View it:** open `index.html`, or publish with GitHub Pages
(Settings → Pages → Deploy from branch → `main` / `/docs`).

## Why it is split this way

From the call: the landing page *"should just be very high level and a bit catchy and give
the links"*, because *"nobody reads"* a page they have to scroll to the end of — *"you have
to tell the story through the visuals and the headings."* Depth belongs on the business page
instead, which answers *"if I'm in finance, how can I understand this from a business
perspective?"* Technical depth stays on the existing msd-protocol.org pages.

Case pages are built to be understood *"in 10 seconds if you're from the field"* — video
first, then the chain, then the limits.

The register is deliberately not simplified to nothing: *"we don't want the simplest possible
AI description in there, because different people with technical knowledge — it's to
communicate it clearly and concisely."*

## Porting to msd-protocol.org

This is a staging surface for writing and review; the content is the deliverable, not the
shell. `style.css` mirrors the live site's design tokens (`--bg`, `--text-1`, `--primary`,
`--teal`, the radius and shadow scale, Inter / Manrope / JetBrains Mono), so re-expressing
these as Svelte components should be close to mechanical.

## Notes

- Scenarios use synthetic data and depict no real organisation. Staple is not used as a case
  — per the call, examples not by Staple persuade more.
- Every page ends with what MSD cannot tell you. That is deliberate: an audit audience
  distrusts tools claiming to settle everything.
- Case pages share one skeleton, so a fourth is cheap to add.
