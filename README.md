# purl-site

The public website for **Purl**, a knitting and crochet companion app. Served by
GitHub Pages at **https://jadedoyle.github.io/purl-site/**.

Everything public lives here and links to everything else: a landing page, the
user guide, support, privacy, terms, changelog, roadmap, a press kit, and a
feedback redirect. The site is bilingual: English at the root, Norwegian under
`/no/`. Only the feedback form itself lives off-site (it is a Google Form, by
design anonymous).

## How it is built

One generator, `build-site.mjs`, produces every page from a single shared shell
(header nav + language toggle + full-sitemap footer + favicon + Open Graph
card), so nothing drifts:

| Page | English | Norwegian | Source |
| --- | --- | --- | --- |
| Landing | `/` | `/no/` | `build-site.mjs` |
| User guide | `/guide/` | (English) | `../Purl/user-guide/*.md` |
| Support | `/support/` | `/no/support/` | `build-site.mjs` |
| Privacy | `/privacy/` | `/no/privacy/` | `../Purl/docs/legal/privacy-policy(.no).md` |
| Terms | `/terms/` | `/no/terms/` | `../Purl/docs/legal/terms(.no).md` |
| What's new | `/changelog/` | (English) | app data: `ChangelogScreen.tsx` `RELEASES` |
| Roadmap | `/roadmap/` | (English) | app data: `RoadmapScreen.tsx` `DONE`/`NEXT`/`LATER` |
| Press kit | `/press/` | `/no/press/` | `build-site.mjs` + `../Purl/docs/release/screenshots` |
| Send feedback | `/feedback/` | `/no/feedback/` | redirect to the Google Form |

The guide, changelog and roadmap are English only, matching the app (the app's
changelog and roadmap data are English strings, and the written guide is English
for now with a Norwegian version queued). Both languages link to those shared
pages.

The changelog and roadmap are read straight out of the app's own source, so the
website is always in step with the app with no copy to keep in sync. The favicon
and the 1200x630 Open Graph image are rasterised from `logo.png` at build time.

The **Purl app repo must be a sibling** of this one (`../Purl`), since the guide,
legal text, changelog and roadmap all come from there.

### Build

```
npm ci
npm run build
```

Generated HTML and images are committed; `node_modules` is not. Re-run
`npm run build` and commit whenever any source changes (guide, legal text, or a
new app release), then push so GitHub Pages redeploys.

Style rules, matching the app: no em dashes and no emojis in any output. The
Norwegian legal text (`*.no.md`) is a first pass, pending a review by Helene.

## The base URL is one knob

The site currently lives under a `/purl-site/` subpath. Everything is generated
relative to two constants at the top of `build-site.mjs`:

```
const ORIGIN = 'https://jadedoyle.github.io';
const BASE   = '/purl-site';   // set to '' when root-served under an org
```

If the site later moves to its own `purl-app` GitHub org (a repo named
`purl-app.github.io`, served at the root), the move is: create the org, transfer
this repo in, rename it to `purl-app.github.io`, point Pages at `main`/root, then
set `ORIGIN = 'https://purl-app.github.io'` and `BASE = ''`, rebuild, and commit.
Also update, at that point: the app's `GUIDE_URL` in
`../Purl/src/screens/MoreScreen.tsx`, the URLs in
`../Purl/docs/release/play-store-listing.md`, the maintainer-note and cross-link
URLs in the four legal Markdown files, and the Play Console privacy URL. The old
`jadedoyle.github.io/purl-site/` Pages URL stops resolving on transfer, so ship
an app OTA carrying the new guide URL around the same time.
