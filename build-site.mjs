// Build the whole public Purl site into this repo. Run with `npm run build`.
//
// Served by GitHub Pages on the custom domain https://purl.no/ (root-served),
// so BASE is '' and every link is site-root-relative. The old project-page host
// jadedoyle.github.io/purl-site still works: GitHub redirects it to purl.no once
// the custom domain (the CNAME file this script writes) is set. ORIGIN + BASE
// below are the single knob if the host ever changes again. FILE paths never
// include BASE (the repo root is what Pages serves); only URLs do.
//
// The site is bilingual: English at the root, Norwegian under /no/. One shared
// shell (header nav + language toggle + full-sitemap footer + favicon + Open
// Graph) wraps every page, so nothing drifts. Sources:
//   - landing, support, press, feedback     -> authored here, both languages
//   - privacy, terms                        -> ../Purl/docs/legal/*.md (+ *.no.md)
//   - user guide                            -> ../Purl/user-guide/*.md (English)
//   - changelog, roadmap                    -> read from the app's own data
//                                              (English, as in the app)
//   - favicon + og.png                      -> rasterised from the real logo
//
// Style rules, matching the app: no em dashes, no emojis in any output.

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const PURL = process.env.PURL_DIR || join(HERE, '..', 'Purl');

const ORIGIN = 'https://purl.no';
const BASE = '';                           // root-served on the purl.no custom domain
const u = (p) => BASE + p;                 // site-relative path -> href
const abs = (p) => ORIGIN + BASE + p;      // site-relative path -> absolute URL

const SITE = {
  name: 'Purl',
  playUrl: 'https://play.google.com/store/apps/details?id=no.purl.app',
  appStoreUrl: 'https://apps.apple.com/no/app/purl/id6788513793',
  feedbackForm: 'https://docs.google.com/forms/d/e/1FAIpQLSdXgzhbJAsj0Zkr3Qrj4zyk_lO9kETwUbGvxIWLFSstn9p4lw/viewform',
  email: 'contact@purl.no',
  year: 2026,
  // The landing's "knitters used Purl" line reads { count, window } from here
  // (the editor server, tools/catalogue-editor/liveCount.js in the app repo).
  liveCountUrl: 'https://editor.hbc3.no/api/public/active',
  // Every page tells the editor server it was visited (tools/catalogue-editor/
  // visits.js in the app repo). PURL_VISIT_URL points a local test build at a
  // capture server instead.
  visitUrl: process.env.PURL_VISIT_URL || 'https://editor.hbc3.no/api/public/visit',
};

// Safari on iPhone and iPad renders an install banner from this. The id is
// derived from the store URL above so there is only one place to change it.
const APPLE_APP_ID = SITE.appStoreUrl.match(/id(\d+)/)[1];

// JSON-LD is embedded in a <script>, so "</script>" inside any string value
// would end the element early. Escaping "<" as \u003c is the standard guard
// and leaves the JSON semantically identical.
const ldJson = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n`;

const COLORS = {
  primary: '#7C5E9B',
  primaryDark: '#5E4478',
  bg: '#FBF8F5',
  text: '#2C2630',
  muted: '#6F6676',
};

// --- small helpers -------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

// Phrase-aware line breaks (the maintainer, 2026-10-17): a headline or sub
// line breaks where a reader would pause, never where the browser runs out of
// room. Three layers. styles.css balances every heading and sub line. glue()
// joins a short word (a, the, my, not, en, å) to the next one, and "yet" or a
// Norwegian possessive (dataene mine) to the word before, so no line splits
// them. And
// copy.json marks its phrases: "|" means a line may end here and only here,
// "||" means a line always ends here. Each phrase becomes an inline-block, so
// the browser breaks between phrases; one longer than the screen still wraps
// inside itself instead of overflowing. Every h1 to h3 and summary on every
// page goes through both (setHeadings), so a guide heading can carry marks too.
// The lookbehind lets a run of short words glue in one pass ("of the back").
const GLUE = /(?<=^|[\s(])(a|an|the|I|it|to|of|in|on|at|by|as|for|and|or|no|not|cannot|have|has|had|you|my|your|our|their|en|et|ei|å|i|på|av|og|til|om|ikke) +(?=[^\s<])/giu;
const GLUE_BACK = / +(?=(yet|min|mi|mitt|mine|din|di|ditt|dine|sin|si|sitt|sine)(?![\p{L}-]))/gu;
// Only the text between tags is touched, never a tag or an attribute.
const glue = (html) => String(html).replace(/(^|>)([^<]+)/g, (m, open, text) =>
  open + text.replace(GLUE, '$1 ').replace(GLUE_BACK, ' '));
const phrases = (html) => String(html).split('||').map((row) => {
  const parts = row.split('|').map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts.map((p) => `<span class="ph">${p}</span>`).join(' ') : row.trim();
}).join('<br />');
// A copy string set as a headline or sub line: escaped, phrased, glued.
const line = (s) => glue(phrases(esc(s)));
// The same for copy.json strings that already hold HTML (cards, page titles).
const lineHtml = (s) => glue(phrases(s));
// The marks never reach alt text, page titles or meta descriptions.
const plain = (s) => String(s).replace(/\s*\|\|?\s*/g, ' ').trim();
// A heading nobody marks by hand (the app's release titles, the guide) gets
// its marks from its punctuation: after a colon ("Crochet charts: | big
// charts draw fast"), and after a comma that closes two words or more
// ("Stagger the repeats, | colours from your stash"; "Turn, resize" stays)
// or opens an "and" ("Folders, | and paper patterns").
// Only a heading's leading text is read, up to its first tag.
const autoMarks = (inner) => {
  if (inner.includes('|')) return inner;
  const cut = inner.indexOf('<');
  const text = cut < 0 ? inner : inner.slice(0, cut);
  const marked = text.replace(/([:,]) +(?=(\S+))/g, (m, mark, next, at) => {
    const words = text.slice(0, at).split(/[|:,]/).pop().trim().split(/\s+/).length;
    return mark === ':' || words >= 2 || /^(and|or|og|eller)$/i.test(next) ? `${mark}|` : m;
  });
  return marked + (cut < 0 ? '' : inner.slice(cut));
};
const setHeadings = (html) => html.replace(/<(h[1-3]|summary)\b([^>]*)>([\s\S]*?)<\/\1>/g,
  (m, tag, attrs, inner) => `<${tag}${attrs}>${lineHtml(autoMarks(inner))}</${tag}>`);
// A release title balances on its own, so the version tag after it is not
// counted as one of its lines.
const releaseTitle = (title) => `<span class="rt">${lineHtml(autoMarks(esc(title)))}</span>`;

function appVersion() {
  const src = readFileSync(join(PURL, 'src', 'version.ts'), 'utf8');
  const m = src.match(/APP_VERSION\s*=\s*'([^']+)'/);
  return m ? m[1] : '';
}

// Pull a top-level array literal (RELEASES / DONE / NEXT / LATER) out of a
// .tsx file and evaluate it. The literals are plain data, so a string/comment
// aware bracket match plus Function eval keeps the site in lock-step with the
// app with no duplicated copy.
function sliceArray(src, fromIndex) {
  const start = src.indexOf('[', fromIndex);
  if (start < 0) throw new Error('no array after index ' + fromIndex);
  let depth = 0, str = null, escd = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (str) {
      if (escd) escd = false;
      else if (c === '\\') escd = true;
      else if (c === str) str = null;
      continue;
    }
    if (c === '/' && n === '/') { const nl = src.indexOf('\n', i); i = nl < 0 ? src.length : nl; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced array literal');
}
function readArray(tsxRelPath, varName) {
  const src = readFileSync(join(PURL, tsxRelPath), 'utf8');
  const idx = src.indexOf('const ' + varName);
  if (idx < 0) throw new Error(`${varName} not found in ${tsxRelPath}`);
  // Start after the assignment '=' so a TypeScript type annotation such as
  // `: Release[]` (whose own [] would otherwise match first) is skipped.
  const eq = src.indexOf('=', idx);
  if (eq < 0) throw new Error(`no assignment for ${varName} in ${tsxRelPath}`);
  // The app's data arrays may reference its compile-time feature flags (the
  // Roadmap does). The public site mirrors a stable build, where the garment
  // tool is compiled out, so the flag reads false here for the same reason
  // GUIDE_FLAGS.garment does.
  // The slice is TypeScript, not JavaScript: the app may cast inside it
  // (`] as Item[]`), which plain eval rejects. Strip the types with the
  // compiler itself rather than by pattern, so any valid TypeScript reads.
  const js = ts.transpile('const __data = (' + sliceArray(src, eq) + ');', {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.None,
  });
  return (new Function('GARMENT_ENTRY_POINTS', js + '\nreturn __data;'))(false);
}

// --- languages + resource links ------------------------------------------
// The top bar keeps Guide and Support; Privacy lives in the footer (the
// maintainer, 2026-10-18).
const NAVKEYS = ['home', 'guide', 'support'];
const SLUGS = {
  home: '/', guide: '/guide/', support: '/support/', feedback: '/feedback/',
  privacy: '/privacy/', terms: '/terms/', press: '/press/',
  changelog: '/changelog/', roadmap: '/roadmap/',
};
// Shared pages exist in English only (no /no/ variant): the app's changelog
// and roadmap data are English strings, so both languages link to the same
// pages. The guide is fully bilingual (user-guide/ + user-guide/no/).
const SHARED = new Set(['changelog', 'roadmap']);

function link(lang, key) {
  if (key === 'play') return SITE.playUrl;
  const dir = (lang === 'no' && !SHARED.has(key)) ? '/no' : '';
  return u(dir + SLUGS[key]);
}

// Authored site copy lives in the app repo (docs/site/copy.json) so it can be
// edited in the online editor and reviewed like the rest of our content. The
// generator resolves link/asset/constant tokens at build time. Structural bits
// (which resource keys go in which footer column) stay in code, not copy.
const COPY = JSON.parse(readFileSync(join(PURL, 'docs', 'site', 'copy.json'), 'utf8'));
const FOOTER_GROUPS = [
  ['home', 'guide', 'support', 'feedback'],
  ['changelog', 'roadmap'],
  ['privacy', 'terms'],
  ['press'],
];
function resolveTokens(str, lang) {
  if (str == null) return str;
  return String(str)
    .replace(/\{\{link:(\w+)\}\}/g, (_, k) => link(lang, k))
    .replace(/\{\{u:([^}]+)\}\}/g, (_, p) => u(p))
    .replace(/\{\{email\}\}/g, SITE.email)
    .replace(/\{\{playUrl\}\}/g, SITE.playUrl)
    .replace(/\{\{form\}\}/g, SITE.feedbackForm)
    .replace(/\{\{year\}\}/g, String(SITE.year));
}

function header(lang, activeKey, altHref) {
  const nav = NAVKEYS.map((key) => {
    const cur = key === activeKey ? ' aria-current="page"' : '';
    return `<a href="${link(lang, key)}"${cur}>${COPY[lang].nav[key]}</a>`;
  }).join('');
  const otherLang = lang === 'en' ? 'no' : 'en';
  const toggleAria = lang === 'en' ? 'Bytt til norsk / Switch to Norwegian' : 'Switch to English / Bytt til engelsk';
  // Both language codes always show (constant width), the current one bold;
  // the link goes to the other language.
  const codes = lang === 'en' ? '<b>EN</b><span aria-hidden="true">/</span>NO' : 'EN<span aria-hidden="true">/</span><b>NO</b>';
  const toggle = altHref ? `<a class="lang" href="${altHref}" hreflang="${otherLang}" aria-label="${toggleAria}">${codes}</a>` : '';
  return `<header class="site-header">
  <a class="brand" href="${link(lang, 'home')}"><img src="${u('/logo.png')}" alt="" width="30" height="30" /><span>Purl.</span></a>
  <nav class="site-nav">${nav}</nav>
  ${themeMoon(lang)}
  ${toggle}
</header>`;
}

// Theme: light by default, whatever the system says; a crescent moon in the
// header turns dark on, is filled while it is, and the choice is remembered
// (the maintainer, 2026-10-18: no Auto, one small button). ?theme=light|dark
// forces a theme, for screenshots. The Professional page's preview build
// (purl-site-pro, pro/build-pro.mjs) carries the same three pieces and
// takes these from the live page once they are here: keep them identical.
function themeMoon(lang) {
  const t = COPY[lang].theme;
  return `<button type="button" class="theme-moon" aria-pressed="false" aria-label="${escAttr(t.dark)}" title="${escAttr(t.dark)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z" /></svg></button>`;
}
// Head snippet: sets the theme before first paint (no flash). It sets
// data-theme even when storage throws, since the stylesheet hides the moon on
// a page without it (JavaScript off). The Professional preview build finds
// this snippet by its opening `<script>try{var q=`: keep that start.
const THEME_HEAD = `<meta name="color-scheme" content="light" />
<script>try{var q=/[?&]theme=(light|dark)/.exec(location.search);var d=(q?q[1]:localStorage.getItem('purl-theme'))==='dark';}catch(e){}document.documentElement.setAttribute('data-theme',d?'dark':'light');document.documentElement.style.colorScheme=d?'dark':'light';</script>`;
// Body-end snippet: wires the moon and remembers dark (light is the default,
// so turning dark off forgets the choice).
const THEME_SCRIPT = `<script>
(function () {
  var KEY = 'purl-theme';
  var root = document.documentElement;
  function apply(dark) {
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.style.colorScheme = dark ? 'dark' : 'light';
    var b = document.querySelectorAll('.theme-moon');
    for (var i = 0; i < b.length; i++) b[i].setAttribute('aria-pressed', dark ? 'true' : 'false');
  }
  // Each screenshot has a light and a dark picture, and the hidden one is
  // lazy, so a browser never fetched it and the first switch popped it in
  // (the maintainer, 2026-10-18). Both pictures of a shot load once it comes
  // near the screen, unless the visitor saves data. The watch starts after
  // the page has loaded, so the hero's hidden twin never competes with the
  // hero picture itself, the largest thing a visitor waits for.
  var c = navigator.connection, frugal = c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''));
  function warm(shot) { var im = shot.querySelectorAll('img'); for (var j = 0; j < im.length; j++) im[j].loading = 'eager'; }
  function watch() {
    var io = new IntersectionObserver(function (es) {
      for (var k = 0; k < es.length; k++) if (es[k].isIntersecting) { warm(es[k].target); io.unobserve(es[k].target); }
    }, { rootMargin: '600px 0px' });
    var shots = document.querySelectorAll('.shot');
    for (var s = 0; s < shots.length; s++) io.observe(shots[s]);
  }
  if (!frugal && 'IntersectionObserver' in window) {
    if (document.readyState === 'complete') watch(); else window.addEventListener('load', watch);
  }
  // A switch waits for the new theme's pictures on screen (at most 0.4 s),
  // then the page cross-fades from one theme to the other.
  function swap(dark) {
    var wait = [], im = document.querySelectorAll('.shot .' + (dark ? 'img-dark' : 'img-light'));
    for (var j = 0; j < im.length; j++) {
      var r = im[j].parentNode.getBoundingClientRect();
      if (r.bottom > -200 && r.top < innerHeight + 200 && im[j].decode) { im[j].loading = 'eager'; wait.push(im[j].decode().catch(function () {})); }
    }
    Promise.race([Promise.all(wait), new Promise(function (ok) { setTimeout(ok, 400); })]).then(function () {
      if (!document.startViewTransition) return apply(dark);
      root.classList.add('theme-fade');
      document.startViewTransition(function () { apply(dark); }).finished.then(function () { root.classList.remove('theme-fade'); }, function () { root.classList.remove('theme-fade'); });
    });
  }
  var b = document.querySelectorAll('.theme-moon');
  for (var i = 0; i < b.length; i++) b[i].addEventListener('click', function () {
    var dark = root.getAttribute('data-theme') !== 'dark';
    try { if (dark) localStorage.setItem(KEY, 'dark'); else localStorage.removeItem(KEY); } catch (e) {}
    swap(dark);
  });
  apply(root.getAttribute('data-theme') === 'dark');
})();
</script>`;

// Visit counting (the maintainer, 2026-10-17, "Count on our server"): each
// page load sends its path and, when the visitor came from another site, that
// site's domain, nothing else. The server keeps running totals only. A reload
// of the same page on the same day in the same tab is not sent again: the
// tab's sessionStorage remembers today's paths, and nothing leaves the
// browser for that. No cookie, no identifier.
const VISIT_SCRIPT = `<script>
(function () {
  try {
    var p = location.pathname, now = new Date(), key = 'purl-visit';
    var day = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    var seen = null;
    try { seen = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) {}
    if (!seen || seen.d !== day || !seen.p) seen = { d: day, p: [] };
    if (seen.p.indexOf(p) >= 0) return;
    var r = '';
    try { var h = document.referrer ? new URL(document.referrer).hostname : ''; if (h && h !== location.hostname) r = h; } catch (e) {}
    var body = JSON.stringify({ p: p, r: r }), url = ${JSON.stringify(SITE.visitUrl)};
    var sent = false;
    try { sent = !!(navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))); } catch (e) {}
    if (!sent && window.fetch) fetch(url, { method: 'POST', body: body, keepalive: true, credentials: 'omit', headers: { 'content-type': 'text/plain' } }).catch(function () {});
    seen.p.push(p);
    try { sessionStorage.setItem(key, JSON.stringify(seen)); } catch (e) {}
  } catch (e) {}
})();
</script>`;

function footer(lang) {
  const t = COPY[lang];
  const cols = FOOTER_GROUPS.map((keys, i) => `<div class="footer-col"><h2>${t.footerTitles[i]}</h2><ul>${
    keys.map((k) => `<li><a href="${link(lang, k)}">${t.footerLabel[k]}</a></li>`).join('')
  }</ul></div>`).join('');
  return `<footer class="site-footer"><div class="footer-inner">
  <div class="footer-cols">${cols}</div>
  <p class="footer-note">${resolveTokens(t.footerNote, lang)}</p>
</div></footer>`;
}

// path is the site-relative logical path (e.g. '/no/support/'); pageKey names
// the resource for the language toggle (omit for shared/no-toggle pages).
function shell({ lang, pageKey, activeKey, path, title, description, body, wide, jsonLd, noCounterpart, wrapClass = '' }) {
  const canonical = abs(path);
  // The name standing alone is the wordmark and carries its dot; in the home
  // title it opens a phrase and goes without (docs/conventions.md in the app).
  const pageTitle = pageKey === 'home' ? `${SITE.name}, ${title}` : `${title} | ${SITE.name}.`;
  const d = escAttr(description);
  // Shared pages (changelog/roadmap) are English only; offer a path to the
  // Norwegian home rather than a same-page counterpart that does not exist.
  // Everything else toggles to the SAME page in the other language.
  const enPath = path.startsWith('/no/') ? path.slice(3) : path;
  const noPath = '/no' + (enPath === '/' ? '/' : enPath);
  // A guide page can exist in one language and not the other: buildGuide skips
  // a page whose source is missing, so claiming the pair unconditionally would
  // point hreflang at a URL that was never written. Treat such a page like a
  // shared page instead: advertise only itself, and send the toggle to the
  // other language's guide index rather than to a 404.
  const alone = SHARED.has(pageKey) || noCounterpart;
  const altHref = alone
    ? link(lang === 'en' ? 'no' : 'en', SHARED.has(pageKey) ? 'home' : 'guide')
    : u(lang === 'en' ? noPath : enPath);
  const hreflang = alone
    ? `<link rel="alternate" hreflang="${COPY[lang].htmlLang}" href="${canonical}" />\n<link rel="alternate" hreflang="x-default" href="${canonical}" />`
    : `<link rel="alternate" hreflang="en" href="${abs(enPath)}" />\n<link rel="alternate" hreflang="no" href="${abs(noPath)}" />\n<link rel="alternate" hreflang="x-default" href="${abs(enPath)}" />`;
  const ogLocale = lang === 'no' ? 'nb_NO' : 'en_GB';
  const ogAlt = lang === 'no' ? 'en_GB' : 'nb_NO';
  return `<!doctype html>
<html lang="${COPY[lang].htmlLang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(pageTitle)}</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${canonical}" />
${hreflang}
<link rel="icon" href="${u('/assets/favicon.svg')}" type="image/svg+xml" />
<link rel="icon" href="${u('/assets/favicon-32.png')}" sizes="32x32" type="image/png" />
<link rel="apple-touch-icon" href="${u('/assets/apple-touch-icon.png')}" />
<link rel="stylesheet" href="${u('/assets/styles.css')}" />
${THEME_HEAD}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Purl." />
<meta property="og:locale" content="${ogLocale}" />
<meta property="og:locale:alternate" content="${ogAlt}" />
<meta property="og:title" content="${escAttr(pageTitle)}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${abs('/assets/og.png')}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="apple-itunes-app" content="app-id=${APPLE_APP_ID}" />
${jsonLd ? ldJson(jsonLd) : ''}</head>
<body>
${header(lang, activeKey || pageKey, altHref)}
<main class="wrap${wide ? ' wrap-wide' : ''}${wrapClass}">
${body}
</main>
${footer(lang)}
${THEME_SCRIPT}
${VISIT_SCRIPT}
</body>
</html>
`;
}

// Every page this run produced. The build never deletes output, so a page that
// stops being generated (a guide page dropped from the source, a section
// retired) would otherwise sit on disk, get committed by CI and stay live and
// indexable forever, orphaned and unlinked. Warn rather than delete: deciding
// what to remove from a published site is not a thing a build should do alone.
const WRITTEN = new Set();
function writePage(sitePath, html) {
  const rel = sitePath === '/' ? 'index.html' : sitePath.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
  const out = join(HERE, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, setHeadings(html), 'utf8');
  WRITTEN.add(out);
}

// --- markdown pages (privacy, terms) -------------------------------------
function stripDevNote(md) {
  const lines = md.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^>\s*Maintainer note/i.test(lines[i])) {
      while (i < lines.length && /^>/.test(lines[i])) i++;
      while (i < lines.length && lines[i].trim() === '') i++;
      i--;
      continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n');
}
function mdPage({ lang, pageKey, path, srcMd, title, description }) {
  const md = stripDevNote(readFileSync(join(PURL, srcMd), 'utf8'));
  let html = marked.parse(md);
  html = html.replace(/<p><em>((?:Last updated|Sist oppdatert):[^<]*)<\/em><\/p>/, '<p class="updated">$1</p>');
  return shell({ lang, pageKey, path, title, description, body: `<article class="prose">${html}</article>` });
}

// --- landing -------------------------------------------------------------
function downloadRow(lang) {
  const s = COPY[lang].store;
  return `<div class="btn-row">
  <a class="btn btn-primary btn-store" href="${SITE.appStoreUrl}"><span class="store-line"><span class="store-top">${s.get}</span>App Store</span></a>
  <a class="btn btn-primary btn-store" href="${SITE.playUrl}"><span class="store-line"><span class="store-top">${s.get}</span>Google Play</span></a>
</div>`;
}
// A screenshot pair: the light image shows by default, CSS flips to the dark
// one together with the palette. Files live in assets/landing/ (committed
// static assets): 640 px WebP captured from the current app on an emulator,
// with an iPhone status bar drawn in. The scripts and the steps are in the
// Purl repo's tools/site-shots/ (README.md there).
// Alt text describes the SCREENSHOT, not the heading next to it. A slogan
// ("Never forget what you have.") tells a screen reader nothing about the
// image and repeats text already on the page. The descriptions live in
// copy.json (shotAlt) so they are reviewed like the rest of the copy; the
// heading stays as a fallback for a key that has not been written yet.
// The hero's light picture is the largest thing on the first screen: it loads
// at once, ahead of everything else, while its dark twin waits as before.
function shotPair(lang, key, fallbackAlt, hero = false) {
  const alt = COPY[lang].shotAlt?.[key] || fallbackAlt;
  const file = `${lang}_${key}.webp`;
  const darkFile = `${lang}_${key}_dark.webp`;
  const first = hero ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  return `<span class="shot"><img class="img-light" src="${u('/assets/landing/' + file)}" alt="${escAttr(alt)}" ${first} /><img class="img-dark" src="${u('/assets/landing/' + darkFile)}" alt="" loading="lazy" aria-hidden="true" /></span>`;
}
// Which screenshot illustrates each landing feature, by index (structure
// stays in code; the editable text lives in copy.json's landing.feat).
// Stash goes LAST: the hero already shows the stash screen, so the feature
// tour runs patterns, projects, then closes on the stash + no-paywall punch.
const FEAT_IMGS = ['patterns', 'projects', 'stash'];

// A fanned band (the maintainer, 2026-10-18 22:09): three phones over each
// other, the middle one in front and the two beside it tilted back, with a
// caption under each. The text and each item's screenshot key live in
// copy.json (landing.pdftools, landing.makers); the second item is the one in
// front. The compact tools grid after the bands takes its screenshot keys
// from copy.json the same way (landing.toolsGrid.items[].img).
function fanBand(lang, band) {
  const phones = band.items.map((it) => `    <div class="phoneframe">${shotPair(lang, it.img, plain(it.title))}</div>`).join('\n');
  const caps = band.items.map((it) => `    <li><b>${line(it.title)}</b><span>${line(it.desc)}</span></li>`).join('\n');
  return `<section class="fanband">
  <p class="eyebrow">${line(band.eyebrow)}</p>
  <h2>${line(band.h2)}</h2>
  <p class="lsub">${line(band.sub)}</p>
  <div class="fan">
${phones}
  </div>
  <ul class="fancaps">
${caps}
  </ul>
</section>`;
}

// The "120 knitters used Purl in the last 24 hours" line (2026-10-17). The
// page is static, so the number arrives on load: the editor server answers
// { count, window }, with a window of 24h, 48h, 7d or 30d (the shortest that
// reaches 100), or nulls under 100. The line ships hidden and stays hidden on
// nulls, a failed fetch or an old browser. Its four wordings come from copy.json (landing.hero.live), phrased at build time,
// one per window, so the label always names the window the number covers.
function liveLine(lang) {
  const live = COPY[lang].landing.hero.live;
  if (!live) return '';
  const lines = {};
  for (const w of ['24h', '48h', '7d', '30d']) if (live[w]) lines[w] = line(live[w]);
  return `<p class="live-count" id="live-count" hidden data-src="${escAttr(SITE.liveCountUrl)}" data-lines="${escAttr(JSON.stringify(lines))}"></p>
    <script>
(function () {
  var el = document.getElementById('live-count');
  if (!el || !window.fetch || !window.JSON) return;
  var lines;
  try { lines = JSON.parse(el.getAttribute('data-lines')); } catch (e) { return; }
  fetch(el.getAttribute('data-src'), { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || typeof d.count !== 'number' || !(d.count > 0) || !lines[d.window]) return;
      var n = d.count.toLocaleString(${JSON.stringify(COPY[lang].htmlLang)});
      el.innerHTML = '<span class="live-dot" aria-hidden="true"></span><span>' + lines[d.window].replace('{n}', n) + '</span>';
      el.hidden = false;
    })
    .catch(function () {});
})();
</script>`;
}

function landing(lang) {
  const c = COPY[lang].landing;
  const h = c.hero;
  const cards = c.cards.map((card) => `  <li><a href="${link(lang, card.key)}">${lineHtml(card.title)}<span>${lineHtml(card.sub)}</span></a></li>`).join('\n');
  const pillars = c.pillars.map((p) => `  <div class="pillar"><h3>${line(p.title)}</h3><p>${line(p.desc)}</p></div>`).join('\n');
  const features = c.feat.map((ft, i) => {
    const img = FEAT_IMGS[i] || 'stash';
    const points = ft.points.map((p) => `      <li>${esc(p)}</li>`).join('\n');
    // The hero puts its phone on the RIGHT, so the first feature reverses
    // (phone LEFT) and the tour alternates right, left, right, left.
    return `<section class="lfeature${i % 2 === 0 ? ' lfeature-rev' : ''}">
  <div class="lfeature-text">
    <p class="eyebrow">${line(ft.eyebrow)}</p>
    <h2>${line(ft.h2)}</h2>
    <ul class="points">
${points}
    </ul>
  </div>
  <div class="lfeature-shot"><div class="phoneframe">${shotPair(lang, img, plain(ft.h2))}</div></div>
</section>`;
  }).join('\n');
  const body = `<section class="lhero">
  <div class="lhero-text">
    <p class="eyebrow">${line(h.eyebrow)}</p>
    <h1>${line(h.h1)}</h1>
    <p class="lsub">${line(h.sub)}</p>
    ${downloadRow(lang)}
    <p class="hero-note">${line(h.note)}</p>
    ${liveLine(lang)}
  </div>
  <div class="lhero-shot"><div class="phoneframe">${shotPair(lang, 'stash', plain(h.h1), true)}</div></div>
</section>

<div class="pillars">
${pillars}
</div>

${features}

${fanBand(lang, c.pdftools)}

${fanBand(lang, c.makers)}

<section class="toolsband">
  <h2>${line(c.toolsGrid.title)}</h2>
  <div class="toolsgrid">
${c.toolsGrid.items.map((it) => `    <figure class="toolcard">
      <div class="phoneframe">${shotPair(lang, it.img, plain(it.title))}</div>
      <figcaption><b>${line(it.title)}</b><span>${line(it.desc)}</span></figcaption>
    </figure>`).join('\n')}
  </div>
</section>

<section class="ipadband">
  <p class="eyebrow">${line(c.ipad.eyebrow)}</p>
  <h2>${line(c.ipad.h2)}</h2>
  <p class="lsub">${line(c.ipad.sub)}</p>
  <div class="ipadframe"><span class="shot"><img class="img-light" src="${u(`/assets/landing/${lang}_ipad.webp`)}" alt="${escAttr(COPY[lang].shotAlt?.ipad || plain(c.ipad.h2))}" loading="lazy" /><img class="img-dark" src="${u(`/assets/landing/${lang}_ipad_dark.webp`)}" alt="" loading="lazy" aria-hidden="true" /></span></div>
</section>

<section class="plumband">
  <h2>${line(c.band.h2)}</h2>
  <p>${line(c.band.p1)}</p>
  <p>${line(c.band.p2)}</p>
  <a class="btn plumband-btn" href="${SITE.appStoreUrl}">${esc(c.band.cta)}</a>
  <a class="btn plumband-btn" href="${SITE.playUrl}">${esc(c.band.ctaPlay || COPY[lang].footerLabel.play)}</a>
</section>

<h2 class="section-title">${lineHtml(c.exploreTitle)}</h2>
<ul class="cards">
${cards}
</ul>`;
  // WebSite is the one JSON-LD node with a visible effect: it is what Google
  // uses for the site name shown above a result. Deliberately nothing else.
  // No SearchAction (the sitelinks search box was removed in 2024), and no
  // BreadcrumbList (no visible breadcrumb trail exists to mark up).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    alternateName: `${SITE.name}.`,
    url: abs(lang === 'no' ? '/no/' : '/'),
    inLanguage: COPY[lang].htmlLang,
  };
  return shell({ lang, pageKey: 'home', path: link(lang, 'home').slice(BASE.length), title: c.tagline.replace('&amp;', '&'), description: c.desc, body, wide: true, jsonLd });
}

// --- support -------------------------------------------------------------
function support(lang) {
  const s = COPY[lang].support;
  const rt = (k) => resolveTokens(s[k], lang);
  const body = `<article class="prose">
  <h1>${s.h1}</h1>
  <p>${s.intro}</p>
</article>

<h2 class="section-title">${s.getApp}</h2>
${downloadRow(lang)}

<h2 class="section-title">${s.learn}</h2>
<article class="prose"><p>${rt('learnBody')}</p></article>

<h2 class="section-title">${s.fb}</h2>
<article class="prose"><p>${rt('fbBody')}</p></article>

<h2 class="section-title">${s.contact}</h2>
<article class="prose"><p>${rt('contactBody')}</p></article>

<h2 class="section-title">${s.dev}</h2>
<article class="prose"><p>${rt('devBody')}</p></article>`;
  return shell({ lang, pageKey: 'support', path: link(lang, 'support').slice(BASE.length), title: s.h1, description: s.desc, body });
}

// --- feedback redirect ---------------------------------------------------
function feedbackRedirect(lang) {
  const f = COPY[lang].feedback;
  return `<!doctype html>
<html lang="${COPY[lang].htmlLang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${f.title} | Purl</title>
<meta name="robots" content="noindex" />
<meta http-equiv="refresh" content="0; url=${SITE.feedbackForm}" />
<link rel="icon" href="${u('/assets/favicon.svg')}" type="image/svg+xml" />
<link rel="stylesheet" href="${u('/assets/styles.css')}" />
${THEME_HEAD}
</head>
<body>
${header(lang, null, link(lang === 'en' ? 'no' : 'en', 'feedback'))}
<main class="wrap">
  <article class="prose">
    <h1>${f.h1}</h1>
    <p>${resolveTokens(f.p1, lang)}</p>
    <p>${resolveTokens(f.p2, lang)}</p>
  </article>
</main>
${footer(lang)}
${THEME_SCRIPT}
<script>location.replace(${JSON.stringify(SITE.feedbackForm)});</script>
</body>
</html>
`;
}

// --- changelog (English, as in the app) ----------------------------------
function isMilestone(v) {
  const s = v.split('.').map((x) => parseInt(x, 10));
  return s.length === 3 && Number.isFinite(s[2]) && s[2] === 0;
}
// Turns true only when the crochet chart maker reaches stable (it did, v0.3.1a).
const CROCHET_LIVE = true;
function changelog() {
  // The app hides garment-only releases where the tool is compiled out, which
  // is every build a reader of this page can install. Same reason GUIDE_FLAGS
  // hides the garment sections of the guide: do not advertise a screen nobody
  // can open. Crochet-only releases stay hidden the same way until CROCHET_LIVE.
  // As in the app's hasWayIn, `crochetOnly` is asked first: a crochet card
  // also carries `garmentOnly`. Its build history (`crochetHistory`, the
  // wip and dev cards before stable) is folded away in the app; this page
  // has no fold, so it leaves them out.
  const releases = readArray('src/screens/ChangelogScreen.tsx', 'RELEASES').filter((r) =>
    r.crochetOnly ? CROCHET_LIVE && !r.crochetHistory : !r.garmentOnly);
  const eras = readArray('src/screens/ChangelogScreen.tsx', 'ERAS');
  // Mirror the app: the recent releases in full, and everything older folded
  // into era cards that say what the app became over that stretch. The page
  // and the What's new screen should tell the same story.
  const notesList = (r) => r.notes.map((n) => `      <li>${esc(n)}</li>`).join('\n');
  const full = (r) => {
    const date = r.date ? `<span class="date">${esc(r.date)}</span>` : '';
    return `  <section class="release${isMilestone(r.version) ? ' milestone' : ''}" id="v${escAttr(r.version)}">
    <div class="release-head">
      <h2>${releaseTitle(r.title)} <span class="ver">v${esc(r.version)}</span></h2>
      ${date}
    </div>
    <ul>
${notesList(r)}
    </ul>
  </section>`;
  };
  const folded = (r) => {
    const date = r.date ? `<span class="date">${esc(r.date)}</span>` : '';
    return `    <details class="release-fold${isMilestone(r.version) ? ' milestone' : ''}" id="v${escAttr(r.version)}">
      <summary>${releaseTitle(r.title)} <span class="ver">v${esc(r.version)}</span>${date}</summary>
      <ul>
${notesList(r)}
      </ul>
    </details>`;
  };

  const cut = eras.length ? releases.findIndex((r) => r.version === eras[0].from) : releases.length;
  const recent = releases.slice(0, cut < 0 ? releases.length : cut).map(full).join('\n');

  const eraBlocks = eras.map((e) => {
    const from = releases.findIndex((r) => r.version === e.from);
    const to = releases.findIndex((r) => r.version === e.to);
    if (from < 0 || to < 0) return '';
    const inside = releases.slice(from, to + 1);
    return `  <section class="era">
    <div class="era-head"><h2>${esc(e.title)}</h2><span class="date">${esc(e.period)}</span></div>
    <ul class="era-summary">
${e.summary.map((b) => `      <li>${esc(b)}</li>`).join('\n')}
    </ul>
    <details class="era-fold">
      <summary>Show all ${inside.length} releases, v${esc(e.to)} to v${esc(e.from)}</summary>
${inside.map(folded).join('\n')}
    </details>
  </section>`;
  }).join('\n');

  const body = `<article class="prose"><h1>What's new</h1>
  <p>The latest Purl updates, newest first, straight from the app's own "What's new" list. Everything before them is grouped below by the stretch of work it belongs to; open one to read the releases inside it.</p></article>
${recent}
<h2 class="section-title">Earlier releases</h2>
${eraBlocks}`;
  return shell({ lang: 'en', pageKey: 'changelog', path: SLUGS.changelog, title: "What's new", description: 'The full Purl changelog: every update and what changed, newest first.', body, wide: true });
}

function roadmap() {
  const groups = readArray('src/screens/RoadmapScreen.tsx', 'DONE_GROUPS');
  const next = readArray('src/screens/RoadmapScreen.tsx', 'NEXT');
  const later = readArray('src/screens/RoadmapScreen.tsx', 'LATER');
  const v = appVersion();
  const rows = (items) => items.map((it) => `    <div class="road-item">
      <span class="road-dot"></span>
      <div><div class="label">${esc(it.label)}</div>${it.sub ? `<div class="sub">${esc(it.sub)}</div>` : ''}</div>
    </div>`).join('\n');
  // A `pro` line is a Purl Professional tool, shown in the app only on test
  // builds (`PRO_TOOLS`, 2026-10-13). This page mirrors a stable build, so it
  // leaves them out, and a group left empty goes with them.
  const groupCards = groups.map((g) => ({ ...g, items: g.items.filter((it) => !it.pro) }))
    .filter((g) => g.items.length).map((g) => `  <section class="road road-done">
    <h3>${esc(g.title)}</h3>
${rows(g.items)}
  </section>`).join('\n');
  // An empty list hides its whole section, as the app's Roadmap screen does.
  const section = (title, sub, items, cls) => !items.length ? '' : `  <section class="road ${cls}">
    <h2>${esc(title)}</h2>
    <p class="road-sub">${esc(sub)}</p>
${rows(items)}
  </section>`;
  const body = `<article class="prose"><h1>Roadmap</h1>
  <p>What Purl does today, grouped by area, and what is coming. This mirrors the Roadmap screen inside the app. One promise shapes it all: your data stays on your device, so nothing here will ever need an account.</p></article>
<h2 class="section-title">In the app</h2>
${groupCards}
${section('Up next', 'The next things being worked on.', next, 'road-next')}
${section('Later', 'Further out, not yet scheduled.', later, 'road-later')}
<article class="prose"><p class="updated">Purl v${esc(v)}, early development.</p></article>`;
  return shell({ lang: 'en', pageKey: 'roadmap', path: SLUGS.roadmap, title: 'Roadmap', description: 'What Purl does today and what is coming next, mirroring the in-app roadmap.', body, wide: true });
}

// --- press ---------------------------------------------------------------
const SHOTS = [
  ['01-projects.png', 'Projects', 'Prosjekter'],
  ['02-stash.png', 'Yarn stash', 'Garnlager'],
  ['03-patterns.png', 'A PDF pattern', 'En PDF-oppskrift'],
  ['04-calculator.png', 'Craft calculator', 'Kalkulator'],
];
function copyShots() {
  const from = join(PURL, 'docs', 'release', 'screenshots', 'phone');
  const to = join(HERE, 'assets', 'press');
  mkdirSync(to, { recursive: true });
  for (const [file] of SHOTS) {
    const src = join(from, file);
    if (existsSync(src)) copyFileSync(src, join(to, file));
  }
}
function press(lang) {
  const p = COPY[lang].press;
  const shotCap = lang === 'no' ? 2 : 1; // index into SHOTS tuple for the caption
  const hexes = [COLORS.primary, COLORS.primaryDark, COLORS.bg, COLORS.text];
  const swatches = p.swatches.map((name, i) => `    <div class="swatch"><div class="chip" style="background:${hexes[i]}"></div><div class="meta"><b>${name}</b><span>${hexes[i]}</span></div></div>`).join('\n');
  const shots = SHOTS.map((row) => `    <figure style="margin:0"><img src="${u('/assets/press/' + row[0])}" alt="Purl: ${escAttr(row[shotCap])}" loading="lazy" /></figure>`).join('\n');
  const factRows = p.facts.map((f) => `  <tr><th>${esc(f.label)}</th><td>${esc(f.value)}</td></tr>`).join('\n');
  const body = `<article class="prose">
  <h1>${p.h1}</h1>
  <p>${p.about1}</p>
  <p>${p.about2}</p>
</article>

<h2 class="section-title">${p.fact}</h2>
<table class="facts">
${factRows}
  <tr><th>${p.websiteLabel}</th><td><a href="${link('en', 'home')}">purl.no</a></td></tr>
  <tr><th>${p.contactLabel}</th><td><a href="mailto:${SITE.email}">${SITE.email}</a></td></tr>
</table>

<h2 class="section-title">${p.logo}</h2>
<article class="prose"><p>${resolveTokens(p.logoBody, lang)}</p></article>

<h2 class="section-title">${p.colours}</h2>
<div class="swatches">
${swatches}
</div>

<h2 class="section-title">${p.shots}</h2>
<div class="shots">
${shots}
</div>`;
  return shell({ lang, pageKey: 'press', path: link(lang, 'press').slice(BASE.length), title: p.h1, description: p.desc, body, wide: true });
}

// --- user guide (bilingual: user-guide/ + user-guide/no/) -----------------
// [basename, EN title, NO title, isIndex, group]
// The guide is four groups: eight short task pages (a few numbered steps, a
// ringed picture each), where a newcomer starts, the short illustrated
// tutorials, and the reference pages they lead into. The order here is the
// order of the nav.
const GUIDE_PAGES = [
  ['task-yarn', 'Add a yarn', 'Legg til et garn', false, 'tasks'],
  ['task-pdf', 'Import a PDF pattern', 'Importer en PDF-oppskrift', false, 'tasks'],
  ['task-project', 'Start a project', 'Start et prosjekt', false, 'tasks'],
  ['task-count', 'Count rows', 'Tell rader', false, 'tasks'],
  ['task-row', 'Mark your row', 'Marker raden din', false, 'tasks'],
  ['task-chart', 'Follow a chart', 'Følg et diagram', false, 'tasks'],
  ['task-colour', 'Make a colour chart', 'Lag et fargediagram', false, 'tasks'],
  ['task-backup', 'Back up your data', 'Ta sikkerhetskopi av dataene dine', false, 'tasks'],
  ['README', 'User guide', 'Brukerveiledning', true, 'start'],
  ['getting-started', 'Getting started', 'Kom i gang', false, 'start'],
  ['tutorial-first-project', 'Your first project', 'Ditt første prosjekt', false, 'tutorial'],
  ['tutorial-read-a-pattern', 'Read a pattern', 'Les en oppskrift', false, 'tutorial'],
  ['tutorial-stash', 'Your yarn, in and out', 'Garnet ditt, inn og ut', false, 'tutorial'],
  ['tutorial-charts', 'Draw a chart', 'Lag et diagram', false, 'tutorial'],
  ['yarn-stash', 'Yarn stash', 'Stash', false, 'reference'],
  ['patterns', 'Patterns', 'Oppskrifter', false, 'reference'],
  ['projects', 'Projects', 'Prosjekter', false, 'reference'],
  ['pdf-tools', 'PDF tools', 'PDF-verktøy', false, 'reference'],
  ['chart-maker', 'Colour charts', 'Fargediagram', false, 'reference'],
  ['crochet-charts', 'Crochet charts', 'Heklediagram', false, 'reference'],
  ['barcode-templates', 'Barcodes and the yarn library', 'Strekkoder og garnbiblioteket', false, 'reference'],
  ['backups', 'Backups and recovery', 'Sikkerhetskopier og gjenoppretting', false, 'reference'],
  ['terminology', 'Terminology glossary', 'Terminologiordliste', false, 'reference'],
  ['calculator', 'Calculator', 'Kalkulator', false, 'reference'],
  ['faq', 'FAQ', 'FAQ', false, 'reference'],
];

const GUIDE_GROUPS = [
  ['tasks', 'How to', 'Slik gjør du'],
  ['start', 'Start here', 'Start her'],
  ['tutorial', 'Tutorials', 'Veiledninger'],
  ['reference', 'Reference', 'Oppslag'],
];

// Feature flags for guide content. A section fenced with
//   <!-- purl:flag garment --> ... <!-- /purl:flag -->
// is dropped unless its flag is on here. The garment maker is compiled out of
// the released app (src/featureFlags.ts), so a reader on purl.no cannot open
// it; documenting it publicly sends them looking for a screen that is not
// there. Turn the flag on in the same change that ships the feature.
// The rewritten guide (task pages, then reference pages, both languages) went
// public on 2026-10-20 (the maintainer), Norwegian reviewed in place after.
// Until then this was true and the site published a frozen copy of the older
// guide from guide-frozen/, now deleted; git history keeps it.
//
// The app deep-links to https://purl.no/guide/ from More, in both languages
// (MoreScreen.tsx), so this path must keep serving something: an unpublished
// guide is a 404 inside every installed copy of Purl.
const GUIDE_DRAFT = false;
const GUIDE_FROZEN = join(HERE, 'guide-frozen');

const GUIDE_FLAGS = { garment: false };

function stripFlagged(md) {
  const fence = /[ \t]*<!--\s*purl:flag\s+([a-z-]+)\s*-->[\s\S]*?<!--\s*\/purl:flag\s*-->[ \t]*\r?\n?/g;
  const marker = /[ \t]*<!--\s*\/?purl:flag[^>]*-->[ \t]*\r?\n?/g;
  return md.replace(fence, (block, flag) => (GUIDE_FLAGS[flag] ? block.replace(marker, '') : ''));
}

// The one place that decides a guide page's URL. `index` is served at the
// directory itself, which is what canonical, hreflang and the sitemap say.
function guideHref(dir, slug) {
  return slug === 'index' ? `${dir}/guide/` : `${dir}/guide/${slug}.html`;
}

function guideLinkRewrite(md, dir) {
  return md.replace(/\]\(\.?\/?([A-Za-z0-9_-]+)\.md(#[^)]*)?\)/g, (_, name, hash = '') => {
    // The guide index is canonically /guide/, not /guide/index.html. Internal
    // links must point at the canonical URL, not a form that only redirects.
    return `](${u(guideHref(dir, name === 'README' ? 'index' : name) + hash)})`;
  });
}
function guideSourceDir(lang) {
  return GUIDE_DRAFT
    ? join(GUIDE_FROZEN, lang === 'no' ? 'no' : '')
    : join(PURL, 'user-guide', lang === 'no' ? 'no' : '');
}

function guideNav(lang, currentSlug, t) {
  const dir = lang === 'no' ? '/no' : '';
  const heading = esc(t.allPages);
  const groups = GUIDE_GROUPS.map(([key, en, no]) => {
    const items = GUIDE_PAGES.filter((p) => p[4] === key)
      .filter(([base]) => existsSync(join(guideSourceDir(lang), `${base}.md`)))
      .map(([base, enT, noT]) => {
        const slug = base === 'README' ? 'index' : base;
        const cur = slug === currentSlug ? ' aria-current="page"' : '';
        return `<li><a href="${u(guideHref(dir, slug))}"${cur}>${lang === 'no' ? noT : enT}</a></li>`;
      })
      .join('');
    return items ? `<h3>${lang === 'no' ? no : en}</h3><ul>${items}</ul>` : '';
  }).join('');
  return `<nav class="pagenav pagenav-guide"><h2>${heading}</h2>${groups}</nav>`;
}

// --- guide navigation: search, page list, On this page, phone Contents ----
// Chosen from samples by the maintainer, 2026-10-20 (decision log in the Purl
// repo, docs/project-status.md). On a wide screen: the page list on the left
// with the search box above it, the page itself, and On this page in a column
// on the right. Under 1240 px On this page becomes a box before the page's
// first section. Under 900 px (a phone, an iPad held upright) a bar under the
// header holds a Contents button, which opens On this page and the pages in a
// drawer, and the search box.
//
// The search runs in the visitor's browser over an index this build writes
// next to the pages (/guide/search.json, /no/guide/search.json). The page
// fetches it from purl.no itself on the first search; the words typed are
// never sent anywhere. assets/guide.js is the client side.
//
// The texts live in copy.json (COPY[lang].guideNav), so they are edited and
// reviewed in the online editor like the rest of the site. These are the
// fallback for a key copy.json does not have yet; the build says which.
const GUIDE_NAV_TEXT = {
  en: {
    search: 'Search the guide', contents: 'Contents', onPage: 'On this page', pages: 'Guide pages',
    allPages: 'All guide pages', close: 'Close',
    one: '1 result', many: '{n} results', none: 'Nothing found for “{q}”.',
    more: 'The best 20 are shown. Add a word to narrow it down.', loading: 'Loading the search',
    failed: 'The search could not load. Check your connection and try again.',
  },
  no: {
    search: 'Søk i veiledningen', contents: 'Innhold', onPage: 'På denne siden', pages: 'Sider i veiledningen',
    allPages: 'Alle sider i veiledningen', close: 'Lukk',
    one: '1 treff', many: '{n} treff', none: 'Ingen treff for «{q}».',
    more: 'De 20 beste vises. Legg til et ord for å snevre inn.', loading: 'Laster søket',
    failed: 'Søket kunne ikke lastes. Sjekk nettet og prøv igjen.',
  },
};
const GUIDE_NAV_MISSING = new Set();
function gnText(lang) {
  const own = COPY[lang].guideNav || {};
  const out = {};
  for (const [key, fallback] of Object.entries(GUIDE_NAV_TEXT[lang])) {
    if (typeof own[key] === 'string' && own[key].trim()) out[key] = own[key];
    else { out[key] = fallback; GUIDE_NAV_MISSING.add(`${lang}.guideNav.${key}`); }
  }
  return out;
}

// Heading text as a reader sees it: inline tags dropped, block tags a space.
const htmlText = (h) => String(h)
  .replace(/<\/?(a|strong|em|code|span|b|i|kbd|mark|sup|sub)\b[^>]*>/g, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' })[e])
  .replace(/\s+/g, ' ')
  .trim();

// An id for every h2 and h3, made the way GitHub makes them (lower case,
// punctuation dropped, spaces to hyphens, a number on a repeat), so a guide
// link written as page.md#heading works on GitHub and on purl.no alike.
function guideHeadings(html) {
  const used = new Set();
  const heads = [];
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, level, inner) => {
    const text = htmlText(inner);
    const base = text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-') || 'section';
    let id = base;
    for (let n = 1; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    heads.push({ level: Number(level), id, text });
    return `<h${level} id="${escAttr(id)}">${inner}</h${level}>`;
  });
  return { html: out, heads };
}

// A page split at its h2 and h3 headings, as plain text, for the index. The
// part before the first heading belongs to the page itself (no anchor).
function guideSections(html) {
  return html.split(/(?=<h[23] id=")/).map((chunk) => {
    const m = /^<h([23]) id="([^"]*)">([\s\S]*?)<\/h\1>/.exec(chunk);
    const body = m ? chunk.slice(m[0].length) : chunk.replace(/<h1>[\s\S]*?<\/h1>/, '');
    return { a: m ? m[2] : '', h: m ? htmlText(m[3]) : '', x: htmlText(body) };
  }).filter((s) => s.h || s.x);
}

const GN_ICON = {
  mag: '<svg class="gn-mag" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 20 20" /></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h10" /></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>',
};
// One search box: the one in the side column shows on a wide screen, the
// one in the phone bar under 900 px.
function gnSearchBox(t, where) {
  return `<div class="gn-search gn-search-${where}" role="search"><span class="gn-field">${GN_ICON.mag}<input type="search" placeholder="${escAttr(t.search)}" aria-label="${escAttr(t.search)}" role="combobox" aria-expanded="false" aria-controls="gn-r-${where}" aria-autocomplete="list" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search" /></span><div class="gn-results" id="gn-r-${where}" role="listbox" aria-label="${escAttr(t.search)}" hidden></div></div>`;
}
// The page list for the side column and the phone drawer: every page by
// group, the current one marked.
function gnPages(lang, currentSlug, t) {
  const dir = lang === 'no' ? '/no' : '';
  const groups = GUIDE_GROUPS.map(([key, en, no]) => {
    const items = GUIDE_PAGES.filter((p) => p[4] === key)
      .filter(([base]) => existsSync(join(guideSourceDir(lang), `${base}.md`)))
      .map(([base, enT, noT]) => {
        const slug = base === 'README' ? 'index' : base;
        return `<li><a href="${u(guideHref(dir, slug))}"${slug === currentSlug ? ' aria-current="page"' : ''}>${lang === 'no' ? noT : enT}</a></li>`;
      }).join('');
    return items ? `<p class="gn-group">${lang === 'no' ? no : en}</p><ul>${items}</ul>` : '';
  }).join('');
  return `<nav class="gn-pages" aria-label="${escAttr(t.pages)}">${groups}</nav>`;
}

// The guide page around its article. A page with three sections or more gets
// On this page: the right-hand column, and a box before its first section
// (every intro is one to three short paragraphs), open from 900 px and folded
// on a phone (the script after it decides before the box paints). The right
// column is there on every page, empty on a short one, so the page list and
// the text stay put when the reader moves between pages.
function guideLayout(lang, slug, articleHtml, heads) {
  const t = gnText(lang);
  const dir = lang === 'no' ? '/no' : '';
  const h2s = heads.filter((h) => h.level === 2);
  const toc = h2s.length >= 3 ? h2s : [];
  let article = articleHtml;
  let rail = '';
  if (toc.length) {
    const list = `<ul>${toc.map((h) => `<li><a href="#${escAttr(h.id)}">${esc(h.text)}</a></li>`).join('')}</ul>`;
    const box = `<details class="gn-toc-box"><summary>${esc(t.onPage)} <span class="gn-n">${toc.length}</span></summary>${list}</details><script>if(innerWidth>899)document.currentScript.previousElementSibling.open=true</script>`;
    const at = article.indexOf('<h2 id=');
    article = article.slice(0, at) + box + article.slice(at);
    rail = `<nav class="gn-toc" aria-label="${escAttr(t.onPage)}"><p class="gn-toc-h">${esc(t.onPage)}</p>${list}</nav>`;
  }
  const ui = escAttr(JSON.stringify({ one: t.one, many: t.many, none: t.none, more: t.more, loading: t.loading, failed: t.failed }));
  return `<div class="gn" data-gn-index="${u(`${dir}/guide/search.json`)}" data-gn-ui="${ui}">
<div class="gn-bar"><button type="button" class="gn-cbtn" aria-expanded="false" aria-controls="gn-drawer">${GN_ICON.list}<span>${esc(t.contents)}</span></button>${gnSearchBox(t, 'bar')}</div>
<aside class="gn-side"><div class="gn-side-in">${gnSearchBox(t, 'side')}${gnPages(lang, slug, t)}</div></aside>
<div class="gn-main"><article class="prose">${article}</article>
${guideNav(lang, slug, t)}</div>
<aside class="gn-rail"><div class="gn-rail-in">${rail}</div></aside>
</div>
<div class="gn-drawer" id="gn-drawer" role="dialog" aria-modal="true" aria-label="${escAttr(t.contents)}" hidden><div class="gn-panel"><div class="gn-phead"><p>${esc(t.contents)}</p><button type="button" class="gn-x" aria-label="${escAttr(t.close)}">${GN_ICON.x}</button></div><div class="gn-dbody"></div></div></div>
<script src="${u('/assets/guide.js')}" defer></script>`;
}

// A WebP file's pixel size from its header (lossy VP8, lossless VP8L or the
// extended VP8X), or null for anything else.
function webpSize(file) {
  let b;
  try { b = readFileSync(file); } catch { return null; }
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (kind === 'VP8L') { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >>> 14) & 0x3fff) + 1 }; }
  if (kind === 'VP8X') return { w: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 };
  return null;
}

// Turn "image paragraph followed by an italic paragraph" into a real figure
// with a caption, and make every guide image lazy and full width. Markdown has
// no figure syntax, so the guide's convention (spec'd for the writers) is the
// image on its own line with the caption in italics under it.
function guideFigures(html, lang) {
  const dir = lang === 'no' ? '/no' : '';
  const imagePath = (src) => join(PURL, 'user-guide', lang === 'no' ? 'no' : '', 'images', src.split('/').pop());
  const haveImage = (src) => existsSync(imagePath(src));
  // A lazy picture is 0 px tall until it loads, so a jump to a section far
  // down lands short while the pictures above it grow. Its size, written in
  // at build time, lets styles.css hold the final box from the start.
  const sized = (src) => {
    const s = webpSize(imagePath(src));
    return s ? ` width="${s.w}" height="${s.h}" style="--w:${s.w};--h:${s.h}"` : '';
  };
  const fig = (src, alt, cap) =>
    !haveImage(src)
      ? cap
        ? `<p class="figpending">${cap}</p>`
        : ''
      :
    `<figure class="guidefig"><img src="${src}" alt="${alt}"${sized(src)} loading="lazy" decoding="async" />` +
    (cap ? `<figcaption>${cap}</figcaption>` : '') +
    `</figure>`;
  // Inside a numbered step, marked keeps the image and its caption in one
  // paragraph, separated by a newline. At the top level they are two
  // paragraphs. Both shapes are the same figure.
  html = html.replace(
    /<p><img src="([^"]+)" alt="([^"]*)"\s*\/?>\s*<em>([^<]+)<\/em><\/p>/g,
    (_, src, alt, cap) => fig(src, alt, cap),
  );
  html = html.replace(
    /<p><img src="([^"]+)" alt="([^"]*)"\s*\/?><\/p>\s*<p><em>([^<]+)<\/em><\/p>/g,
    (_, src, alt, cap) => fig(src, alt, cap),
  );
  html = html.replace(
    /<p><img src="([^"]+)" alt="([^"]*)"\s*\/?><\/p>/g,
    (_, src, alt) => fig(src, alt, ''),
  );
  return html;
}

function copyGuideImages(lang) {
  if (GUIDE_DRAFT) return 0; // the frozen guide predates the figures
  const from = join(PURL, 'user-guide', lang === 'no' ? 'no' : '', 'images');
  if (!existsSync(from)) return 0;
  const dir = lang === 'no' ? '/no' : '';
  const to = join(HERE, `${dir}/guide/images`.replace(/^\//, ''));
  mkdirSync(to, { recursive: true });
  let n = 0;
  for (const f of readdirSync(from)) {
    if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(f)) continue;
    copyFileSync(join(from, f), join(to, f));
    n++;
  }
  return n;
}

// A meta description for a guide page, derived from the page's own opening
// paragraph. That paragraph is authored, reviewed prose in both languages, so
// it reads like a person wrote it and it stays correct when the guide changes:
// a table keyed by slug in here would go stale the day the rewrite publishes.
// copy.json may override any single page (COPY[lang].guideMeta[slug].desc),
// either because the lede does not stand alone (it introduces a list, or is
// one short clause) or because the page is worth a written snippet: the guide
// index sells the whole guide, and a page whose opening is one long sentence
// would otherwise be truncated mid-thought.
function guideDescription(srcFile, lang, slug) {
  const override = COPY[lang].guideMeta?.[slug]?.desc;
  if (override) return override;
  const md = stripFlagged(readFileSync(srcFile, 'utf8'));
  const para = md
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .find((b) => b && !b.startsWith('#') && !b.startsWith('!') && !b.startsWith('>') &&
                 !b.startsWith('-') && !b.startsWith('*') && !/^\d+\./.test(b) &&
                 !b.startsWith('<!--') && !b.startsWith('|'));
  if (!para) return null;
  const text = para
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')       // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')    // links keep their text
    .replace(/[*_`]/g, '')                       // emphasis and code ticks
    .replace(/\s+/g, ' ')
    .trim();
  // A lede that introduces the list below it ("Two calculators in the app:")
  // or is a single short clause does not stand alone as a search snippet.
  // Refuse it so the caller's fallback runs, and say so, because the fix is a
  // copy.json override and nobody will write one they were not told about.
  if (text.length < 40 || /[:;]$/.test(text)) {
    console.warn(`guide description: ${lang}/${slug} lede does not stand alone ("${text}"), using the fallback. Add COPY.${lang}.guideMeta.${slug}.desc.`);
    return null;
  }
  if (text.length <= 155) return text;
  // Prefer a sentence boundary, fall back to a word boundary, never mid-word.
  // The boundary has to allow a closing quote or bracket after the stop, or a
  // lede that ends on quoted speech ('is "I am making this thing."') is missed
  // and ships as a dangling fragment. 40 matches the stand-alone floor above:
  // a complete first sentence is a better snippet than a truncated second one.
  const cut = text.slice(0, 156);
  const stops = [...cut.matchAll(/[.?!]["'”»)]?(?=\s)/g)];
  const stop = stops.length ? stops[stops.length - 1].index + stops[stops.length - 1][0].length : -1;
  if (stop >= 40) return cut.slice(0, stop);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '...';
}

function buildGuide(lang) {
  const dir = lang === 'no' ? '/no' : '';
  const src = guideSourceDir(lang);
  mkdirSync(join(HERE, `${dir}/guide`.replace(/^\//, '')), { recursive: true });
  let count = 0;
  copyGuideImages(lang);
  const index = { pages: [], s: [] };
  for (const [base, enTitle, noTitle, isIndex, group] of GUIDE_PAGES) {
    const srcFile = join(src, `${base}.md`);
    if (!existsSync(srcFile)) { console.warn(`skip (missing ${lang}): ${base}.md`); continue; }
    const title = COPY[lang].guideMeta?.[isIndex ? 'index' : base]?.title
      || (lang === 'no' ? noTitle : enTitle);
    const md = guideLinkRewrite(stripFlagged(readFileSync(srcFile, 'utf8')), dir);
    const { html: bodyHtml, heads } = guideHeadings(guideFigures(marked.parse(md), lang));
    const slug = isIndex ? 'index' : base;
    const groupRow = GUIDE_GROUPS.find(([key]) => key === group);
    index.pages.push({ t: lang === 'no' ? noTitle : enTitle, u: u(guideHref(dir, slug)), g: groupRow ? groupRow[lang === 'no' ? 2 : 1] : '' });
    for (const s of guideSections(bodyHtml)) index.s.push([index.pages.length - 1, s.h, s.a, s.x]);
    // Does this page exist in the other language? If not, it must not claim a
    // translation it does not have.
    const noCounterpart = !existsSync(join(guideSourceDir(lang === 'no' ? 'en' : 'no'), `${base}.md`));
    const html = shell({
      lang,
      pageKey: 'guide',
      activeKey: 'guide',
      noCounterpart,
      path: isIndex ? `${dir}/guide/` : `${dir}/guide/${slug}.html`,
      title,
      description: guideDescription(srcFile, lang, isIndex ? 'index' : base)
        || (lang === 'no'
          ? 'Hvordan du bruker Purl, i klarspråk: prosjekter, oppskrifter, stash, PDF-verktøyene og mer.'
          : 'How to use Purl, in plain language: projects, patterns, yarn stash, the PDF tools and more.'),
      body: guideLayout(lang, slug, bodyHtml, heads),
      wrapClass: ' wrap-guide',
    });
    const outFile = join(HERE, `${dir}/guide`.replace(/^\//, ''), `${slug}.html`);
    writeFileSync(outFile, setHeadings(html), 'utf8');
    WRITTEN.add(outFile);
    count++;
  }
  const indexFile = join(HERE, `${dir}/guide`.replace(/^\//, ''), 'search.json');
  writeFileSync(indexFile, JSON.stringify(index), 'utf8');
  WRITTEN.add(indexFile);
  const missing = [...GUIDE_NAV_MISSING].filter((k) => k.startsWith(`${lang}.`));
  if (missing.length) console.warn(`guide navigation: copy.json has no ${missing.join(', ')}; using the built-in text.`);
  return count;
}

// --- icons + open graph (rasterised from the real logo) ------------------
function logoDataUri() {
  const b = readFileSync(join(HERE, 'logo.png'));
  return `data:image/png;base64,${b.toString('base64')}`;
}
function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${COLORS.bg}"/><image href="${logoDataUri()}" x="5" y="5" width="54" height="54"/></svg>`;
}
function ogSvg() {
  let stitches = '';
  for (let x = 90; x < 1120; x += 46) stitches += `<path d="M${x} 560 l23 -26 l23 26" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${COLORS.bg}"/>
  <g fill="none" stroke="${COLORS.primary}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.22">${stitches}</g>
  <image href="${logoDataUri()}" x="110" y="150" width="250" height="250"/>
  <text x="398" y="285" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="118" fill="${COLORS.primaryDark}">Purl.</text>
  <text x="404" y="345" font-family="Arial, Helvetica, sans-serif" font-size="37" fill="${COLORS.muted}">Knitting &amp; crochet companion</text>
  <text x="404" y="410" font-family="Arial, Helvetica, sans-serif" font-size="29" fill="${COLORS.primary}">Private, offline, and on your device</text>
  <text x="404" y="455" font-family="Arial, Helvetica, sans-serif" font-size="25" fill="${COLORS.muted}">purl.no</text>
</svg>`;
}
async function buildIcons() {
  const dir = join(HERE, 'assets');
  mkdirSync(dir, { recursive: true });
  const favSvg = faviconSvg();
  writeFileSync(join(dir, 'favicon.svg'), favSvg, 'utf8');
  // In CI (SKIP_ICONS=1) keep the committed raster icons: text in the OG image
  // is font-rendered, and a Linux runner's fonts differ from the machine that
  // generated the committed PNGs, so regenerating them would churn on every run.
  // Regenerate icons locally (npm run build without SKIP_ICONS) when the logo or
  // OG design changes, and commit the new PNGs.
  if (process.env.SKIP_ICONS) { console.warn('SKIP_ICONS set: keeping committed favicon/og PNGs.'); return; }
  let Resvg;
  try { ({ Resvg } = await import('@resvg/resvg-js')); }
  catch { console.warn('resvg not installed: keeping committed PNGs (favicon-*.png, apple-touch-icon.png, og.png)'); return; }
  const render = (svg, width, out) => {
    const r = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } });
    writeFileSync(join(dir, out), r.render().asPng());
  };
  render(favSvg, 32, 'favicon-32.png');
  render(favSvg, 16, 'favicon-16.png');
  render(favSvg, 180, 'apple-touch-icon.png');
  render(ogSvg(), 1200, 'og.png');
}

// --- build-time link graph check -----------------------------------------
// hreflang and canonical are invisible when wrong, and Search Console stopped
// reporting hreflang errors when the International Targeting report was retired
// in 2022, so a build that emits a broken language graph would ship silently.
// This asserts what a crawler checks: every canonical, alternate and sitemap
// URL resolves to a file that was actually written, and the pages in a language
// pair point at each other. It exists mainly for the day GUIDE_DRAFT flips and
// five new pages per language appear.
function fileFor(url) {
  const path = url.replace(ORIGIN + BASE, '');
  return join(HERE, (path.endsWith('/') ? `${path}index.html` : path).replace(/^\//, ''));
}
// No page may say Purl is free or stays free (the maintainer, 2026-10-14):
// Purl Professional may change what costs money. Every page written, and the
// share image, is read as text. Most pages fail on any bare "free" or
// "gratis" (ad-free and free-text pass). The changelog and roadmap carry the
// app's own notes, where "a free stroke" is a drawing term, so they fail only
// on a claim phrase, as the app's ZU gate does. Privacy and terms are legal
// text, changed only by legal, so they are skipped here.
function verifyNoFreeClaim() {
  const bare = /(?<![-\w])(free|gratis)(?![-\w])/i;
  const claim = /\b(is|stays?|stayed|remains?|remained|always|everything stays) free\b|\bfree (and unlocked|for everyone)\b|\bfree, forever\b|\b(er|forblir|alltid) gratis\b/i;
  const text = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<meta [^>]*content="([^"]*)"[^>]*>/g, ' $1 ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const problems = [];
  for (const file of WRITTEN) {
    const rel = file.replace(HERE, '').replace(/\\/g, '/');
    if (!rel.endsWith('.html') || /^\/(no\/)?(privacy|terms)\//.test(rel)) continue;
    const words = text(readFileSync(file, 'utf8'));
    const hit = (/^\/(changelog|roadmap)\//.test(rel) ? claim : bare).exec(words);
    if (hit) problems.push(`${rel}: "...${words.slice(Math.max(0, hit.index - 50), hit.index + 30)}..."`);
  }
  const og = bare.exec(text(ogSvg()));
  if (og) problems.push(`og.png text: "${og[0]}"`);
  if (problems.length) throw new Error(`A page says Purl is free (fix it in docs/site/copy.json, the guide or the app):\n  ${problems.join('\n  ')}`);
}
// A phrase mark from copy.json ("|" or "||" between words) never reaches the
// reader: a string read without line() or plain() would show it. A title's
// " | Purl" has spaces around it and passes.
function verifyNoPhraseMarks() {
  const problems = [];
  for (const file of WRITTEN) {
    if (!file.endsWith('.html')) continue;
    const html = readFileSync(file, 'utf8').replace(/<(script|style|pre|code)[\s\S]*?<\/\1>/g, ' ');
    const text = html.replace(/<[^>]*\balt="([^"]*)"[^>]*>/g, ' $1 ').replace(/<meta [^>]*content="([^"]*)"[^>]*>/g, ' $1 ').replace(/<[^>]+>/g, ' ');
    const hit = /[^\s|]\|{1,2}[^\s|]|\|\|/.exec(text);
    if (hit) problems.push(`${file.replace(HERE, '')}: "...${text.slice(Math.max(0, hit.index - 40), hit.index + 40).replace(/\s+/g, ' ')}..."`);
  }
  if (problems.length) throw new Error(`A phrase mark shows on a page (read the string through line() or plain()):\n  ${problems.join('\n  ')}`);
}
function verifyLinkGraph() {
  const pages = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'guide-frozen') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) pages.push(full);
    }
  };
  walk(HERE);
  const problems = [];
  const alternates = new Map();
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    if (/<meta name="robots" content="noindex"/.test(html)) continue;
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (!canonical) { problems.push(`${file}: no canonical`); continue; }
    if (fileFor(canonical) !== file) problems.push(`${file}: canonical ${canonical} does not resolve back to this file`);
    const ogUrl = html.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
    if (ogUrl && ogUrl !== canonical) problems.push(`${file}: og:url ${ogUrl} disagrees with canonical ${canonical}`);
    const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]);
    for (const [code, href] of alts) {
      // WRITTEN, not existsSync: a leftover file from an earlier build exists
      // on disk but is no longer a page this site produces.
      if (!WRITTEN.has(fileFor(href))) problems.push(`${file}: hreflang ${code} points at ${href}, which was not written`);
    }
    alternates.set(canonical, alts.filter(([code]) => code !== 'x-default').map(([, href]) => href).sort().join(' '));
  }
  // Reciprocity: two pages that claim each other must advertise the same set.
  for (const [url, set] of alternates) {
    for (const href of set.split(' ').filter((h) => h && h !== url)) {
      const other = alternates.get(href);
      if (other === undefined) continue;
      if (other !== set) problems.push(`${url} and ${href} advertise different alternate sets`);
    }
  }
  const stale = pages.filter((f) => !WRITTEN.has(f));
  for (const f of stale) {
    // ::warning:: so it surfaces in the Actions run summary. A plain
    // console.warn scrolls past in a log nobody opens.
    const rel = f.replace(HERE, '').replace(/^[\\/]/, '').replace(/\\/g, '/');
    console.warn(`::warning file=${rel}::Stale output: no longer generated, but still live and indexable. Delete it deliberately.`);
  }
  const sitemap = readFileSync(join(HERE, 'sitemap.xml'), 'utf8');
  const listed = new Set();
  for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    listed.add(m[1]);
    if (!WRITTEN.has(fileFor(m[1]))) problems.push(`sitemap lists ${m[1]}, which was not written`);
  }
  // And the reverse: a page that is indexable but absent from the sitemap is
  // invisible to the one place we tell search engines to look.
  for (const url of alternates.keys()) {
    if (!listed.has(url)) problems.push(`${url} is indexable but missing from sitemap.xml`);
  }
  if (problems.length) {
    console.error('Link graph check FAILED:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`Link graph OK: ${alternates.size} indexable pages, canonical + hreflang + sitemap all resolve.`);
}

// --- robots + sitemap ----------------------------------------------------
function robotsAndSitemap(paths) {
  const urls = paths.map((p) => `  <url><loc>${abs(p)}</loc></url>`).join('\n');
  writeFileSync(join(HERE, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, 'utf8');
  writeFileSync(join(HERE, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${abs('/sitemap.xml')}\n`, 'utf8');
  // GitHub Pages reads this to serve the site on the custom domain. Written on
  // every build so a rebuild can never drop it.
  writeFileSync(join(HERE, 'CNAME'), 'purl.no\n', 'utf8');
}

// --- run -----------------------------------------------------------------
async function main() {
  if (!existsSync(PURL)) { console.error(`Sibling Purl repo not found at ${PURL}`); process.exit(1); }
  copyShots();

  // English + Norwegian pages
  for (const lang of ['en', 'no']) {
    const dir = lang === 'no' ? '/no' : '';
    writePage(`${dir}/`, landing(lang));
    writePage(`${dir}/support/`, support(lang));
    writePage(`${dir}/privacy/`, mdPage({
      lang, pageKey: 'privacy', path: `${dir}/privacy/`,
      srcMd: lang === 'no' ? 'docs/legal/privacy-policy.no.md' : 'docs/legal/privacy-policy.md',
      title: lang === 'no' ? 'Personvern' : 'Privacy policy',
      description: lang === 'no'
        ? 'Purls personvernerklæring: dataene dine blir på enheten din, uten kontoer, uten sporing, ingenting selges eller deles.'
        : "Purl's privacy policy: your data stays on your device, with no accounts, no tracking, and nothing sold or shared.",
    }));
    writePage(`${dir}/terms/`, mdPage({
      lang, pageKey: 'terms', path: `${dir}/terms/`,
      srcMd: lang === 'no' ? 'docs/legal/terms.no.md' : 'docs/legal/terms.md',
      title: lang === 'no' ? 'Vilkår for bruk' : 'Terms of use',
      description: lang === 'no'
        ? 'Vilkårene for bruk av Purl, en gratis app for strikking og hekling, i klarspråk.'
        : 'The plain-language terms of use for Purl, a free knitting and crochet companion app.',
    }));
    writePage(`${dir}/press/`, press(lang));
    writePage(`${dir}/feedback/`, feedbackRedirect(lang));
  }

  // Shared English pages
  writePage('/changelog/', changelog());
  writePage('/roadmap/', roadmap());
  const guideCount = buildGuide('en') + buildGuide('no');

  // sitemap + robots (English + Norwegian pages, guide pages in both languages)
  // Only advertise guide pages that were actually written. While GUIDE_DRAFT
  // holds the rewrite back, five of them do not exist, and a sitemap pointing
  // search engines at 404s is worse than a short sitemap.
  // Each language is filtered against its OWN output. Mirroring the English
  // list onto /no assumes the translation exists, and buildGuide skips a page
  // whose source is missing in one language: that assumption would put a 404
  // in the sitemap the first time a page lands in one language only.
  // Tested against what THIS run wrote, not against what is on disk: a page
  // dropped from the source but left behind by an earlier build still exists
  // as a file, and testing existsSync would keep advertising it forever.
  const guidePathsFor = (dir) => GUIDE_PAGES.filter(([, , , isIndex]) => !isIndex)
    .filter(([base]) => WRITTEN.has(join(HERE, `${dir}/guide/${base}.html`.replace(/^\//, ''))))
    .map(([base]) => `${dir}/guide/${base}.html`);
  robotsAndSitemap([
    '/', '/support/', '/privacy/', '/terms/', '/press/', '/changelog/', '/roadmap/', '/guide/',
    ...guidePathsFor(''),
    '/no/', '/no/support/', '/no/privacy/', '/no/terms/', '/no/press/', '/no/guide/',
    ...guidePathsFor('/no'),
  ]);
  verifyLinkGraph();
  verifyNoFreeClaim();
  verifyNoPhraseMarks();
  await buildIcons();
  console.log(`Built bilingual site (en + no) + ${guideCount} guide pages across both languages, icons, sitemap.`);
}

main();
