# Handover — running this site yourselves

Everything here is plain HTML, one stylesheet and one script. No build step, no
framework, no package manager. Opening `docs/index.html` in a browser is the whole
development environment.

It was written to be **ported into the existing msd-protocol.org**, not hosted alongside
it. What transfers is the content and the markup; the styling deliberately mirrors the
existing site's tokens so it should look close without being adjusted.

---

## 1. Five things to change before this is yours

In order of how much they matter. The first three are ours appearing on your site.

### 1.1 🔴 The sign-up mailbox — `docs/msd-analytics.js`

```js
var SIGNUP_MAILBOX = 'leondgarse@gmail.com';
```

A student's personal address, used as a holding destination so the form would work
end to end for a demo. **Anyone who fills in the form today emails a student.**

Replace it with an address you own. Or, better, set a real endpoint and the `mailto:` is
never used:

```js
window.MSD_SIGNUP_ENDPOINT = 'https://your-form-endpoint.example/subscribe';
```

With that set, the form POSTs `{email, page}` as JSON and shows a confirmation instead of
opening a mail client.

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
any of the event names changing. If you would rather use something else, one line does it:

```js
window.MSD_ANALYTICS_SINK = function (e) { mixpanel.track(e.name, e); };
```

### 1.3 🔴 The downloadable PDF — `docs/files/` and `msd-analytics.js`

```js
var OVERVIEW_URL = 'files/msd-overview-placeholder.pdf';
var OVERVIEW_LABEL = 'Download the sample document (placeholder)';
```

**That file is not an MSD overview.** It is a C2PA-signed PDF from the public test
fixtures, standing in so the download flow could be demonstrated. The link says
"(placeholder)" so nobody is misled.

Point `OVERVIEW_URL` at the real one-pager and change `OVERVIEW_LABEL` to match, or set
`OVERVIEW_URL = ''` and the form quietly becomes a plain mailing-list sign-up — the
button relabels itself and the email field becomes required.

⚠️ The one-page pitch PDF **is not ready to publish as-is**: it closes with *"MSD was
developed through work at Staple AI"*, and this site deliberately mentions Staple nowhere,
following the instruction that one customer who also built the protocol is not a
compelling adoption story. Those two cannot both be public. **That is yours to settle.**

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
| `link_click` | any link | href, link text, and **which zone** — `hero-cta`, `use-case-route`, `nav`, `feature`, `footer` |
| `scroll_depth` | 25 / 50 / 75 / 100% | how far down the page someone got |
| `signup_submit` | an address is given **and** the box is ticked | **the email domain only, never the address** |
| `overview_download` | the PDF is taken | — |

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

`docs/media/` holds four MP4s and their poster frames, about 9 MB. **They were produced by
a team member, not by Staple**, and they are the single largest asset here. Confirm you
are happy to publish them at these URLs, and keep the source files if you want to edit
them later — only the exports are in this repo.

---

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
| **The Staple line in the pitch PDF** | The site says nothing about Staple, the PDF says it was developed there. Both are defensible; they cannot both be public. Blocks §1.3. |
| **Where sign-ups go** | Needs an address or endpoint you own. Blocks §1.1. |
| **Whether to keep the gate off** | The download asks for nothing. A gate captures more addresses and fewer readers. We took it off; the numbers will tell you if that was wrong. |
| **Consent and cookies** | Only you know what your domain already does. Umami needs no banner; Mixpanel or GA would. |
| **Whether "Draft" comes off** | Only you can review your own material. |
