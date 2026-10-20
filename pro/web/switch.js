// The Purl and Professional switch. build-site.mjs writes this file inline
// into the head of each page with the switch, since the pagereveal listener must exist
// before the page's first frame.
//
// A flip is a page change, so it would snap. Where the browser has
// cross-document view transitions (Chrome and Edge 126, Safari 18.2;
// switch.css opts in), the first phone on one half moves and shrinks into
// the phone on the other, and the rest of the page cross-fades. The phone
// stays put and only fades when it is off the screen on either side, or
// when the visitor asked for less motion. Elsewhere (Firefox) the new half
// fades in. Pictures that arrive late fade in rather than pop (the
// maintainer, 2026-10-18).
//
// Fast: once a half has loaded and the browser is idle, fetch the other
// half's page and its first pictures, so a flip opens from the cache (the
// maintainer, 2026-10-18). The URLs are on the off half's link, in
// data-prefetch, space separated; "a|b" means a in the light theme and b in
// the dark one. Nothing is fetched when the visitor saves data or is on 2G.
(function () {
  var html = document.documentElement;
  var PHONE = '.lhero-shot .phoneframe, .dev-phone .phoneframe';
  var FLIP = 'purl-flip';
  var vt = 'CSSViewTransitionRule' in window;
  try {
    if (sessionStorage.getItem(FLIP)) {
      sessionStorage.removeItem(FLIP);
      html.classList.add('flip');
      if (!vt) html.classList.add('flip-fade');
    }
  } catch (e) {}

  // The phone takes part only when some of it is on the screen.
  function phoneTakesPart() {
    var el = document.querySelector(PHONE);
    if (!el) return;
    var b = el.getBoundingClientRect();
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || b.bottom <= 0 || b.top >= innerHeight || !b.width) el.style.viewTransitionName = 'none';
  }
  // Only the pages with the switch opt in to the flip. A page change to any
  // other page skips it here: the browser would abort it there and report
  // that as an error in that page (seen 2026-10-20 on the Purl home page,
  // which gets its half of the switch later). The pill's data-flip is a
  // pattern for the paths of the pages that opt in.
  function quiet(t) { if (t.ready) t.ready.catch(function () {}); }
  function flips(path) {
    var pill = document.querySelector('.pill[data-flip]');
    if (!pill) return true;
    try { return new RegExp(pill.getAttribute('data-flip')).test(path); } catch (x) { return true; }
  }
  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition) return;
    quiet(e.viewTransition);
    var to = e.activation && e.activation.entry && e.activation.entry.url;
    if (!to || flips(new URL(to).pathname)) phoneTakesPart(); else e.viewTransition.skipTransition();
  });
  window.addEventListener('pagereveal', function (e) { if (e.viewTransition) { quiet(e.viewTransition); phoneTakesPart(); } });

  function fadeLatePictures() {
    [].forEach.call(document.images, function (im) {
      if (im.complete) return;
      im.classList.add('late');
      var done = function () { im.classList.add('in'); };
      im.addEventListener('load', done);
      im.addEventListener('error', done);
      if (im.complete) done();
    });
  }

  function prefetch(off) {
    var c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;
    var dark = html.getAttribute('data-theme') === 'dark';
    var canLink = document.createElement('link').relList.supports('prefetch');
    function get(url) {
      if (/\.(webp|png|jpe?g|svg)$/i.test(url)) { new Image().src = url; return; }
      if (canLink) {
        var l = document.createElement('link');
        l.rel = 'prefetch';
        l.href = url;
        document.head.appendChild(l);
      } else if (window.fetch) {
        // Safari has no link prefetch; a plain fetch fills the same cache.
        fetch(url, { mode: 'no-cors', credentials: 'same-origin' }).catch(function () {});
      }
    }
    get(off.href);
    (off.getAttribute('data-prefetch') || '').split(/\s+/).forEach(function (u) {
      if (!u) return;
      var pair = u.split('|');
      get(new URL(dark && pair[1] ? pair[1] : pair[0], location.href).href);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (html.classList.contains('flip')) fadeLatePictures();
    var off = document.querySelector('.pill a:not(.on)');
    if (!off) return;
    // The next page fades in only if it has the switch to read and clear
    // the mark; one without would leave it for a later page.
    off.addEventListener('click', function () { if (!flips(off.pathname)) return; try { sessionStorage.setItem(FLIP, '1'); } catch (e) {} });
    var idle = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 300); })(function () { prefetch(off); }); };
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle);
  });
})();
