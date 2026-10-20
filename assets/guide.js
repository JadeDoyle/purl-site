/* Guide navigation on purl.no: search, the page list, On this page and the
   phone Contents drawer (build-site.mjs, guideLayout, writes the markup).
   The search index is a JSON file the site build writes next to the pages;
   this script fetches it from purl.no itself, once, on the first search.
   Every search runs here in the browser: the words a visitor types are never
   sent anywhere. No em dashes in any copy. */
(function () {
  'use strict';
  var root = document.documentElement;
  var gn = document.querySelector('.gn');
  if (!gn) return;
  var ui = {};
  try { ui = JSON.parse(gn.getAttribute('data-gn-ui') || '{}'); } catch (e) { /* the strings stay empty */ }
  function each(sel, f, from) { Array.prototype.forEach.call((from || document).querySelectorAll(sel), f); }

  // The sticky header's height, so the bar and the headings sit below it.
  var header = document.querySelector('.site-header');
  function measure() { if (header) root.style.setProperty('--hdr', header.offsetHeight + 'px'); }
  measure();
  window.addEventListener('resize', measure);

  // --- search ---------------------------------------------------------------
  // Folding: lower case, æ to ae, ø to o, å to a, and accents dropped, on both
  // the index and the query, so "forste" finds "første" and "første" too.
  var FOLD = { 'æ': 'ae', 'ø': 'o', 'å': 'a' };
  function fold(s) {
    return String(s).toLowerCase().replace(/[æøå]/g, function (c) { return FOLD[c]; })
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function words(s) { return fold(s).split(/[^a-z0-9]+/).filter(Boolean); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var data = null, pending = null;
  function load() {
    if (data) return Promise.resolve(data);
    if (!pending) {
      pending = fetch(gn.getAttribute('data-gn-index'), { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (d) {
          data = d.s.map(function (s, i) {
            var p = d.pages[s[0]];
            return { i: i, p: p, h: s[1], a: s[2], x: s[3], tw: words(p.t), hw: words(s[1]), xw: words(s[3]),
              f: ' ' + words(s[1] + ' ' + s[3]).join(' ') + ' ' };
          });
          return data;
        });
      pending.catch(function () { pending = null; });
    }
    return pending;
  }

  // A term matches the start of a word. A longer term may also sit inside a
  // word, at a lower score, which finds the parts of a Norwegian compound
  // ("markør" in "radmarkør").
  function matches(t, w) { return w.lastIndexOf(t, 0) === 0 || (t.length > 3 && w.indexOf(t) > 0); }
  function hit(t, list) {
    var start = 0, inside = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].lastIndexOf(t, 0) === 0) start++;
      else if (t.length > 3 && list[i].indexOf(t) > 0) inside++;
    }
    return start ? 1 + Math.min(start - 1, 4) * 0.12 : inside ? 0.5 : 0;
  }
  // Every term must match somewhere in a section. The page title counts, but
  // a section found only through its page's title is left out: the page's
  // own first section stands for it.
  function find(q) {
    var terms = words(q), list = [];
    if (!terms.length) return { terms: terms, list: list };
    var phrase = ' ' + terms.join(' ');
    for (var i = 0; i < data.length; i++) {
      var s = data[i], score = 0, own = !s.a;
      for (var j = 0; j < terms.length; j++) {
        var t = terms[j], h = hit(t, s.hw), x = hit(t, s.xw), ti = hit(t, s.tw);
        var v = 6 * h + 2 * x + (s.a ? 1 : 10) * ti;
        if (!v) { score = 0; break; }
        if (h || x) own = true;
        score += v;
      }
      if (!score || !own) continue;
      if (terms.length > 1 && s.f.indexOf(phrase) >= 0) score += 4;
      list.push({ s: s, score: score });
    }
    list.sort(function (a, b) { return b.score - a.score || a.s.i - b.s.i; });
    return { terms: terms, list: list };
  }
  var WORD = /[\p{L}\p{N}]+/gu;
  function isHit(word, terms) {
    var f = fold(word);
    for (var j = 0; j < terms.length; j++) if (matches(terms[j], f)) return true;
    return false;
  }
  function marked(text, terms) {
    var out = '', last = 0, m;
    WORD.lastIndex = 0;
    while ((m = WORD.exec(text))) {
      out += esc(text.slice(last, m.index)) + (isHit(m[0], terms) ? '<mark>' + esc(m[0]) + '</mark>' : esc(m[0]));
      last = WORD.lastIndex;
    }
    return out + esc(text.slice(last));
  }
  // About 26 words of the section, starting a few words before the first hit.
  function snippet(text, terms) {
    var at = [], first = -1, m;
    WORD.lastIndex = 0;
    while ((m = WORD.exec(text))) {
      if (first < 0 && isHit(m[0], terms)) first = at.length;
      at.push(m.index);
    }
    if (!at.length) return '';
    var from = Math.max(0, first - 6), to = Math.min(at.length, from + 26);
    var piece = text.slice(at[from], to < at.length ? at[to] : text.length).trim();
    return (from > 0 ? '… ' : '') + marked(piece, terms) + (to < at.length ? ' …' : '');
  }
  function render(box, q, res) {
    var n = res.list.length;
    if (!n) { box.innerHTML = '<p class="gn-count">' + esc(String(ui.none).replace('{q}', q.trim())) + '</p>'; return; }
    var html = '<p class="gn-count">' + esc(n === 1 ? ui.one : String(ui.many).replace('{n}', n)) + '</p>';
    res.list.slice(0, 20).forEach(function (r, k) {
      var s = r.s;
      html += '<a class="gn-hit" role="option" id="' + box.id + '-' + k + '" href="' + esc(s.p.u + (s.a ? '#' + s.a : '')) + '">' +
        '<span class="gn-hit-where">' + esc(s.a ? s.p.t : s.p.g) + '</span>' +
        '<span class="gn-hit-head">' + marked(s.h || s.p.t, res.terms) + '</span>' +
        '<span class="gn-hit-text">' + snippet(s.x, res.terms) + '</span></a>';
    });
    if (n > 20) html += '<p class="gn-more">' + esc(ui.more) + '</p>';
    box.innerHTML = html;
  }

  var searches = [];
  function wire(wrap) {
    var input = wrap.querySelector('input'), box = wrap.querySelector('.gn-results');
    var active = -1, timer = 0;
    function hits() { return box.querySelectorAll('.gn-hit'); }
    function show(on) {
      box.hidden = !on;
      input.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    function pick(k) {
      var h = hits();
      if (!h.length) return;
      active = (k + h.length) % h.length;
      for (var i = 0; i < h.length; i++) h[i].classList.toggle('is-active', i === active);
      input.setAttribute('aria-activedescendant', h[active].id);
      var r = h[active].getBoundingClientRect(), b = box.getBoundingClientRect();
      if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 6;
      else if (r.top < b.top) box.scrollTop -= b.top - r.top + 6;
    }
    function run() {
      var q = input.value;
      active = -1;
      input.removeAttribute('aria-activedescendant');
      if (!q.trim()) { show(false); box.innerHTML = ''; return; }
      if (!data) { box.innerHTML = '<p class="gn-count">' + esc(ui.loading) + '</p>'; show(true); }
      load().then(function () {
        if (input.value !== q) return;
        render(box, q, find(q));
        box.scrollTop = 0;
        show(true);
      }, function () { box.innerHTML = '<p class="gn-count">' + esc(ui.failed) + '</p>'; show(true); });
    }
    input.addEventListener('focus', function () {
      load().catch(function () { /* said when a search runs */ });
      if (input.value.trim() && box.innerHTML) show(true);
    });
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 50); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); pick(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); pick(active - 1); }
      else if (e.key === 'Enter') {
        var a = hits()[active >= 0 ? active : 0];
        if (a) { e.preventDefault(); a.click(); }
      } else if (e.key === 'Escape') {
        if (input.value) { input.value = ''; run(); } else input.blur();
      }
    });
    box.addEventListener('click', function (e) {
      if (!e.target.closest('a')) return;
      show(false);
      input.blur();
    });
    searches.push({ wrap: wrap, show: show });
  }
  each('.gn-search', wire);
  document.addEventListener('pointerdown', function (e) {
    searches.forEach(function (s) { if (!s.wrap.contains(e.target)) s.show(false); });
  });

  // --- the Contents drawer (phones) --------------------------------------------
  var drawer = document.querySelector('.gn-drawer');
  var dbody = drawer && drawer.querySelector('.gn-dbody');
  var toc = document.querySelector('.gn-rail .gn-toc');
  var pages = document.querySelector('.gn-side .gn-pages');
  var back = null;
  function copyOf(node) {
    var c = node.cloneNode(true);
    each('[id]', function (n) { n.removeAttribute('id'); }, c);
    return c;
  }
  // Scrolls a list so an item sits a 1/part of the way down it.
  function scrollWithin(box, item, part) {
    var top = item.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    box.scrollTop = Math.max(0, top - box.clientHeight / part);
  }
  function openDrawer(from) {
    if (!drawer) return;
    back = from;
    dbody.innerHTML = '';
    if (toc) dbody.appendChild(copyOf(toc));
    if (pages) dbody.appendChild(copyOf(pages));
    spy(true);
    drawer.hidden = false;
    root.classList.add('gn-lock');
    from.setAttribute('aria-expanded', 'true');
    var panel = drawer.querySelector('.gn-panel');
    panel.scrollTop = 0;
    // Opens at the section being read; above the first section, at this
    // page's own sections, and on a page without any, at its line in the list.
    var cur = dbody.querySelector('.is-here') || (!toc && dbody.querySelector('[aria-current="page"]'));
    if (cur) scrollWithin(panel, cur, 3);
    drawer.querySelector('.gn-x').focus({ preventScroll: true });
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    root.classList.remove('gn-lock');
    if (back) { back.setAttribute('aria-expanded', 'false'); back.focus({ preventScroll: true }); }
  }
  each('.gn-cbtn', function (b) { b.addEventListener('click', function () { openDrawer(b); }); });
  if (drawer) drawer.addEventListener('click', function (e) {
    if (e.target === drawer || e.target.closest('.gn-x') || e.target.closest('.gn-dbody a')) closeDrawer();
  });

  // Escape closes the drawer; "/" or Ctrl+K (Cmd+K) jumps to the search box.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDrawer(); return; }
    var t = e.target;
    if (e.altKey || (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable))) return;
    if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      var ins = document.querySelectorAll('.gn-search input');
      for (var i = 0; i < ins.length; i++) {
        if (ins[i].getClientRects().length) { e.preventDefault(); ins[i].focus(); return; }
      }
    }
  });

  // --- where the reader is ------------------------------------------------------
  // The section being read is marked in On this page: the last heading whose
  // top has passed a line just below the header.
  var heads = Array.prototype.slice.call(document.querySelectorAll('.gn-main .prose h2[id]'));
  var here = null;
  function spy(force) {
    if (!heads.length) return;
    var line = (header ? header.offsetHeight : 60) + 90, cur = null;
    for (var i = 0; i < heads.length; i++) { if (heads[i].getBoundingClientRect().top <= line) cur = heads[i]; else break; }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = heads[heads.length - 1];
    if (cur === here && !force) return;
    here = cur;
    var id = cur ? cur.id : '';
    each('.gn-toc a', function (a) {
      var on = !!id && a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-here', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    // Keep the marked line in view inside a column that scrolls.
    each('.gn-rail-in', function (col) {
      var a = col.querySelector('.is-here');
      if (!a || !a.getClientRects().length || col.scrollHeight <= col.clientHeight) return;
      var r = a.getBoundingClientRect(), c = col.getBoundingClientRect();
      if (r.top < c.top + 30 || r.bottom > c.bottom - 50) scrollWithin(col, a, 3);
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; spy(); });
  }, { passive: true });
  spy(true);

  // The page list opens scrolled to the current page when that is below the
  // fold or under the fade at its foot, its group label still in view. Before
  // the page scrolls the column is not yet stuck and runs past the window.
  each('.gn-side-in > .gn-pages', function (col) {
    var cur = col.querySelector('[aria-current="page"]');
    if (!cur || !cur.getClientRects().length || cur.getBoundingClientRect().bottom <= Math.min(col.getBoundingClientRect().bottom, window.innerHeight) - 20) return;
    var label = cur.closest('ul').previousElementSibling;
    scrollWithin(col, label || cur, 12);
  });
  window.addEventListener('load', function () { measure(); spy(true); });
})();
