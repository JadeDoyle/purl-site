// Build the whole public Purl site into this repo. Run with `npm run build`.
//
// Served by GitHub Pages. Today that is https://jadedoyle.github.io/purl-site/
// (a project page under a /purl-site/ subpath). The subpath is the single knob
// BASE below: when the site later moves to a `purl-app` org repo named
// `purl-app.github.io` (root-served), set BASE = '' and ORIGIN to the new host,
// rebuild, and every link updates. FILE paths never include BASE (the repo root
// is what Pages serves); only URLs do.
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

const ORIGIN = 'https://jadedoyle.github.io';
const BASE = '/purl-site';                 // '' once root-served under an org
const u = (p) => BASE + p;                 // site-relative path -> href
const abs = (p) => ORIGIN + BASE + p;      // site-relative path -> absolute URL

const SITE = {
  name: 'Purl',
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
// Shared pages exist in English only (no /no/ variant): the app's guide,
// changelog and roadmap are English, so both languages link to the same pages.
const SHARED = new Set(['guide', 'changelog', 'roadmap']);

function link(lang, key) {
  if (key === 'play') return SITE.playUrl;
  const dir = (lang === 'no' && !SHARED.has(key)) ? '/no' : '';
  return u(dir + SLUGS[key]);
}

const T = {
  en: {
    htmlLang: 'en',
    toggle: 'Norsk',
    nav: { home: 'Home', guide: 'Guide', support: 'Support', privacy: 'Privacy' },
    footerCols: [
      ['Purl', ['home', 'guide', 'support', 'feedback']],
      ['Updates', ['changelog', 'roadmap']],
      ['Legal', ['privacy', 'terms']],
      ['More', ['press', 'play']],
    ],
    footerLabel: {
      home: 'Home', guide: 'User guide', support: 'Support', feedback: 'Send feedback',
      changelog: "What's new", roadmap: 'Roadmap', privacy: 'Privacy policy',
      terms: 'Terms of use', press: 'Press kit', play: 'Get it on Google Play',
    },
    footerNote: `Purl, a free knitting and crochet companion. Your data stays on your device. &copy; ${SITE.year} Purl.`,
    store: { get: 'Get it on', soon: 'Coming soon' },
  },
  no: {
    htmlLang: 'no',
    toggle: 'English',
    nav: { home: 'Hjem', guide: 'Veiledning', support: 'Støtte', privacy: 'Personvern' },
    footerCols: [
      ['Purl', ['home', 'guide', 'support', 'feedback']],
      ['Oppdateringer', ['changelog', 'roadmap']],
      ['Juridisk', ['privacy', 'terms']],
      ['Mer', ['press', 'play']],
    ],
    footerLabel: {
      home: 'Hjem', guide: 'Brukerveiledning (engelsk)', support: 'Støtte', feedback: 'Send tilbakemelding',
      changelog: 'Nyheter (engelsk)', roadmap: 'Veikart (engelsk)', privacy: 'Personvern',
      terms: 'Vilkår for bruk', press: 'Pressemateriell', play: 'Last ned på Google Play',
    },
    footerNote: `Purl, en gratis følgesvenn for strikking og hekling. Dataene dine blir på enheten din. &copy; ${SITE.year} Purl.`,
    store: { get: 'Last ned på', soon: 'Kommer snart' },
  },
};

function header(lang, activeKey, altHref) {
  const nav = NAVKEYS.map((key) => {
    const cur = key === activeKey ? ' aria-current="page"' : '';
    return `<a href="${link(lang, key)}"${cur}>${T[lang].nav[key]}</a>`;
  }).join('');
  const otherLang = lang === 'en' ? 'no' : 'en';
  const toggleAria = lang === 'en' ? 'Bytt til norsk / Switch to Norwegian' : 'Switch to English / Bytt til engelsk';
  const toggle = altHref ? `<a class="lang" href="${altHref}" lang="${otherLang}" hreflang="${otherLang}" aria-label="${toggleAria}">${T[lang].toggle}</a>` : '';
  return `<header class="site-header">
  <a class="brand" href="${link(lang, 'home')}"><img src="${u('/logo.png')}" alt="" width="30" height="30" /><span>Purl</span></a>
  <nav class="site-nav">${nav}</nav>
  ${toggle}
</header>`;
}

function footer(lang) {
  const t = T[lang];
  const cols = t.footerCols.map(([h, keys]) => `<div class="footer-col"><h2>${h}</h2><ul>${
    keys.map((k) => `<li><a href="${link(lang, k)}">${t.footerLabel[k]}</a></li>`).join('')
  }</ul></div>`).join('');
  return `<footer class="site-footer"><div class="footer-inner">
  <div class="footer-cols">${cols}</div>
  <p class="footer-note">${t.footerNote}</p>
</div></footer>`;
}

// path is the site-relative logical path (e.g. '/no/support/'); pageKey names
// the resource for the language toggle (omit for shared/no-toggle pages).
function shell({ lang, pageKey, activeKey, path, title, description, body, wide }) {
  const canonical = abs(path);
  const pageTitle = pageKey === 'home' ? `${SITE.name}, ${title}` : `${title} | ${SITE.name}`;
  const d = escAttr(description);
  // Shared pages (guide/changelog/roadmap) are English only; offer a path to the
  // Norwegian home rather than a same-page counterpart that does not exist.
  const altHref = SHARED.has(pageKey) ? link('no', 'home') : link(lang === 'en' ? 'no' : 'en', pageKey);
  const enPath = path.startsWith('/no/') ? path.slice(3) : path;
  const noPath = '/no' + (enPath === '/' ? '/' : enPath);
  const hreflang = SHARED.has(pageKey)
    ? `<link rel="alternate" hreflang="en" href="${canonical}" />\n<link rel="alternate" hreflang="x-default" href="${canonical}" />`
    : `<link rel="alternate" hreflang="en" href="${abs(enPath)}" />\n<link rel="alternate" hreflang="no" href="${abs(noPath)}" />\n<link rel="alternate" hreflang="x-default" href="${abs(enPath)}" />`;
  const ogLocale = lang === 'no' ? 'nb_NO' : 'en_GB';
  const ogAlt = lang === 'no' ? 'en_GB' : 'nb_NO';
  return `<!doctype html>
<html lang="${T[lang].htmlLang}">
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
const LANDING = {
  en: {
    tagline: 'Knitting &amp; crochet companion',
    lead: 'Purl keeps your projects, yarn stash, patterns and progress in one place: free, offline, and stored on your own device. No account, no sign-up, no ads.',
    desc: 'Purl is a free knitting and crochet companion app. Your projects, yarn stash, patterns and progress in one place, kept on your device.',
    featuresTitle: 'What Purl does',
    features: [
      ['Projects', 'Track every make from planned to finished, with a visual timeline, progress photos and the gauge you actually got.'],
      ['Yarn stash', 'Log your yarn with colour, dye lot and fibre, see your totals, and scan a ball-band barcode to fill in the details.'],
      ['Patterns and PDFs', 'Keep written patterns and PDFs in one library. Open big PDFs offline, draw, highlight, add notes, and follow along with counters and a chart tracker.'],
      ['Handy tools', 'A craft calculator, quick counters, and a knitting and crochet glossary in Norwegian and English.'],
      ['Made to feel right', 'Norwegian and English, light and dark mode, a two-pane layout on iPad, and one-file backup and restore.'],
      ['Private by default', 'Everything lives on your device. No account, no sign-up, no ads, and nothing sold or shared.'],
    ],
    exploreTitle: 'Explore Purl',
    cards: [
      ['guide', 'User guide', 'Learn every part of Purl, in plain language.'],
      ['support', 'Support', 'Get help, get in touch, or support development.'],
      ['feedback', 'Send feedback', 'A short anonymous form for bugs and ideas.'],
      ['roadmap', 'Roadmap', 'What Purl does today and what is coming next.'],
      ['changelog', "What's new", 'Every update, newest first.'],
      ['privacy', 'Privacy policy', 'Your data stays on your device. Here is the detail.'],
      ['terms', 'Terms of use', 'The plain-language terms for using Purl.'],
      ['press', 'Press kit', 'Logo, screenshots, colours and a fact sheet.'],
    ],
  },
  no: {
    tagline: 'Følgesvenn for strikking og hekling',
    lead: 'Purl samler prosjektene dine, garnlageret, oppskriftene og fremgangen på ett sted: gratis, uten nett, og lagret på din egen enhet. Ingen konto, ingen innlogging, ingen reklame.',
    desc: 'Purl er en gratis følgesvenn-app for strikking og hekling. Prosjekter, garnlager, oppskrifter og fremgang på ett sted, lagret på enheten din.',
    featuresTitle: 'Hva Purl gjør',
    features: [
      ['Prosjekter', 'Følg alt du lager, fra planlagt til ferdig, med en visuell tidslinje, fremdriftsbilder og strikkefastheten du faktisk fikk.'],
      ['Garnlager', 'Registrer garnet med farge, fargeparti og fiber, se totalene dine, og skann strekkoden på banderolen for å fylle inn detaljene.'],
      ['Oppskrifter og PDF', 'Ha egne oppskrifter og PDF-er i ett bibliotek. Åpne store PDF-er uten nett, tegn, marker, legg til notater, og følg med ved hjelp av tellere og en diagramsporer.'],
      ['Nyttige verktøy', 'En kalkulator for håndarbeid, raske tellere, og en strikke- og hekleordliste på norsk og engelsk.'],
      ['Laget for å føles riktig', 'Norsk og engelsk, lyst og mørkt tema, tospaltet visning på iPad, og sikkerhetskopiering og gjenoppretting i én fil.'],
      ['Privat som standard', 'Alt ligger på enheten din. Ingen konto, ingen innlogging, ingen reklame, og ingenting selges eller deles.'],
    ],
    exploreTitle: 'Utforsk Purl',
    cards: [
      ['guide', 'Brukerveiledning (engelsk)', 'Lær hver del av Purl, forklart enkelt.'],
      ['support', 'Støtte', 'Få hjelp, ta kontakt, eller støtt utviklingen.'],
      ['feedback', 'Send tilbakemelding', 'Et kort, anonymt skjema for feil og ideer.'],
      ['roadmap', 'Veikart (engelsk)', 'Hva Purl gjør i dag, og hva som kommer.'],
      ['changelog', 'Nyheter (engelsk)', 'Alle oppdateringer, nyeste først.'],
      ['privacy', 'Personvern', 'Dataene dine blir på enheten din. Her er detaljene.'],
      ['terms', 'Vilkår for bruk', 'Vilkårene for å bruke Purl, i klarspråk.'],
      ['press', 'Pressemateriell', 'Logo, skjermbilder, farger og et faktaark.'],
    ],
  },
};
function downloadRow(lang) {
  const s = T[lang].store;
  return `<div class="btn-row">
  <a class="btn btn-primary btn-store" href="${SITE.playUrl}"><span class="store-line"><span class="store-top">${s.get}</span>Google Play</span></a>
  <span class="btn btn-store btn-disabled"><span class="store-line"><span class="store-top">${s.soon}</span>App Store</span></span>
</div>`;
}
function landing(lang) {
  const c = LANDING[lang];
  const cards = c.cards.map(([key, title, sub]) => `  <li><a href="${link(lang, key)}">${title}<span>${sub}</span></a></li>`).join('\n');
  const features = c.features.map(([t, d]) => `  <div class="feature"><h3>${esc(t)}</h3><p>${d}</p></div>`).join('\n');
  const shotCap = lang === 'no' ? 2 : 1;
  const shots = SHOTS.map((row) => `  <figure style="margin:0"><img src="${u('/assets/press/' + row[0])}" alt="Purl: ${escAttr(row[shotCap])}" loading="lazy" /></figure>`).join('\n');
  const body = `<section class="hero">
  <img src="${u('/logo.png')}" alt="Purl logo" width="84" height="84" />
  <h1>Purl</h1>
  <p class="tagline">${c.tagline}</p>
</section>
<p class="lead">${c.lead}</p>
${downloadRow(lang)}

<h2 class="section-title">${c.featuresTitle}</h2>
<div class="features">
${features}
</div>

<div class="shots">
${shots}
</div>

<h2 class="section-title">${c.exploreTitle}</h2>
<ul class="cards">
${cards}
</ul>`;
  return shell({ lang, pageKey: 'home', path: link(lang, 'home').slice(BASE.length), title: c.tagline.replace('&amp;', '&'), description: c.desc, body });
}

// --- support -------------------------------------------------------------
const SUPPORT = {
  en: {
    desc: 'Get help with Purl, read the guide and FAQ, send anonymous feedback, or get in touch.',
    h1: 'Support',
    intro: 'Need a hand with Purl, or want to get in touch? Everything is on this page.',
    getApp: 'Get the app',
    learn: 'Learn how it works',
    learnBody: `The <a href="${link('en', 'guide')}">user guide</a> covers every part of Purl in plain language, from your first project to the PDF pattern tools. The <a href="${u('/guide/faq.html')}">FAQ</a> answers the common questions and the things that look like bugs but are not.`,
    fb: 'Send feedback',
    fbBody: `Found a bug or have an idea? Inside the app, the Send feedback button fills in your note and the app version for you. You can also open the <a href="${link('en', 'feedback')}">anonymous feedback form</a> here in your browser. It never asks for your name or email.`,
    contact: 'Contact',
    contactBody: `For anything else, email <a href="mailto:${SITE.email}">${SITE.email}</a>.`,
    dev: 'Support development',
    devBody: 'Purl is free and stays free, with every feature unlocked for everyone. If it has helped you, there is an optional tip on the Support Purl screen inside the app. A tip unlocks nothing; it is just a thank-you that helps development continue. You can also share Purl with a knitting or crochet friend from the same screen.',
  },
  no: {
    desc: 'Få hjelp med Purl, les veiledningen og FAQ, send anonym tilbakemelding, eller ta kontakt.',
    h1: 'Støtte',
    intro: 'Trenger du hjelp med Purl, eller vil du ta kontakt? Alt finner du på denne siden.',
    getApp: 'Last ned appen',
    learn: 'Lær hvordan det fungerer',
    learnBody: `<a href="${link('no', 'guide')}">Brukerveiledningen</a> (foreløpig på engelsk) dekker hver del av Purl i klarspråk, fra det første prosjektet til PDF-verktøyene. <a href="${u('/guide/faq.html')}">FAQ-en</a> (foreløpig på engelsk) svarer på de vanligste spørsmålene og på det som ser ut som feil, men ikke er det.`,
    fb: 'Send tilbakemelding',
    fbBody: `Fant du en feil eller har du en idé? Inne i appen fyller Send tilbakemelding-knappen inn notatet ditt og appversjonen for deg. Du kan også åpne det <a href="${link('no', 'feedback')}">anonyme tilbakemeldingsskjemaet</a> her i nettleseren. Det spør aldri om navn eller e-post.`,
    contact: 'Kontakt',
    contactBody: `For alt annet, send e-post til <a href="mailto:${SITE.email}">${SITE.email}</a>.`,
    dev: 'Støtt utviklingen',
    devBody: 'Purl er gratis og forblir gratis, med alle funksjoner åpne for alle. Har appen hjulpet deg, kan du gi en valgfri liten takk på Støtt Purl-skjermen inne i appen. En takk låser ikke opp noe; den bare hjelper utviklingen videre. Fra samme skjerm kan du også dele Purl med en strikke- eller heklevenn.',
  },
};
function support(lang) {
  const s = SUPPORT[lang];
  const body = `<article class="prose">
  <h1>${s.h1}</h1>
  <p>${s.intro}</p>
</article>

<h2 class="section-title">${s.getApp}</h2>
${downloadRow(lang)}

<h2 class="section-title">${s.learn}</h2>
<article class="prose"><p>${s.learnBody}</p></article>

<h2 class="section-title">${s.fb}</h2>
<article class="prose"><p>${s.fbBody}</p></article>

<h2 class="section-title">${s.contact}</h2>
<article class="prose"><p>${s.contactBody}</p></article>

<h2 class="section-title">${s.dev}</h2>
<article class="prose"><p>${s.devBody}</p></article>`;
  return shell({ lang, pageKey: 'support', path: link(lang, 'support').slice(BASE.length), title: s.h1, description: s.desc, body });
}

// --- feedback redirect ---------------------------------------------------
const FEEDBACK = {
  en: {
    title: 'Send feedback', h1: 'Opening the feedback form',
    p1: `Taking you to Purl's anonymous feedback form. If it does not open on its own, <a href="${SITE.feedbackForm}">open the form here</a>.`,
    p2: `The form is a Google Form. It never asks for your name or email. You can also go back to the <a href="${link('en', 'support')}">support page</a> or the <a href="${link('en', 'home')}">home page</a>.`,
  },
  no: {
    title: 'Send tilbakemelding', h1: 'Åpner tilbakemeldingsskjemaet',
    p1: `Tar deg til Purls anonyme tilbakemeldingsskjema. Hvis det ikke åpner seg selv, <a href="${SITE.feedbackForm}">åpne skjemaet her</a>.`,
    p2: `Skjemaet er et Google-skjema. Det spør aldri om navn eller e-post. Du kan også gå tilbake til <a href="${link('no', 'support')}">støttesiden</a> eller <a href="${link('no', 'home')}">hjem</a>.`,
  },
};
function feedbackRedirect(lang) {
  const f = FEEDBACK[lang];
  return `<!doctype html>
<html lang="${T[lang].htmlLang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${f.title} | Purl</title>
<meta name="robots" content="noindex" />
<meta http-equiv="refresh" content="0; url=${SITE.feedbackForm}" />
<link rel="icon" href="${u('/assets/favicon.svg')}" type="image/svg+xml" />
<link rel="stylesheet" href="${u('/assets/styles.css')}" />
</head>
<body>
${header(lang, null, link(lang === 'en' ? 'no' : 'en', 'feedback'))}
<main class="wrap">
  <article class="prose">
    <h1>${f.h1}</h1>
    <p>${f.p1}</p>
    <p>${f.p2}</p>
  </article>
</main>
${footer(lang)}
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
const PRESS = {
  en: {
    desc: 'Press kit for Purl: logo, screenshots, brand colours and a fact sheet.',
    h1: 'Press kit',
    about1: "Purl is a calm, private companion for knitters and crocheters. Projects, yarn stash, patterns and progress live in one place, free, offline, and stored on the user's own device, with no account and no ads. Purl speaks Norwegian and English, and is built to feel right on iPad as well as phones.",
    about2: "You are welcome to use the material below when writing about Purl. Please keep the logo's colours and proportions as they are.",
    fact: 'Fact sheet', logo: 'Logo', colours: 'Brand colours', shots: 'Screenshots',
    facts: [
      ['Name', 'Purl'],
      ['What it is', 'A knitting and crochet companion app'],
      ['Price', 'Free, with an optional in-app tip. Nothing is locked.'],
      ['Platforms', 'Android (Google Play). iPhone and iPad coming.'],
      ['Languages', 'Norwegian, English'],
      ['Privacy', 'Data stays on the device. No accounts, no tracking, nothing sold or shared.'],
    ],
    websiteLabel: 'Website', contactLabel: 'Contact',
    logoBody: `<a href="${u('/logo.png')}">Download the logo (PNG)</a>. The mark is a single plum line on a transparent background.`,
    swatchNames: ['Plum', 'Plum dark', 'Cream', 'Ink'],
  },
  no: {
    desc: 'Pressemateriell for Purl: logo, skjermbilder, merkefarger og et faktaark.',
    h1: 'Pressemateriell',
    about1: 'Purl er en rolig, privat følgesvenn for alle som strikker og hekler. Prosjekter, garnlager, oppskrifter og fremgang samles på ett sted: gratis, uten nett, og lagret på brukerens egen enhet, uten konto og uten reklame. Purl snakker norsk og engelsk, og er laget for å føles riktig både på iPad og telefon.',
    about2: 'Du står fritt til å bruke materialet nedenfor når du skriver om Purl. Behold logoens farger og proporsjoner som de er.',
    fact: 'Faktaark', logo: 'Logo', colours: 'Merkefarger', shots: 'Skjermbilder',
    facts: [
      ['Navn', 'Purl'],
      ['Hva det er', 'En følgesvenn-app for strikking og hekling'],
      ['Pris', 'Gratis, med en valgfri takk i appen. Ingenting er låst.'],
      ['Plattformer', 'Android (Google Play). iPhone og iPad kommer.'],
      ['Språk', 'Norsk, engelsk'],
      ['Personvern', 'Dataene blir på enheten. Ingen konto, ingen sporing, ingenting selges eller deles.'],
    ],
    websiteLabel: 'Nettsted', contactLabel: 'Kontakt',
    logoBody: `<a href="${u('/logo.png')}">Last ned logoen (PNG)</a>. Merket er en enkelt plommefarget strek på gjennomsiktig bakgrunn.`,
    swatchNames: ['Plomme', 'Mørk plomme', 'Krem', 'Blekk'],
  },
};
function press(lang) {
  const p = PRESS[lang];
  const shotCap = lang === 'no' ? 2 : 1; // index into SHOTS tuple for the caption
  const hexes = [COLORS.primary, COLORS.primaryDark, COLORS.bg, COLORS.text];
  const swatches = p.swatchNames.map((name, i) => `    <div class="swatch"><div class="chip" style="background:${hexes[i]}"></div><div class="meta"><b>${name}</b><span>${hexes[i]}</span></div></div>`).join('\n');
  const shots = SHOTS.map((row) => `    <figure style="margin:0"><img src="${u('/assets/press/' + row[0])}" alt="Purl: ${escAttr(row[shotCap])}" loading="lazy" /></figure>`).join('\n');
  const factRows = p.facts.map(([k, v]) => `  <tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('\n');
  const body = `<article class="prose">
  <h1>${p.h1}</h1>
  <p>${p.about1}</p>
  <p>${p.about2}</p>
</article>

<h2 class="section-title">${p.fact}</h2>
<table class="facts">
${factRows}
  <tr><th>${p.websiteLabel}</th><td><a href="${link('en', 'home')}">jadedoyle.github.io/purl-site</a></td></tr>
  <tr><th>${p.contactLabel}</th><td><a href="mailto:${SITE.email}">${SITE.email}</a></td></tr>
</table>

<h2 class="section-title">${p.logo}</h2>
<article class="prose"><p>${p.logoBody}</p></article>

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

// --- user guide (English) ------------------------------------------------
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
    return `](${u('/guide/' + slug + '.html' + hash)})`;
  });
}
function guideNav(currentSlug) {
  const items = GUIDE_PAGES.map(([base, title]) => {
    const slug = base === 'README' ? 'index' : base;
    const cur = slug === currentSlug ? ' aria-current="page"' : '';
    return `<li><a href="${u('/guide/' + slug + '.html')}"${cur}>${title}</a></li>`;
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
      lang: 'en',
      pageKey: 'guide',
      activeKey: 'guide',
      path: isIndex ? SLUGS.guide : `/guide/${slug}.html`,
      title: isIndex ? 'User guide' : title,
      description: isIndex
        ? 'How to use Purl, in plain language: projects, patterns, yarn stash, the PDF tools and more.'
        : `${title}: part of the Purl user guide.`,
      body: `<article class="prose">${bodyHtml}</article>\n${guideNav(slug)}`,
    });
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
  let stitches = '';
  for (let x = 90; x < 1120; x += 46) stitches += `<path d="M${x} 560 l23 -26 l23 26" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${COLORS.bg}"/>
  <g fill="none" stroke="${COLORS.primary}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.22">${stitches}</g>
  <image href="${logoDataUri()}" x="110" y="150" width="250" height="250"/>
  <text x="398" y="285" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="118" fill="${COLORS.primaryDark}">Purl</text>
  <text x="404" y="345" font-family="Arial, Helvetica, sans-serif" font-size="37" fill="${COLORS.muted}">Knitting &amp; crochet companion</text>
  <text x="404" y="410" font-family="Arial, Helvetica, sans-serif" font-size="29" fill="${COLORS.primary}">Free, private, and on your device</text>
  <text x="404" y="455" font-family="Arial, Helvetica, sans-serif" font-size="25" fill="${COLORS.muted}">jadedoyle.github.io/purl-site</text>
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
function robotsAndSitemap(paths) {
  const urls = paths.map((p) => `  <url><loc>${abs(p)}</loc></url>`).join('\n');
  writeFileSync(join(HERE, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, 'utf8');
  writeFileSync(join(HERE, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${abs('/sitemap.xml')}\n`, 'utf8');
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
  const guideCount = buildGuide();

  // sitemap + robots (English pages, Norwegian pages, guide pages)
  const guidePaths = GUIDE_PAGES.filter(([, , isIndex]) => !isIndex).map(([base]) => `/guide/${base}.html`);
  robotsAndSitemap([
    '/', '/support/', '/privacy/', '/terms/', '/press/', '/changelog/', '/roadmap/', '/guide/', ...guidePaths,
    '/no/', '/no/support/', '/no/privacy/', '/no/terms/', '/no/press/',
  ]);
  await buildIcons();
  console.log(`Built bilingual site (en + no) + ${guideCount} guide pages, icons, sitemap.`);
}

main();
