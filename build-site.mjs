// Build the whole public Purl site into this repo (root-served on GitHub Pages
// at https://purl-app.github.io/). Run with `npm run build`.
//
// One shared shell (header nav + full-sitemap footer + favicon + Open Graph)
// wraps every page, so nothing drifts:
//   - landing, support, press, feedback     -> authored here
//   - privacy, terms                        -> generated from ../Purl/docs/legal/*.md
//   - user guide                            -> generated from ../Purl/user-guide/*.md
//   - changelog, roadmap                    -> read straight from the app's own
//                                              data (ChangelogScreen / RoadmapScreen)
//   - favicon + og.png                      -> rasterised from the real logo
//
// Generated HTML + images are committed; node_modules is not. Style rules:
// no em dashes, no emojis in any output.

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const HERE = dirname(fileURLToPath(import.meta.url));
const PURL = join(HERE, '..', 'Purl');

const SITE = {
  base: 'https://purl-app.github.io',
  name: 'Purl',
  tagline: 'Knitting & crochet companion',
  playUrl: 'https://play.google.com/store/apps/details?id=no.purl.app',
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
// .tsx file and evaluate it. The literals are plain data (strings, numbers,
// line comments), so a string/comment-aware bracket match plus Function eval
// is safe and keeps the site in lock-step with the app with no duplicate copy.
function sliceArray(src, fromIndex) {
  const start = src.indexOf('[', fromIndex);
  if (start < 0) throw new Error('no array after index ' + fromIndex);
  let depth = 0, str = null, esc2 = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (str) {
      if (esc2) esc2 = false;
      else if (c === '\\') esc2 = true;
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

// --- shared shell --------------------------------------------------------
const NAV = [
  ['/', 'Home'],
  ['/guide/', 'Guide'],
  ['/support/', 'Support'],
  ['/privacy/', 'Privacy'],
];

function header(activePath) {
  const links = NAV.map(([href, label]) => {
    const cur = href === activePath ? ' aria-current="page"' : '';
    return `<a href="${href}"${cur}>${label}</a>`;
  }).join('');
  return `<header class="site-header">
  <a class="brand" href="/"><img src="/logo.png" alt="" width="30" height="30" /><span>Purl</span></a>
  <nav class="site-nav">${links}</nav>
</header>`;
}

function footer() {
  const cols = [
    ['Purl', [['/', 'Home'], ['/guide/', 'User guide'], ['/support/', 'Support'], ['/feedback/', 'Send feedback']]],
    ['Updates', [['/changelog/', "What's new"], ['/roadmap/', 'Roadmap']]],
    ['Legal', [['/privacy/', 'Privacy policy'], ['/terms/', 'Terms of use']]],
    ['More', [['/press/', 'Press kit'], [SITE.playUrl, 'Get it on Google Play']]],
  ];
  const html = cols.map(([h, links]) => `<div class="footer-col"><h3>${h}</h3><ul>${
    links.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('')
  }</ul></div>`).join('');
  return `<footer class="site-footer"><div class="footer-inner">
  <div class="footer-cols">${html}</div>
  <p class="footer-note">Purl, a free knitting and crochet companion. Your data stays on your device. &copy; ${SITE.year} Purl.</p>
</div></footer>`;
}

function shell({ path, title, description, body, wide }) {
  const canonical = SITE.base + path;
  const pageTitle = path === '/' ? `${SITE.name}, ${SITE.tagline}` : `${title} | ${SITE.name}`;
  const d = escAttr(description);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(pageTitle)}</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${canonical}" />
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
<link rel="stylesheet" href="/assets/styles.css" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Purl" />
<meta property="og:title" content="${escAttr(pageTitle)}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${SITE.base}/assets/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
</head>
<body>
${header(path)}
<main class="wrap${wide ? ' wrap-wide' : ''}">
${body}
</main>
${footer()}
</body>
</html>
`;
}

function writePage(path, html) {
  const rel = path === '/' ? 'index.html' : path.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
  const out = join(HERE, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, 'utf8');
  return rel;
}

// --- markdown pages (privacy, terms) -------------------------------------
// Drop the maintainer-note blockquote so it never reaches the public page.
function stripDevNote(md) {
  const lines = md.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^>\s*Maintainer note/i.test(lines[i])) {
      while (i < lines.length && /^>/.test(lines[i])) i++;   // skip the blockquote
      while (i < lines.length && lines[i].trim() === '') i++; // and trailing blank
      i--;
      continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n');
}
function mdPage({ path, srcMd, title, description }) {
  const md = stripDevNote(readFileSync(join(PURL, srcMd), 'utf8'));
  let html = marked.parse(md);
  html = html.replace(/<p><em>(Last updated:[^<]*)<\/em><\/p>/, '<p class="updated">$1</p>');
  return shell({ path, title, description, body: `<article class="prose">${html}</article>` });
}

// --- landing -------------------------------------------------------------
function downloadRow() {
  return `<div class="btn-row">
  <a class="btn btn-primary btn-store" href="${SITE.playUrl}"><span class="store-line"><span class="store-top">Get it on</span>Google Play</span></a>
  <span class="btn btn-store btn-disabled"><span class="store-line"><span class="store-top">Coming soon</span>App Store</span></span>
</div>`;
}
function landing() {
  const cards = [
    ['/guide/', 'User guide', 'Learn every part of Purl, in plain language.'],
    ['/support/', 'Support', 'Get help, get in touch, or support development.'],
    ['/feedback/', 'Send feedback', 'A short anonymous form for bugs and ideas.'],
    ['/roadmap/', 'Roadmap', 'What Purl does today and what is coming next.'],
    ['/changelog/', "What's new", 'Every update, newest first.'],
    ['/privacy/', 'Privacy policy', 'Your data stays on your device. Here is the detail.'],
    ['/terms/', 'Terms of use', 'The plain-language terms for using Purl.'],
    ['/press/', 'Press kit', 'Logo, screenshots, colours and a fact sheet.'],
  ];
  const body = `<section class="hero">
  <img src="/logo.png" alt="Purl logo" width="84" height="84" />
  <h1>Purl</h1>
  <p class="tagline">Knitting &amp; crochet companion</p>
</section>
<p class="lead">Purl keeps your projects, yarn stash, patterns and progress in one place: free, offline, and stored on your own device. No account, no sign-up, no ads. This is Purl's home on the web, with everything public in one spot.</p>
${downloadRow()}
<ul class="cards">
${cards.map(([href, t, s]) => `  <li><a href="${href}">${t}<span>${s}</span></a></li>`).join('\n')}
</ul>`;
  return shell({
    path: '/',
    title: 'Purl',
    description: "Purl is a free knitting and crochet companion app. Your projects, yarn stash, patterns and progress in one place, kept on your device.",
    body,
  });
}

// --- support -------------------------------------------------------------
function support() {
  const body = `<article class="prose">
  <h1>Support</h1>
  <p>Need a hand with Purl, or want to get in touch? Everything is on this page.</p>
</article>

<h2 class="section-title">Get the app</h2>
${downloadRow()}

<h2 class="section-title">Learn how it works</h2>
<article class="prose">
  <p>The <a href="/guide/">user guide</a> covers every part of Purl in plain language, from your first project to the PDF pattern tools. The <a href="/guide/faq.html">FAQ</a> answers the common questions and the things that look like bugs but are not.</p>
</article>

<h2 class="section-title">Send feedback</h2>
<article class="prose">
  <p>Found a bug or have an idea? Inside the app, the Send feedback button fills in your note and the app version for you. You can also open the <a href="/feedback/">anonymous feedback form</a> here in your browser. It never asks for your name or email.</p>
</article>

<h2 class="section-title">Contact</h2>
<article class="prose">
  <p>For anything else, email <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
</article>

<h2 class="section-title">Support development</h2>
<article class="prose">
  <p>Purl is free and stays free, with every feature unlocked for everyone. If it has helped you, there is an optional tip on the Support Purl screen inside the app. A tip unlocks nothing; it is just a thank-you that helps development continue. You can also share Purl with a knitting or crochet friend from the same screen.</p>
</article>`;
  return shell({
    path: '/support/',
    title: 'Support',
    description: 'Get help with Purl, read the guide and FAQ, send anonymous feedback, or get in touch.',
    body,
  });
}

// --- feedback redirect ---------------------------------------------------
function feedbackRedirect() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Send feedback | Purl</title>
<meta name="robots" content="noindex" />
<meta http-equiv="refresh" content="0; url=${SITE.feedbackForm}" />
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="/assets/styles.css" />
</head>
<body>
${header('/feedback/')}
<main class="wrap">
  <article class="prose">
    <h1>Opening the feedback form</h1>
    <p>Taking you to Purl's anonymous feedback form. If it does not open on its own, <a href="${SITE.feedbackForm}">open the form here</a>.</p>
    <p>The form is a Google Form. It never asks for your name or email. You can also go back to the <a href="/support/">support page</a> or the <a href="/">home page</a>.</p>
  </article>
</main>
<script>location.replace(${JSON.stringify(SITE.feedbackForm)});</script>
</body>
</html>
`;
}

// --- changelog -----------------------------------------------------------
function isMilestone(v) {
  const s = v.split('.').map((x) => parseInt(x, 10));
  return s.length === 3 && Number.isFinite(s[2]) && s[2] === 0;
}
function changelog() {
  const releases = readArray('src/screens/ChangelogScreen.tsx', 'RELEASES');
  const items = releases.map((r) => {
    const notes = r.notes.map((n) => `      <li>${esc(n)}</li>`).join('\n');
    const date = r.date ? `<span class="date">${esc(r.date)}</span>` : '';
    return `  <section class="release${isMilestone(r.version) ? ' milestone' : ''}" id="v${escAttr(r.version)}">
    <div class="release-head">
      <h3>${esc(r.title)} <span class="ver">v${esc(r.version)}</span></h3>
      ${date}
    </div>
    <ul>
${notes}
    </ul>
  </section>`;
  }).join('\n');
  const body = `<article class="prose"><h1>What's new</h1>
  <p>Every Purl update, newest first. You are on the same list the app shows under More, "What's new".</p></article>
${items}`;
  return shell({
    path: '/changelog/',
    title: "What's new",
    description: 'The full Purl changelog: every update and what changed, newest first.',
    body,
    wide: true,
  });
}

// --- roadmap -------------------------------------------------------------
function roadmap() {
  const done = readArray('src/screens/RoadmapScreen.tsx', 'DONE');
  const next = readArray('src/screens/RoadmapScreen.tsx', 'NEXT');
  const later = readArray('src/screens/RoadmapScreen.tsx', 'LATER');
  const v = appVersion();
  const section = (title, sub, items, cls) => {
    const rows = items.map((it) => `    <div class="road-item">
      <span class="road-dot"></span>
      <div><div class="label">${esc(it.label)}</div>${it.sub ? `<div class="sub">${esc(it.sub)}</div>` : ''}</div>
    </div>`).join('\n');
    return `  <section class="road ${cls}">
    <h3>${esc(title)}</h3>
    <p class="road-sub">${esc(sub)}</p>
${rows}
  </section>`;
  };
  const body = `<article class="prose"><h1>Roadmap</h1>
  <p>What Purl does today, what is coming next, and the bigger ideas for later. This mirrors the Roadmap screen inside the app.</p></article>
${section('In the app', 'Everything Purl already does.', done, 'road-done')}
${section('Up next', 'The next things being worked on.', next, 'road-next')}
${section('Later', 'Bigger ideas, not yet scheduled.', later, 'road-later')}
<article class="prose"><p class="updated">Purl v${esc(v)}, early development.</p></article>`;
  return shell({
    path: '/roadmap/',
    title: 'Roadmap',
    description: 'What Purl does today and what is coming next, mirroring the in-app roadmap.',
    body,
    wide: true,
  });
}

// --- press ---------------------------------------------------------------
const SHOTS = [
  ['01-projects.png', 'Projects'],
  ['02-stash.png', 'Yarn stash'],
  ['03-patterns.png', 'A PDF pattern'],
  ['04-calculator.png', 'Craft calculator'],
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
function press() {
  const swatches = [
    ['Plum', COLORS.primary], ['Plum dark', COLORS.primaryDark], ['Cream', COLORS.bg], ['Ink', COLORS.text],
  ].map(([name, hex]) => `    <div class="swatch"><div class="chip" style="background:${hex}"></div><div class="meta"><b>${name}</b><span>${hex}</span></div></div>`).join('\n');
  const shots = SHOTS.map(([file, cap]) => `    <figure style="margin:0"><img src="/assets/press/${file}" alt="Purl: ${escAttr(cap)}" loading="lazy" /></figure>`).join('\n');
  const body = `<article class="prose">
  <h1>Press kit</h1>
  <p>Purl is a calm, private companion for knitters and crocheters. Projects, yarn stash, patterns and progress live in one place, free, offline, and stored on the user's own device, with no account and no ads. Purl speaks Norwegian and English, and is built to feel right on iPad as well as phones.</p>
  <p>You are welcome to use the material below when writing about Purl. Please keep the logo's colours and proportions as they are.</p>
</article>

<h2 class="section-title">Fact sheet</h2>
<table class="facts">
  <tr><th>Name</th><td>Purl</td></tr>
  <tr><th>What it is</th><td>A knitting and crochet companion app</td></tr>
  <tr><th>Price</th><td>Free, with an optional in-app tip. Nothing is locked.</td></tr>
  <tr><th>Platforms</th><td>Android (Google Play). iPhone and iPad coming.</td></tr>
  <tr><th>Languages</th><td>Norwegian, English</td></tr>
  <tr><th>Privacy</th><td>Data stays on the device. No accounts, no tracking, nothing sold or shared.</td></tr>
  <tr><th>Website</th><td><a href="/">purl-app.github.io</a></td></tr>
  <tr><th>Contact</th><td><a href="mailto:${SITE.email}">${SITE.email}</a></td></tr>
</table>

<h2 class="section-title">Logo</h2>
<article class="prose"><p><a href="/logo.png">Download the logo (PNG)</a>. The mark is a single plum line on a transparent background.</p></article>

<h2 class="section-title">Brand colours</h2>
<div class="swatches">
${swatches}
</div>

<h2 class="section-title">Screenshots</h2>
<div class="shots">
${shots}
</div>`;
  return shell({
    path: '/press/',
    title: 'Press kit',
    description: 'Press kit for Purl: logo, screenshots, brand colours and a fact sheet.',
    body,
    wide: true,
  });
}

// --- user guide ----------------------------------------------------------
const GUIDE_PAGES = [
  ['README', 'User guide', true],
  ['getting-started', 'Getting started', false],
  ['yarn-stash', 'Yarn stash', false],
  ['patterns', 'Patterns', false],
  ['projects', 'Projects', false],
  ['pdf-tools', 'PDF tools', false],
  ['barcode-templates', 'Barcode templates', false],
  ['backups', 'Backups and recovery', false],
  ['terminology', 'Terminology glossary', false],
  ['calculator', 'Calculator', false],
  ['faq', 'FAQ', false],
];
function guideLinkRewrite(md) {
  return md.replace(/\]\(\.?\/?([A-Za-z0-9_-]+)\.md(#[^)]*)?\)/g, (_, name, hash = '') => {
    const slug = name === 'README' ? 'index' : name;
    return `](/guide/${slug}.html${hash})`;
  });
}
function guideNav(currentSlug) {
  const items = GUIDE_PAGES.map(([base, title]) => {
    const slug = base === 'README' ? 'index' : base;
    const cur = slug === currentSlug ? ' aria-current="page"' : '';
    return `<li><a href="/guide/${slug}.html"${cur}>${title}</a></li>`;
  }).join('');
  return `<nav class="pagenav"><h2>All guide pages</h2><ul>${items}</ul></nav>`;
}
function buildGuide() {
  const src = join(PURL, 'user-guide');
  mkdirSync(join(HERE, 'guide'), { recursive: true });
  let count = 0;
  for (const [base, title, isIndex] of GUIDE_PAGES) {
    const srcFile = join(src, `${base}.md`);
    if (!existsSync(srcFile)) { console.warn(`skip (missing): ${base}.md`); continue; }
    const md = guideLinkRewrite(readFileSync(srcFile, 'utf8'));
    const bodyHtml = marked.parse(md);
    const slug = isIndex ? 'index' : base;
    const html = shell({
      path: isIndex ? '/guide/' : `/guide/${slug}.html`,
      title: isIndex ? 'User guide' : title,
      description: isIndex
        ? 'How to use Purl, in plain language: projects, patterns, yarn stash, the PDF tools and more.'
        : `${title}: part of the Purl user guide.`,
      body: `<article class="prose">${bodyHtml}</article>\n${guideNav(slug)}`,
    });
    // Guide pages are file-style (/guide/getting-started.html) to match the
    // in-app link and existing URLs; index is /guide/index.html.
    writeFileSync(join(HERE, 'guide', `${slug}.html`), html, 'utf8');
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
  // A row of small knit chevrons along the foot, the logo, and the wordmark.
  let stitches = '';
  for (let x = 90; x < 1120; x += 46) {
    stitches += `<path d="M${x} 560 l23 -26 l23 26" />`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${COLORS.bg}"/>
  <g fill="none" stroke="${COLORS.primary}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.22">${stitches}</g>
  <image href="${logoDataUri()}" x="110" y="150" width="250" height="250"/>
  <text x="398" y="285" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="118" fill="${COLORS.primaryDark}">Purl</text>
  <text x="404" y="345" font-family="Arial, Helvetica, sans-serif" font-size="37" fill="${COLORS.muted}">Knitting &amp; crochet companion</text>
  <text x="404" y="410" font-family="Arial, Helvetica, sans-serif" font-size="29" fill="${COLORS.primary}">Free, private, and on your device</text>
  <text x="404" y="455" font-family="Arial, Helvetica, sans-serif" font-size="25" fill="${COLORS.muted}">purl-app.github.io</text>
</svg>`;
}
async function buildIcons() {
  const dir = join(HERE, 'assets');
  mkdirSync(dir, { recursive: true });
  const favSvg = faviconSvg();
  writeFileSync(join(dir, 'favicon.svg'), favSvg, 'utf8');
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
function robotsAndSitemap(guidePaths) {
  const pages = ['/', '/guide/', ...guidePaths, '/support/', '/privacy/', '/terms/', '/changelog/', '/roadmap/', '/press/'];
  const urls = pages.map((p) => `  <url><loc>${SITE.base}${p}</loc></url>`).join('\n');
  writeFileSync(join(HERE, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, 'utf8');
  writeFileSync(join(HERE, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${SITE.base}/sitemap.xml\n`, 'utf8');
}

// --- run -----------------------------------------------------------------
async function main() {
  if (!existsSync(PURL)) { console.error(`Sibling Purl repo not found at ${PURL}`); process.exit(1); }
  writePage('/', landing());
  writePage('/support/', support());
  writePage('/privacy/', mdPage({ path: '/privacy/', srcMd: 'docs/legal/privacy-policy.md', title: 'Privacy policy', description: "Purl's privacy policy: your data stays on your device, with no accounts, no tracking, and nothing sold or shared." }));
  writePage('/terms/', mdPage({ path: '/terms/', srcMd: 'docs/legal/terms.md', title: 'Terms of use', description: 'The plain-language terms of use for Purl, a free knitting and crochet companion app.' }));
  writePage('/changelog/', changelog());
  writePage('/roadmap/', roadmap());
  copyShots();
  writePage('/press/', press());
  mkdirSync(join(HERE, 'feedback'), { recursive: true });
  writeFileSync(join(HERE, 'feedback', 'index.html'), feedbackRedirect(), 'utf8');
  const guideCount = buildGuide();
  const guidePaths = GUIDE_PAGES.filter(([, , isIndex]) => !isIndex).map(([base]) => `/guide/${base}.html`);
  robotsAndSitemap(guidePaths);
  await buildIcons();
  console.log(`Built site: landing, support, privacy, terms, changelog, roadmap, press, feedback + ${guideCount} guide pages, icons, sitemap.`);
}

main();
