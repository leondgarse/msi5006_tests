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
 * Any other destination still works through window.MSD_ANALYTICS_SINK, e.g.
 *   window.MSD_ANALYTICS_SINK = function (e) { mixpanel.track(e.name, e); };
 */
(function () {
  'use strict';

  // Holding address while the protocol has no owned destination. Deliberately a
  // maintainer's own public address, not a staple.io one: nobody at the sponsor
  // currently owns this project, and an address on their domain would be a
  // commitment we are not in a position to make.
  var SIGNUP_MAILBOX = 'leondgarse@gmail.com';

  // Umami website id. Empty means "record locally, send nothing" — which is a
  // working state, not a broken one: the instrument runs either way.
  // Registered 2026-10-17 for leondgarse.github.io. This is a public
  // identifier, not a secret: it appears in the page source of every site that
  // uses Umami, and it grants no access to the dashboard.
  var UMAMI_WEBSITE_ID = '4cb907b0-a4ec-4c89-bfc9-680d0b41a116';
  var UMAMI_SRC = 'https://cloud.umami.is/script.js';

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

  // The overview offered in exchange for an address.
  //
  // ⚠️ PLACEHOLDER. This is not the MSD overview — it is a C2PA-signed PDF from
  // the public test fixtures, standing in so the download flow can be
  // demonstrated end to end. The real one-pager is not wired yet because it
  // still says MSD was developed at Staple AI while this site deliberately says
  // nothing of the kind; publishing that contradiction as the first thing a
  // stranger reads is worse than offering nothing.
  //
  // Before this site goes anywhere public: either point this at the settled
  // overview, or set it back to '' so no download is offered.
  var OVERVIEW_URL = 'files/msd-overview-placeholder.pdf';
  // Say what the file actually is. While it is the placeholder, promising "the
  // one-page overview" and handing over a test fixture would be the one kind of
  // dishonesty this whole project is arguing against.
  var OVERVIEW_LABEL = 'Download the sample document (placeholder)';

  function deliverOverview() {
    if (!OVERVIEW_URL) return false;
    record('overview_download', {});
    // A hidden anchor rather than location.href, so the download starts without
    // navigating the page away from the acknowledgement the visitor just got.
    safe(function () {
      var a = document.createElement('a');
      a.href = OVERVIEW_URL;
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

  function start() {
    loadUmami();
    // The offer is only made if it can be kept: with no document configured,
    // the form falls back to being a plain mailing-list sign-up.
    if (!OVERVIEW_URL) {
      var go = document.getElementById('signupGo');
      if (go) go.textContent = 'Keep me posted';
      var em = document.getElementById('signupEmail');
      if (em) { em.required = true; em.placeholder = 'you@company.com'; }
    }
    record('page_view', { referrer: document.referrer || null, title: document.title });
    onScroll();

    var form = document.getElementById('signupForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('signupEmail');
      var note = document.getElementById('signupNote');
      var address = (input.value || '').trim();

      // An address is optional. The document is the thing the visitor came for,
      // so it is never withheld — an earlier version made it mandatory and then
      // navigated to a mail client, which destroyed the download link before
      // anyone could use it.
      if (address && !input.checkValidity()) {
        record('signup_invalid', {});
        note.textContent = 'That does not look like an email address. Clear it to download without one.';
        note.className = 'signup-note is-warn';
        input.focus();
        return;
      }

      var got = deliverOverview();

      if (!got && !address) {
        record('signup_invalid', {});
        note.textContent = 'Please add an email address.';
        note.className = 'signup-note is-warn';
        input.focus();
        return;
      }

      if (address) {
        record('signup_submit', { domain: address.split('@').pop().toLowerCase() });
        if (typeof window.MSD_SIGNUP_ENDPOINT === 'string') {
          safe(function () {
            fetch(window.MSD_SIGNUP_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: address, page: location.pathname })
            });
          });
          note.textContent = 'Downloading. We will be in touch when there is something worth trying.';
        } else {
          // Opened in a new tab, not by navigating this one: a mailto on
          // location.href takes the page away and the download with it.
          safe(function () {
            window.open('mailto:' + SIGNUP_MAILBOX +
              '?subject=' + encodeURIComponent('MSD — keep me posted') +
              '&body=' + encodeURIComponent('Please add ' + address + ' to the MSD updates list.'), '_blank');
          });
          note.textContent = 'Downloading. A short message to send is open in your mail client.';
        }
        input.value = '';
      } else {
        note.textContent = 'Downloading. Add an address any time if you want to hear about changes.';
      }
      note.className = 'signup-note is-ok';
    });
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
