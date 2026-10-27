# Marketing site — draft

Four layers, matching the structure agreed on the 10-02 call.

```
index.html              landing — high level, catchy, mostly links (~370 words)
business.html           "if I'm in finance, how do I understand this?"
community.html          open protocol, honest stage, how to get involved
cases/accounting.html   accounts payable
cases/kyc.html          KYC onboarding
cases/ai-agent.html     AI agent decisions
style.css               shared styles
media/                  videos, video frames, and *-cover.jpg posters (1920x1080)
files/                  msd-pitch-deck.pdf, the sign-up download
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
shell. Since 2026-10-27 `style.css` follows the **MSD Brand Guidelines v1.0, light (pitch
deck) style**: paper `#F6F4EE`, ink `#14181F`, brand teal `#0F7B6C`, amber `#B8500C` for
missing steps only; Georgia regular for headlines, Helvetica/Arial for body and labels;
16px cards with a teal top edge, fully rounded buttons. The three step states are the same
everywhere: verifiable = mint fill + teal border, attested = white + ink border, missing =
amber tint + dashed amber border. All tokens sit in `:root`, so moving to the dark
metastructured.ai style is a token swap and needs no markup changes.

## Borrowed from in-toto.io

in-toto is the closest comparison — an early protocol without a logo wall to lean on. Three
devices taken from it:

- **Full-width colour bands** carry the landing page instead of boxed sections on a neutral
  ground. Each band does one job and the eye can skip between them.
- **A one-sentence explainer band** right after the hero, before any mechanism.
- **Three feature cards, one sentence each**, with a "read more"-style link.

Their *ecosystem* page was deliberately **not** copied: it works because they have real
adopters to list, and ours would be an empty room. The community page carries the
honest-stage message instead. Blog and News were also skipped — both look abandoned without
a publishing cadence.

## Notes

- Scenarios use synthetic data and depict no real organisation. Staple is not used as a case
  — per the call, examples not by Staple persuade more.
- Every page ends with what MSD cannot tell you. That is deliberate: an audit audience
  distrusts tools claiming to settle everything.
- Case pages share one skeleton, so a fourth is cheap to add.

## Cover images

The video posters and the use-case cards use `media/msd-*-cover.jpg`, not frames from the
videos: at card size a frame of a provenance graph is unreadable (asked on the 10-21
review). The background art was generated with Gemini (`gemini-3-pro-image`) using the
imagery brief in the brand guidelines §7. That means a teal-to-mint gradient, glass
documents, white node chains, and amber only for the missing piece, with no text, people
or padlocks. The label, Georgia headline and footer were then set over it in HTML, so the
type is exact and stays on brand. The headlines are the pitch deck's own slide titles.
