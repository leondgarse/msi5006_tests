/* MSD site — measurement instrumentation.
 *
 * Why this exists, and why it sends nothing anywhere:
 *
 * The brief was to be able to answer "did the material work" — which claim
 * earns the next click, how far a visitor gets, how many ask to hear more.
 * Instrumenting that is ours to do; collecting the data is not, because this
 * site is destined for someone else's domain and no analytics account or
 * consent decision exists yet.
 *
 * Events are defined here and recorded in the page. They are forwarded to a
 * destination only if one is configured; with none, this makes no network
 * request at all and the data never leaves the visitor's tab.
 *
 * Configured destination: Umami (umami.is). Chosen over Mixpanel, which the
 * sponsor suggested, and over GA, for one reason that outweighs the others:
 * Umami sets no cookies and collects no personal data, so the page needs no
 * consent banner. This site is destined for someone else's domain, and a
 * banner — or an un-consented tracker — is not ours to impose on them.
 * It is also MIT-licensed and self-hostable, so the sponsor can take it off a
 * third party later without the event names changing.
 *
 * To start collecting:
 *   1. Create a website at cloud.umami.is (free, 1M events/month) and copy its
 *      website id.
 *   2. Put the id in UMAMI_WEBSITE_ID below. That is the only edit needed —
 *      the script tag is injected and the events already map to umami.track().
 *
 * Mixpanel, which the sponsor uses, is supported but off by default: set
 *   window.MSD_MIXPANEL_TOKEN = '<project token>';
 * in the page before this script and every event is sent to Mixpanel as well.
 * Mixpanel stores an id in the browser, so turning it on is a consent decision
 * for whoever owns the domain — which is why it is not on here.
 *
 * Any other destination still works through window.MSD_ANALYTICS_SINK, e.g.
 *   window.MSD_ANALYTICS_SINK = function (e) { gtag('event', e.name, e); };
 */
(function () {
  'use strict';

  // The protocol's public address: the one metastructured.ai and the pitch
  // deck already give. Used only when no MSD_SIGNUP_ENDPOINT is configured.
  var SIGNUP_MAILBOX = 'hello@metastructured.ai';

  // Umami website id. Empty means "record locally, send nothing" — which is a
  // working state, not a broken one: the instrument runs either way.
  // Registered 2026-10-17 for leondgarse.github.io. This is a public
  // identifier, not a secret: it appears in the page source of every site that
  // uses Umami, and it grants no access to the dashboard.
  var UMAMI_WEBSITE_ID = '4cb907b0-a4ec-4c89-bfc9-680d0b41a116';
  var UMAMI_SRC = 'https://cloud.umami.is/script.js';

  // Pinned, not "latest": a tracker that changes under us changes the data.
  var MIXPANEL_SRC = 'https://cdn.jsdelivr.net/npm/mixpanel-browser@2.55.1/dist/mixpanel.umd.js';

  // Site root, from this script's own address, so pages one folder down
  // (cases/) resolve files/ to the same place the landing page does.
  var SITE_ROOT = (document.currentScript && document.currentScript.src) || location.href;

  var SESSION_KEY = 'msd.session';
  var BUFFER_KEY = 'msd.events';
  var MAX_EVENTS = 200;

  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  // A per-tab id, so a navigation path can be reconstructed without anything
  // that identifies a person. Dies with the tab.
  function sessionId() {
    return safe(function () {
      var id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    }, 's-nostore');
  }

  function record(name, detail) {
    var event = {
      name: name,
      page: canonicalPath(),
      session: sessionId(),
      at: new Date().toISOString()
    };
    for (var k in detail) if (Object.prototype.hasOwnProperty.call(detail, k)) event[k] = detail[k];

    safe(function () {
      var buf = JSON.parse(sessionStorage.getItem(BUFFER_KEY) || '[]');
      buf.push(event);
      if (buf.length > MAX_EVENTS) buf = buf.slice(-MAX_EVENTS);
      sessionStorage.setItem(BUFFER_KEY, JSON.stringify(buf));
    });

    if (typeof window.MSD_ANALYTICS_SINK === 'function') safe(function () { window.MSD_ANALYTICS_SINK(event); });
    forward(event);
    forwardMixpanel(event);
    return event;
  }

  // Umami caps event names at 50 characters and string values at 500, and takes
  // a flat data object — so the event goes over as name plus its own fields.
  function send(event) {
    safe(function () {
      var data = {};
      for (var k in event) {
        if (k === 'name' || !Object.prototype.hasOwnProperty.call(event, k)) continue;
        var v = event[k];
        data[k] = typeof v === 'string' ? v.slice(0, 500) : v;
      }
      // Umami otherwise takes the URL from the browser, which splits one page
      // into three: "/", "/index.html" and "/index.html#keep-me-posted" all
      // being the landing page. Any "which page wins" reading is then wrong by
      // construction, so the canonical path is supplied explicitly.
      window.umami.track(function (props) {
        return {
          website: props.website,
          hostname: props.hostname,
          screen: props.screen,
          language: props.language,
          title: props.title,
          referrer: props.referrer,
          url: canonicalPath(),
          name: event.name.slice(0, 50),
          data: data
        };
      });
    });
  }

  // One page, one path. Strips the repo prefix so a move off GitHub Pages does
  // not reset the history, drops "index.html", and drops the hash — a reader
  // scrolling to #keep-me-posted has not visited a second page.
  function canonicalPath() {
    var p = location.pathname.replace(/\/index\.html$/, '/');
    if (p === '' ) p = '/';
    return p;
  }

  // The tracker loads async, and page_view fires the moment this script runs —
  // so without a queue the first and most important event of every visit is
  // dropped on the floor. Events wait here until window.umami exists.
  var pending = [];
  function forward(event) {
    if (!UMAMI_WEBSITE_ID) return;
    if (typeof window.umami !== 'undefined') send(event);
    else pending.push(event);
  }
  function flush() {
    if (typeof window.umami === 'undefined') return false;
    while (pending.length) send(pending.shift());
    return true;
  }

  // Mixpanel, only when a token is configured. Events wait for the library the
  // same way they wait for Umami.
  var mpPending = [], mpReady = false;
  function mixpanelToken() {
    return typeof window.MSD_MIXPANEL_TOKEN === 'string' ? window.MSD_MIXPANEL_TOKEN : '';
  }
  function forwardMixpanel(event) {
    if (!mixpanelToken()) return;
    if (mpReady) safe(function () { window.mixpanel.track(event.name, event); });
    else mpPending.push(event);
  }
  function loadMixpanel() {
    if (!mixpanelToken()) return;
    var tag = document.createElement('script');
    tag.async = true;
    tag.src = MIXPANEL_SRC;
    tag.addEventListener('load', function () {
      safe(function () {
        // Our page_view replaces Mixpanel's own, as with Umami.
        window.mixpanel.init(mixpanelToken(), { track_pageview: false, persistence: 'localStorage' });
        mpReady = true;
        while (mpPending.length) { var e = mpPending.shift(); window.mixpanel.track(e.name, e); }
      });
    });
    tag.addEventListener('error', function () { mpPending.length = 0; });
    document.head.appendChild(tag);
  }

  // The document offered beside the sign-up: the final MSD pitch deck (ten
  // slides, synthetic examples, no Staple attribution — the line that kept the
  // earlier one-pager off this site is gone from it). It replaced a placeholder
  // test fixture on 2026-10-27.
  //
  // Set this to '' and the form becomes a plain mailing-list sign-up.
  var OVERVIEW_URL = 'files/msd-pitch-deck.pdf';

  function overviewHref() {
    return safe(function () { return new URL(OVERVIEW_URL, SITE_ROOT).href; }, OVERVIEW_URL);
  }

  function deliverOverview(placement) {
    if (!OVERVIEW_URL) return false;
    record('overview_download', { placement: placement });
    // A hidden anchor rather than location.href, so the download starts without
    // navigating the page away from the acknowledgement the visitor just got.
    safe(function () {
      var a = document.createElement('a');
      a.href = overviewHref();
      a.setAttribute('download', '');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { a.remove(); }, 0);
    });
    return true;
  }

  // Injected rather than written into every page, so there is one place to
  // change if the destination changes, and none at all while the id is empty.
  function loadUmami() {
    if (!UMAMI_WEBSITE_ID) return;
    var tag = document.createElement('script');
    tag.async = true;
    tag.defer = true;
    tag.src = UMAMI_SRC;
    tag.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
    // Our own page_view carries the zone and referrer detail we actually want,
    // so Umami's automatic one would double-count every visit.
    tag.setAttribute('data-auto-track', 'false');
    tag.addEventListener('load', function () {
      // onload fires before the tracker has finished defining window.umami in
      // some builds, so retry briefly rather than trusting the event alone.
      if (flush()) return;
      var tries = 0;
      var timer = setInterval(function () {
        if (flush() || ++tries > 20) clearInterval(timer);
      }, 100);
    });
    tag.addEventListener('error', function () { pending.length = 0; });
    document.head.appendChild(tag);
  }

  // Which link was it, in words a reader of the report would recognise.
  function describe(a) {
    var href = a.getAttribute('href') || '';
    var external = /^https?:\/\//i.test(href) && a.hostname !== location.hostname;
    var where = 'body';
    if (a.closest('nav')) where = 'nav';
    else if (a.closest('.cta-row')) where = 'hero-cta';
    else if (a.closest('.route')) where = 'use-case-route';
    else if (a.closest('.features')) where = 'feature';
    else if (a.closest('.features-more')) where = 'feature-footnote';
    else if (a.closest('.cards')) where = 'card';
    else if ((a.closest('.signup-band') || a.closest('.signup-hero'))) where = 'signup';
    else if (a.closest('footer')) where = 'footer';
    return {
      href: href,
      zone: where,
      // A link that wraps a block (a route card) would otherwise report the
      // whole card as its label; prefer the element that names it.
      label: (function () {
        var named = a.querySelector('.route-k, h3, .card-title');
        return ((named || a).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      })(),
      external: external
    };
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    record('link_click', describe(a));
  }, true);

  // How far down the page a visitor actually got — the cheapest proxy for
  // "did they read it or bounce".
  var marks = [25, 50, 75, 100], seen = {};
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var pct = max > 0 ? Math.round((h.scrollTop / max) * 100) : 100;
    for (var i = 0; i < marks.length; i++) {
      if (pct >= marks[i] && !seen[marks[i]]) {
        seen[marks[i]] = true;
        record('scroll_depth', { depth: marks[i] });
      }
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // One sign-up can appear more than once on a page (high on the landing page,
  // and at the foot of every page), so each form is wired on its own and every
  // event says which one it came from: data-placement="top" or "foot". That is
  // the only way to tell afterwards whether moving it up was worth doing.
  function wireForm(form) {
    var placement = form.getAttribute('data-placement') || 'unknown';
    var input = form.querySelector('input[type=email]');
    var note = form.querySelector('.signup-note');
    var keep = form.querySelector('input[type=checkbox]');
    var go = form.querySelector('button[type=submit]');

    // The offer is only made if it can be kept: with no document configured,
    // the form falls back to being a plain mailing-list sign-up.
    if (!OVERVIEW_URL) {
      if (go) go.textContent = 'Keep me posted';
      if (input) { input.required = true; input.placeholder = 'you@company.com'; }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var address = (input.value || '').trim();

      // An address is optional. The document is the thing the visitor came for,
      // so it is never withheld — an earlier version made it mandatory and then
      // navigated to a mail client, which destroyed the download link before
      // anyone could use it.
      if (address && !input.checkValidity()) {
        record('signup_invalid', { placement: placement });
        note.textContent = 'That does not look like an email address. Clear it to download without one.';
        note.className = 'signup-note is-warn';
        input.focus();
        return;
      }

      var got = deliverOverview(placement);

      if (!got && !address) {
        record('signup_invalid', { placement: placement });
        note.textContent = 'Please add an email address.';
        note.className = 'signup-note is-warn';
        input.focus();
        return;
      }

      var wantsList = address && (!keep || keep.checked);

      if (address && !wantsList) {
        // An address typed with the box unticked is not a sign-up. Nothing is
        // recorded about it and nothing is sent anywhere.
        note.textContent = 'Downloading. Nothing was sent — the box above is unticked.';
        note.className = 'signup-note is-ok';
        return;
      }

      if (wantsList) {
        record('signup_submit', { placement: placement, domain: address.split('@').pop().toLowerCase() });
        if (typeof window.MSD_SIGNUP_ENDPOINT === 'string') {
          safe(function () {
            fetch(window.MSD_SIGNUP_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: address, page: location.pathname, placement: placement })
            });
          });
          note.textContent = got ? 'Downloading. We will be in touch when there is something worth trying.'
                                 : 'Thanks. We will be in touch when there is something worth trying.';
        } else {
          // Opened in a new tab, not by navigating this one: a mailto on
          // location.href takes the page away and the download with it.
          safe(function () {
            window.open('mailto:' + SIGNUP_MAILBOX +
              '?subject=' + encodeURIComponent('MSD — keep me posted') +
              '&body=' + encodeURIComponent('Please add ' + address + ' to the MSD updates list.'), '_blank');
          });
          note.textContent = (got ? 'Downloading. ' : '') + 'A short message to send is open in your mail client.';
        }
        input.value = '';
      } else {
        note.textContent = 'Downloading. Add an address any time if you want to hear about changes.';
      }
      note.className = 'signup-note is-ok';
    });
  }

  function start() {
    loadUmami();
    loadMixpanel();
    record('page_view', { referrer: document.referrer || null, title: document.title });
    onScroll();
    var forms = document.querySelectorAll('.signup-form');
    for (var i = 0; i < forms.length; i++) wireForm(forms[i]);
  }

  // This script is deferred, so DOMContentLoaded may already have fired by the
  // time it runs — listening unconditionally double-counted every page view.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  // For inspection during a walkthrough: MSD_ANALYTICS.events()
  window.MSD_ANALYTICS = {
    events: function () { return safe(function () { return JSON.parse(sessionStorage.getItem(BUFFER_KEY) || '[]'); }, []); },
    clear: function () { safe(function () { sessionStorage.removeItem(BUFFER_KEY); }); },
    track: record
  };
})();
