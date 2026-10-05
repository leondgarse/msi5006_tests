# Marketing site — draft

A static site: one landing page and three use-case pages, each built around a 30-second
video. No build step, no dependencies, no external requests.

```
index.html              landing page — general video
cases/accounting.html   accounts payable
cases/kyc.html          KYC onboarding
cases/ai-agent.html     AI agent decisions
style.css               shared styles
media/                  videos + poster frames
```

**View it:** open `index.html`, or publish with GitHub Pages
(Settings → Pages → Deploy from branch → `main` / `/docs`).

## Porting to msd-protocol.org

This is a staging surface for writing and review — the content is the deliverable, not the
shell. `style.css` deliberately mirrors the live site's design tokens (`--bg`, `--text-1`,
`--primary`, `--teal`, the radius and shadow scale, Inter / Manrope / JetBrains Mono), so
re-expressing these pages as Svelte components should be close to mechanical.

## Notes

- Scenarios use synthetic data and depict no real organisation.
- Each case follows the same skeleton — situation, what goes wrong, the chain, what the
  auditor does, what it still cannot tell you — so further cases are cheap to add.
- The "what it cannot tell you" section is deliberate, not hedging: an audit audience
  distrusts tools that claim to settle everything.
