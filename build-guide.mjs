// Build the public Purl user guide (purl-site/guide/) from the markdown in the
// sibling Purl repo (../Purl/user-guide). English only for now. Run with
// `npm run build:guide`. The generated HTML is committed; node_modules is not.
//
// Style rule: no em dashes in output. The source markdown is already
// em-dash-free; this generator does not introduce any.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'Purl', 'user-guide');
const OUT = join(HERE, 'guide');

// Markdown basename -> browser title. README becomes the guide index.
// Order controls the "All pages" list at the foot of each page.
const PAGES = [
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

const CSS = `
  :root{--bg:#FBF8F5;--surface:#FFFFFF;--primary:#7C5E9B;--primary-dark:#5E4478;--text:#2C2630;--muted:#6f6676;--border:#ECE6E1;}
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;background:var(--bg);color:var(--text);line-height:1.6;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  .wrap{max-width:720px;margin:0 auto;padding:28px 22px 72px}
  .top{display:flex;align-items:center;gap:11px;text-decoration:none;margin-bottom:26px}
  .top img{width:34px;height:34px;object-fit:contain;flex:none}
  .top .name{font-weight:700;font-size:15px;color:var(--muted);letter-spacing:.02em}
  .content h1{font-size:29px;line-height:1.2;margin:10px 0 14px}
  .content h2{font-size:20px;margin:30px 0 8px;color:var(--primary-dark)}
  .content h3{font-size:16px;margin:22px 0 6px;color:var(--primary-dark)}
  .content p{margin:0 0 14px}
  .content ul,.content ol{margin:0 0 14px;padding-left:22px}
  .content li{margin:0 0 7px}
  .content a{color:var(--primary)}
  .content code{background:var(--surface);border:1px solid var(--border);border-radius:5px;padding:1px 5px;font-size:.92em}
  .content hr{border:none;border-top:1px solid var(--border);margin:28px 0}
  .content blockquote{margin:0 0 14px;padding:2px 16px;border-left:3px solid var(--border);color:var(--muted)}
  .content strong{color:var(--text)}
  .pages{margin-top:44px;padding-top:18px;border-top:1px solid var(--border)}
  .pages h2{font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
  .pages ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
  .pages a{display:inline-block;background:var(--surface);border:1px solid var(--border);border-radius:999px;
    padding:6px 13px;color:var(--primary);text-decoration:none;font-size:14px;font-weight:600}
  .pages a:hover{border-color:var(--primary)}
  .pages a[aria-current=page]{background:var(--primary);color:#fff;border-color:var(--primary)}
  footer{margin-top:34px;color:var(--muted);font-size:13px}
`;

// Rewrite internal markdown links to the generated HTML pages.
// ./name.md (and name.md) -> name.html; README -> index.
function rewriteLinks(md) {
  return md.replace(/\]\(\.?\/?([A-Za-z0-9_-]+)\.md(#[^)]*)?\)/g, (_, name, hash = '') => {
    const slug = name === 'README' ? 'index' : name;
    return `](${slug}.html${hash})`;
  });
}

function pageNav(currentSlug) {
  const items = PAGES.map(([base, title]) => {
    const slug = base === 'README' ? 'index' : base;
    const cur = slug === currentSlug ? ' aria-current="page"' : '';
    return `<li><a href="${slug}.html"${cur}>${title}</a></li>`;
  }).join('');
  return `<nav class="pages"><h2>All pages</h2><ul>${items}</ul></nav>`;
}

function shell(browserTitle, currentSlug, bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${browserTitle}</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<a class="top" href="index.html"><img src="../logo.png" alt="Purl logo" /><span class="name">PURL GUIDE</span></a>
<div class="content">
${bodyHtml}
</div>
${pageNav(currentSlug)}
<footer>Part of Purl, a knitting and crochet companion. <a href="../">purl-site home</a></footer>
</div>
</body>
</html>
`;
}

function build() {
  if (!existsSync(SRC)) {
    console.error(`Source not found: ${SRC}. Run from purl-site with the Purl repo as a sibling.`);
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  let count = 0;
  for (const [base, title, isIndex] of PAGES) {
    const srcFile = join(SRC, `${base}.md`);
    if (!existsSync(srcFile)) {
      console.warn(`skip (missing): ${base}.md`);
      continue;
    }
    const md = rewriteLinks(readFileSync(srcFile, 'utf8'));
    const body = marked.parse(md);
    const slug = isIndex ? 'index' : base;
    const browserTitle = isIndex ? 'Purl user guide' : `${title} | Purl guide`;
    const html = shell(browserTitle, slug, body);
    writeFileSync(join(OUT, `${slug}.html`), html, 'utf8');
    count++;
  }
  console.log(`Built ${count} guide pages into ${OUT}`);
}

build();
