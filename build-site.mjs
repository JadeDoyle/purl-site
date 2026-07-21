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

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const HERE = dirname(fileURLToPath(import.meta.url));
const PURL = join(HERE, '..', 'Purl');

const ORIGIN = 'https://purl.no';
const BASE = '';                           // root-served on the purl.no custom domain
const u = (p) => BASE + p;                 // site-relative path -> href
const abs = (p) => ORIGIN + BASE + p;      // site-relative path -> absolute URL

const SITE = {
  name: 'Purl',
  playUrl: 'https://play.google.com/store/apps/details?id=no.purl.app',
  appStoreUrl: 'https://apps.apple.com/no/app/purl/id6788513793',
  feedbackForm: 'https://docs.google.com/forms/d/e/1FAIpQLSdXgzhbJAsj0Zkr3Qrj4zyk_lO9kETwUbGvxIWLFSstn9p4lw/viewform',
  email: 'pierre.boniface90@gmail.com',
  year: 2026,
};

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
  return (new Function('return (' + sliceArray(src, eq) + ')'))();
}

// --- languages + resource links ------------------------------------------
const NAVKEYS = ['home', 'guide', 'support', 'privacy'];
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
  ${themeSeg(lang)}
  ${toggle}
</header>`;
}

// Theme switch: Auto follows the system (like the app's own setting, with
// Auto first); a manual pick sets data-theme on <html> and is remembered.
function themeSeg(lang) {
  const t = COPY[lang].theme;
  return `<div class="theme-seg" role="group" aria-label="${escAttr(t.label)}">
    <button type="button" data-mode="">${t.auto}</button>
    <button type="button" data-mode="light">${t.light}</button>
    <button type="button" data-mode="dark">${t.dark}</button>
  </div>`;
}
// Head snippet: applies a stored manual theme before first paint (no flash).
const THEME_HEAD = `<meta name="color-scheme" content="light dark" />
<script>try{var t=localStorage.getItem('purl-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>`;
// Body-end snippet: wires the switch buttons and persists the choice.
const THEME_SCRIPT = `<script>
(function () {
  var KEY = 'purl-theme';
  var root = document.documentElement;
  function store(v) { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) {} }
  function apply(mode) {
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');
    root.style.colorScheme = mode || '';
    var btns = document.querySelectorAll('.theme-seg button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', (btns[i].getAttribute('data-mode') || '') === (mode || ''));
    }
  }
  var btns = document.querySelectorAll('.theme-seg button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () { var m = this.getAttribute('data-mode') || ''; store(m); apply(m); });
  }
  apply(root.getAttribute('data-theme') || '');
})();
</script>`;

function footer(lang) {
  const t = COPY[lang];
  const cols = FOOTER_GROUPS.map((keys, i) => `<div class="footer-col"><h2>${t.footerTitles[i]}</h2><ul>${
    keys.map((k) => `<li><a href="${link(lang, k)}">${t.footerLabel[k]}</a></li>`).join('')
  }</ul></div>`).join('');
  return `<footer class="site-footer"><div class="footer-inner">
  <div class="footer-cols">${cols}</div>
  <div class="footer-theme">${themeSeg(lang)}</div>
  <p class="footer-note">${resolveTokens(t.footerNote, lang)}</p>
</div></footer>`;
}

// path is the site-relative logical path (e.g. '/no/support/'); pageKey names
// the resource for the language toggle (omit for shared/no-toggle pages).
function shell({ lang, pageKey, activeKey, path, title, description, body, wide }) {
  const canonical = abs(path);
  const pageTitle = pageKey === 'home' ? `${SITE.name}, ${title}` : `${title} | ${SITE.name}`;
  const d = escAttr(description);
  // Shared pages (changelog/roadmap) are English only; offer a path to the
  // Norwegian home rather than a same-page counterpart that does not exist.
  // Everything else toggles to the SAME page in the other language.
  const enPath = path.startsWith('/no/') ? path.slice(3) : path;
  const noPath = '/no' + (enPath === '/' ? '/' : enPath);
  const altHref = SHARED.has(pageKey) ? link('no', 'home') : u(lang === 'en' ? noPath : enPath);
  const hreflang = SHARED.has(pageKey)
    ? `<link rel="alternate" hreflang="en" href="${canonical}" />\n<link rel="alternate" hreflang="x-default" href="${canonical}" />`
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
<meta property="og:site_name" content="Purl" />
<meta property="og:locale" content="${ogLocale}" />
<meta property="og:locale:alternate" content="${ogAlt}" />
<meta property="og:title" content="${escAttr(pageTitle)}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${abs('/assets/og.png')}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
</head>
<body>
${header(lang, activeKey || pageKey, altHref)}
<main class="wrap${wide ? ' wrap-wide' : ''}">
${body}
</main>
${footer(lang)}
${THEME_SCRIPT}
</body>
</html>
`;
}

function writePage(sitePath, html) {
  const rel = sitePath === '/' ? 'index.html' : sitePath.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
  const out = join(HERE, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, 'utf8');
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
  <span class="btn btn-store btn-disabled"><span class="store-line"><span class="store-top">${s.soon}</span>Google Play</span></span>
</div>`;
}
// A screenshot pair: the light image shows by default, CSS flips to the dark
// one together with the palette. Files live in assets/landing/ (committed
// static assets, regenerated from the current App Store screenshots).
function shotPair(file, darkFile, alt) {
  return `<span class="shot"><img class="img-light" src="${u('/assets/landing/' + file)}" alt="${escAttr(alt)}" loading="lazy" /><img class="img-dark" src="${u('/assets/landing/' + darkFile)}" alt="" loading="lazy" aria-hidden="true" /></span>`;
}
// Which screenshot illustrates each landing feature, by index (structure
// stays in code; the editable text lives in copy.json's landing.feat).
// Stash goes LAST: the hero already shows the stash screen, so the feature
// tour runs patterns, projects, then closes on the stash + no-paywall punch.
const FEAT_IMGS = ['patterns', 'projects', 'stash'];
// The compact tools grid after the features, same idea: images by index,
// text in copy.json's landing.tools.items.
const TOOL_IMGS = ['chartmaker', 'terminology', 'timeline', 'calculator'];

function landing(lang) {
  const c = COPY[lang].landing;
  const h = c.hero;
  const cards = c.cards.map((card) => `  <li><a href="${link(lang, card.key)}">${card.title}<span>${card.sub}</span></a></li>`).join('\n');
  const pillars = c.pillars.map((p) => `  <div class="pillar"><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p></div>`).join('\n');
  const features = c.feat.map((ft, i) => {
    const img = FEAT_IMGS[i] || 'stash';
    const points = ft.points.map((p) => `      <li>${esc(p)}</li>`).join('\n');
    // The hero puts its phone on the RIGHT, so the first feature reverses
    // (phone LEFT) and the tour alternates right, left, right, left.
    return `<section class="lfeature${i % 2 === 0 ? ' lfeature-rev' : ''}">
  <div class="lfeature-text">
    <p class="eyebrow">${esc(ft.eyebrow)}</p>
    <h2>${esc(ft.h2)}</h2>
    <ul class="points">
${points}
    </ul>
  </div>
  <div class="lfeature-shot"><div class="phoneframe">${shotPair(`${lang}_${img}.png`, `${lang}_${img}_dark.png`, ft.h2)}</div></div>
</section>`;
  }).join('\n');
  const body = `<section class="lhero">
  <div class="lhero-text">
    <p class="eyebrow">${esc(h.eyebrow)}</p>
    <h1>${esc(h.h1)}</h1>
    <p class="lsub">${esc(h.sub)}</p>
    ${downloadRow(lang)}
    <p class="hero-note">${esc(h.note)}</p>
  </div>
  <div class="lhero-shot"><div class="phoneframe">${shotPair(`${lang}_stash.png`, `${lang}_stash_dark.png`, h.h1)}</div></div>
</section>

<div class="pillars">
${pillars}
</div>

${features}

<section class="toolsband">
  <h2>${esc(c.tools.title)}</h2>
  <div class="toolsgrid">
${c.tools.items.map((it, i) => {
    const img = TOOL_IMGS[i] || 'calculator';
    return `    <figure class="toolcard">
      <div class="phoneframe">${shotPair(`${lang}_${img}.png`, `${lang}_${img}_dark.png`, it.title)}</div>
      <figcaption><b>${esc(it.title)}</b><span>${esc(it.desc)}</span></figcaption>
    </figure>`;
  }).join('\n')}
  </div>
</section>

<section class="ipadband">
  <p class="eyebrow">${esc(c.ipad.eyebrow)}</p>
  <h2>${esc(c.ipad.h2)}</h2>
  <p class="lsub">${esc(c.ipad.sub)}</p>
  <div class="ipadframe"><span class="shot"><img class="img-light" src="${u('/assets/landing/ipad.jpg')}" alt="${escAttr(c.ipad.h2)}" loading="lazy" /><img class="img-dark" src="${u('/assets/landing/ipad_dark.jpg')}" alt="" loading="lazy" aria-hidden="true" /></span></div>
</section>

<section class="plumband">
  <h2>${esc(c.band.h2)}</h2>
  <p>${esc(c.band.p1)}</p>
  <p>${esc(c.band.p2)}</p>
  <a class="btn plumband-btn" href="${SITE.appStoreUrl}">${esc(c.band.cta)}</a>
</section>

<h2 class="section-title">${c.exploreTitle}</h2>
<ul class="cards">
${cards}
</ul>`;
  return shell({ lang, pageKey: 'home', path: link(lang, 'home').slice(BASE.length), title: c.tagline.replace('&amp;', '&'), description: c.desc, body, wide: true });
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
function changelog() {
  const releases = readArray('src/screens/ChangelogScreen.tsx', 'RELEASES');
  // The full history is long (170+ releases). Show the most recent ones in
  // full and fold everything older behind a tap, so the page stays scannable
  // without hiding anything.
  const RECENT = 8;
  const notesList = (r) => r.notes.map((n) => `      <li>${esc(n)}</li>`).join('\n');
  const recent = releases.slice(0, RECENT).map((r) => {
    const date = r.date ? `<span class="date">${esc(r.date)}</span>` : '';
    return `  <section class="release${isMilestone(r.version) ? ' milestone' : ''}" id="v${escAttr(r.version)}">
    <div class="release-head">
      <h2>${esc(r.title)} <span class="ver">v${esc(r.version)}</span></h2>
      ${date}
    </div>
    <ul>
${notesList(r)}
    </ul>
  </section>`;
  }).join('\n');
  const older = releases.slice(RECENT).map((r) => {
    const date = r.date ? `<span class="date">${esc(r.date)}</span>` : '';
    return `  <details class="release-fold${isMilestone(r.version) ? ' milestone' : ''}" id="v${escAttr(r.version)}">
    <summary>${esc(r.title)} <span class="ver">v${esc(r.version)}</span>${date}</summary>
    <ul>
${notesList(r)}
    </ul>
  </details>`;
  }).join('\n');
  const body = `<article class="prose"><h1>What's new</h1>
  <p>The latest Purl updates, newest first, straight from the app's own "What's new" list. Earlier releases are folded below; tap one to open it.</p></article>
${recent}
<h2 class="section-title">Earlier releases</h2>
${older}`;
  return shell({ lang: 'en', pageKey: 'changelog', path: SLUGS.changelog, title: "What's new", description: 'The full Purl changelog: every update and what changed, newest first.', body, wide: true });
}

// --- roadmap (English, as in the app) ------------------------------------
function roadmap() {
  const groups = readArray('src/screens/RoadmapScreen.tsx', 'DONE_GROUPS');
  const next = readArray('src/screens/RoadmapScreen.tsx', 'NEXT');
  const later = readArray('src/screens/RoadmapScreen.tsx', 'LATER');
  const v = appVersion();
  const rows = (items) => items.map((it) => `    <div class="road-item">
      <span class="road-dot"></span>
      <div><div class="label">${esc(it.label)}</div>${it.sub ? `<div class="sub">${esc(it.sub)}</div>` : ''}</div>
    </div>`).join('\n');
  const groupCards = groups.map((g) => `  <section class="road road-done">
    <h3>${esc(g.title)}</h3>
${rows(g.items)}
  </section>`).join('\n');
  const section = (title, sub, items, cls) => `  <section class="road ${cls}">
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
// [basename, EN title, NO title, isIndex]
const GUIDE_PAGES = [
  ['README', 'User guide', 'Brukerveiledning', true],
  ['getting-started', 'Getting started', 'Kom i gang', false],
  ['yarn-stash', 'Yarn stash', 'Stash', false],
  ['patterns', 'Patterns', 'Mønstre', false],
  ['projects', 'Projects', 'Prosjekter', false],
  ['pdf-tools', 'PDF tools', 'PDF-verktøy', false],
  ['barcode-templates', 'Barcode templates', 'Strekkode-maler', false],
  ['backups', 'Backups and recovery', 'Sikkerhetskopier og gjenoppretting', false],
  ['terminology', 'Terminology glossary', 'Terminologiordlisten', false],
  ['calculator', 'Calculator', 'Strikkekalkulator', false],
  ['faq', 'FAQ', 'FAQ', false],
];
function guideLinkRewrite(md, dir) {
  return md.replace(/\]\(\.?\/?([A-Za-z0-9_-]+)\.md(#[^)]*)?\)/g, (_, name, hash = '') => {
    const slug = name === 'README' ? 'index' : name;
    return `](${u(dir + '/guide/' + slug + '.html' + hash)})`;
  });
}
function guideNav(lang, currentSlug) {
  const dir = lang === 'no' ? '/no' : '';
  const items = GUIDE_PAGES.map(([base, en, no]) => {
    const slug = base === 'README' ? 'index' : base;
    const cur = slug === currentSlug ? ' aria-current="page"' : '';
    return `<li><a href="${u(dir + '/guide/' + slug + '.html')}"${cur}>${lang === 'no' ? no : en}</a></li>`;
  }).join('');
  const heading = lang === 'no' ? 'Alle sider i veiledningen' : 'All guide pages';
  return `<nav class="pagenav"><h2>${heading}</h2><ul>${items}</ul></nav>`;
}
function buildGuide(lang) {
  const dir = lang === 'no' ? '/no' : '';
  const src = join(PURL, 'user-guide', lang === 'no' ? 'no' : '');
  mkdirSync(join(HERE, `${dir}/guide`.replace(/^\//, '')), { recursive: true });
  let count = 0;
  for (const [base, enTitle, noTitle, isIndex] of GUIDE_PAGES) {
    const srcFile = join(src, `${base}.md`);
    if (!existsSync(srcFile)) { console.warn(`skip (missing ${lang}): ${base}.md`); continue; }
    const title = lang === 'no' ? noTitle : enTitle;
    const md = guideLinkRewrite(readFileSync(srcFile, 'utf8'), dir);
    const bodyHtml = marked.parse(md);
    const slug = isIndex ? 'index' : base;
    const html = shell({
      lang,
      pageKey: 'guide',
      activeKey: 'guide',
      path: isIndex ? `${dir}/guide/` : `${dir}/guide/${slug}.html`,
      title,
      description: isIndex
        ? (lang === 'no'
          ? 'Hvordan du bruker Purl, i klarspråk: prosjekter, mønstre, stash, PDF-verktøyene og mer.'
          : 'How to use Purl, in plain language: projects, patterns, yarn stash, the PDF tools and more.')
        : (lang === 'no' ? `${title}: en del av Purls brukerveiledning.` : `${title}: part of the Purl user guide.`),
      body: `<article class="prose">${bodyHtml}</article>\n${guideNav(lang, slug)}`,
    });
    writeFileSync(join(HERE, `${dir}/guide`.replace(/^\//, ''), `${slug}.html`), html, 'utf8');
    count++;
  }
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
  <text x="404" y="410" font-family="Arial, Helvetica, sans-serif" font-size="29" fill="${COLORS.primary}">Free, private, and on your device</text>
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
        ? 'Vilkårene for bruk av Purl, en gratis følgesvenn-app for strikking og hekling, i klarspråk.'
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
  const guidePaths = GUIDE_PAGES.filter(([, , , isIndex]) => !isIndex).map(([base]) => `/guide/${base}.html`);
  robotsAndSitemap([
    '/', '/support/', '/privacy/', '/terms/', '/press/', '/changelog/', '/roadmap/', '/guide/', ...guidePaths,
    '/no/', '/no/support/', '/no/privacy/', '/no/terms/', '/no/press/', '/no/guide/',
    ...guidePaths.map((p) => '/no' + p),
  ]);
  await buildIcons();
  console.log(`Built bilingual site (en + no) + ${guideCount} guide pages across both languages, icons, sitemap.`);
}

main();
