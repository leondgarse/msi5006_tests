# Handover — running this site yourselves

Everything here is plain HTML, one stylesheet and one script. No build step, no
framework, no package manager. Opening `docs/index.html` in a browser is the whole
development environment.

It was written to be **ported into the existing msd-protocol.org**, not hosted alongside
it. What transfers is the content and the markup; the styling deliberately mirrors the
existing site's tokens so it should look close without being adjusted.

---

## 1. Things to change before this is yours (two of five now done)

In order of how much they matter. §1.1 (mailbox) and §1.3 (PDF) were settled on 2026-10-27; §1.2 (the analytics account) is the one left that is ours on your site.

### 1.1 ✅ The sign-up mailbox — `docs/msd-analytics.js`

```js
var SIGNUP_MAILBOX = 'hello@metastructured.ai';
```

**Settled 2026-10-27.** This is the address the pitch deck's closing slide and
metastructured.ai's own contact form already give. A sign-up opens a short pre-written
message to it in the visitor's mail client.

If you would rather collect sign-ups without a mail client in the way, set an endpoint
and the `mailto:` is never used:

```js
window.MSD_SIGNUP_ENDPOINT = 'https://your-form-endpoint.example/subscribe';
```

With that set, the form POSTs `{email, page, placement}` as JSON and shows a confirmation.
metastructured.ai is on Netlify, so a Netlify Form is the shortest route to one.

### 1.2 🔴 The analytics account — `docs/msd-analytics.js`

```js
var UMAMI_WEBSITE_ID = '4cb907b0-a4ec-4c89-bfc9-680d0b41a116';
```

Registered on a **student's free Umami Cloud account**, for the domain
`leondgarse.github.io`. Two consequences: the data is in an account you do not control,
and the id is tied to a hostname that is not yours, so it will not record your traffic
correctly anyway.

Create your own site at [cloud.umami.is](https://cloud.umami.is) and paste the new id
over it. That is the only edit. Setting it to `''` disables collection entirely and the
page then makes **no external request at all** — a working state, not a broken one.

Why Umami rather than Mixpanel, which was suggested on the 2026-10-16 call: Mixpanel and
Google Analytics both set cookies, which on your domain means either a consent banner or
a tracker without one. That is your decision, not ours to pre-empt. Umami sets no cookies
and collects no personal data, and is MIT-licensed, so you can self-host it later without
any of the event names changing.

**Mixpanel is supported, off by default.** Since you already use it, put your project
token in the page before the script and every event goes to Mixpanel as well, under the
same names:

```html
<script>window.MSD_MIXPANEL_TOKEN = 'your-project-token';</script>
<script src="msd-analytics.js" defer></script>
```

The library is pinned (`mixpanel-browser@2.55.1`) and stores its id in `localStorage`.
That still needs consent on your domain, which is why it is not switched on here. Any
other destination still works through one line:

```js
window.MSD_ANALYTICS_SINK = function (e) { gtag('event', e.name, e); };
```

### 1.3 ✅ The downloadable PDF — `docs/files/` and `msd-analytics.js`

```js
var OVERVIEW_URL = 'files/msd-pitch-deck.pdf';
```

**Settled 2026-10-27.** The download is now the final MSD pitch deck (ten slides). It no
longer carries the *"developed through work at Staple AI"* line that kept the earlier
one-pager off this site, so the site and the PDF now agree. The placeholder test fixture
has been removed.

To swap in a newer deck, replace `docs/files/msd-pitch-deck.pdf` under the same name. Set
`OVERVIEW_URL = ''` and the form quietly becomes a plain mailing-list sign-up — the button
relabels itself and the email field becomes required.

### 1.4 The "Draft" footer — all six pages

```html
<p><strong>Draft.</strong> Promotional material for the MSD protocol. Scenarios use synthetic data.</p>
```

Two separate claims, and they come apart when you take it over:

- **"Draft"** means *not reviewed or approved by Staple*. Once you have reviewed it,
  delete that word. Leaving it on a page you own reads as a lack of confidence in your own
  material.
- **"Scenarios use synthetic data"** must stay as long as the three case pages do. The
  invoice numbers, the client checks and the agent's supplier are all invented. **Keeping
  this line is what makes them honest**, and it matters more once the draft label is gone.

Suggested replacement: `Scenarios use synthetic data.` on its own.

### 1.5 The evidence claim that was removed

The landing page used to close with a line stating that every claim on the site had been
checked against the running tooling, linking five public test notebooks. **It was removed
at the team's request and nothing replaced it.**

Worth knowing because it leaves the site with no answer to *"why should I believe this?"*.
Every comparable project answers it somehow — a logo wall, a foundation badge, a user
count, a star count. MSD has no logos and no badge yet, which is why a verified-test count
was chosen. If you have something better now (an adopter, a number, a standards body),
that slot is empty and waiting.

---

## 2. What the measurement actually does

All of it is in `docs/msd-analytics.js` — 345 lines, with the reasoning in comments.

| Event | Fires when | Carries |
|---|---|---|
| `page_view` | each page load | path, referrer, title, a per-tab session id |
| `link_click` | any link | href, link text, and **which zone** — `hero-cta`, `use-case-route`, `nav`, `feature`, `signup`, `footer` |
| `scroll_depth` | 25 / 50 / 75 / 100% | how far down the page someone got |
| `signup_submit` | an address is given **and** the box is ticked | **the email domain only, never the address**, and `placement` |
| `overview_download` | the pitch deck is taken | `placement` |

**The sign-up appears twice**, as asked on the 10-21 review: high on the landing page
(`placement: "top"`) and at the foot of all six pages (`placement: "foot"`). Comparing
the two placements is how you find out whether moving it up was worth doing.

**The `zone` on `link_click` is the one worth knowing about.** A page-views list cannot
tell you which audience you are serving; the zone can, because it separates a click on
"MSD for accounting" from one on the nav.

The per-tab session id reconstructs a path across pages — landing → case page → tools —
without anything identifying a person.

**Nothing is stored about who anyone is.** The sign-up event records `fund.example`, not
the address. There is no cookie, no fingerprint, no cross-site anything.

### Reading it

In the Umami dashboard, **Events → click an event name → its properties**. That is where
`zone` lives. The page list on the Overview tab answers a different and less useful
question.

One thing already fixed that is worth not re-breaking: Umami takes the URL from the
browser, which split the landing page into three rows — `/`, `/index.html` and
`/index.html#keep-me-posted`. The tracker is now handed a canonical path so one page is
one row. If you ever see those variants reappear, that is what regressed.

---

## 3. How the pages fit together

Six pages, one stylesheet, one script.

| Page | Job |
|---|---|
| `index.html` | What MSD is, who it is for, and the three use cases. Carries the sign-up. |
| `business.html` | The cost argument, for auditors and controllers. Two kinds of step. |
| `community.html` | Honest statement of stage, and how to contribute. |
| `cases/accounting.html` | An invoice, a PO, a clean match, a missing approval |
| `cases/kyc.html` | Three vendor checks and a document never filed |
| `cases/ai-agent.html` | An agent citing a price feed nobody can produce |

**The three case pages were generated from one template — change all three together.**

Each case page carries a hand-drawn SVG "evidence graph". They are deliberately **not**
redraws of the videos above them: each asks a different question (how would you check each
step / what does this decision rest on, working backwards / can each cited source be
produced?). If you rewrite one, that is the thing worth preserving — a diagram that
repeats the video earns nothing.

### The videos

`docs/media/` holds four MP4s, their frames, and four `*-cover.jpg` posters, about 17 MB. **They were produced by
a team member, not by Staple**, and they are the single largest asset here. Confirm you
are happy to publish them at these URLs, and keep the source files if you want to edit
them later — only the exports are in this repo.

---

## 3a. Merging into metastructured.ai

Checked 2026-10-27: metastructured.ai is **one static HTML page served by Netlify**, with
`#usecases` and `#cta` sections and a briefing form. This site is also plain static HTML
with no framework and no build step, so the merge is a file copy rather than a port.
There are three ways to do it, from least work to most:

| Route | What you do | Trade-off |
|---|---|---|
| **A. Subfolder** (recommended) | Copy `docs/` into the Netlify deploy as e.g. `/learn/`. Link the existing `#usecases` cards to `/learn/cases/*.html`, and add a "For business" link to the nav. | About an hour. One domain, which is what the 10-21 call wanted for search. Pages keep the light style: the deck's style, beside the site's dark one. |
| **B. Subfolder, dark tokens** | As A, then swap the `:root` block in `style.css` to the dark palette in the brand guide §2 (Void `#040710`, Panel `#0D1630`, Cyan `#22D4FF`, Frost `#E8EDF5`). | Half a day. Every colour is a token, so no markup changes, but the inline SVG graphs and the four cover images were drawn for a light ground and should be checked or redrawn. |
| **C. Content only** | Lift the text, the three evidence graphs and the videos into new sections of the one-pager. | The most work, and the case pages lose their own URLs, which are what backlinks would point at. |

Whichever route you take:

- Sign-ups already go to `hello@metastructured.ai`. A Netlify Form endpoint in
  `MSD_SIGNUP_ENDPOINT` would remove the mail-client step (§1.1).
- Replace the Umami id with your own, or set `MSD_MIXPANEL_TOKEN` (§1.2).
- Paths are relative, and the deck download is resolved from the script's own location,
  so the folder works at any depth without edits.
- Remove the "Draft" line from the footers once you have reviewed the content (§1.4).

## 4. If you change the HTML

Two rules, both learned the hard way on this site.

**Verify by rendering, not by reading.** Every layout defect found here was invisible in
the source and obvious in a screenshot: text filling a quarter of its column, a label
sitting on the line it annotated, an arrow pointing at a node that had moved away. Serve
the folder and look at the page.

```bash
cd docs && python3 -m http.server 8000
```

**A passing check is not a correct page.** One fix here passed the overflow test by
setting a label one character per line. The test could not see it; a screenshot could.

Worth checking after any edit: the three case pages at phone width, where the evidence
graphs scroll sideways rather than shrinking their labels into illegibility.

---

## 5. Things we could not decide for you

| Open | Why it is yours |
|---|---|
| **Whether to keep the gate off** | The download asks for nothing. A gate captures more addresses and fewer readers. We took it off; the numbers will tell you if that was wrong. |
| **Consent and cookies** | Only you know what your domain already does. Umami needs no banner; Mixpanel or GA would. |
| **Whether "Draft" comes off** | Only you can review your own material. |
