# purl-site

The public website for **Purl**, a knitting and crochet companion app. Served
by GitHub Pages at **https://purl-app.github.io/** (root-served, no path).

Everything public lives here and links to everything else: a landing page, the
user guide, support, privacy, terms, changelog, roadmap, a press kit, and a
feedback redirect. Only the feedback form itself lives off-site (it is a Google
Form, by design anonymous).

## How it is built

One generator, `build-site.mjs`, produces every page from a single shared shell
(header nav + full-sitemap footer + favicon + Open Graph card), so nothing
drifts:

| Page | URL | Source |
| --- | --- | --- |
| Landing | `/` | `build-site.mjs` |
| User guide | `/guide/` | `../Purl/user-guide/*.md` |
| Support | `/support/` | `build-site.mjs` |
| Privacy policy | `/privacy/` | `../Purl/docs/legal/privacy-policy.md` |
| Terms of use | `/terms/` | `../Purl/docs/legal/terms.md` |
| What's new (changelog) | `/changelog/` | app data: `ChangelogScreen.tsx` `RELEASES` |
| Roadmap | `/roadmap/` | app data: `RoadmapScreen.tsx` `DONE`/`NEXT`/`LATER` |
| Press kit | `/press/` | `build-site.mjs` + `../Purl/docs/release/screenshots` |
| Send feedback | `/feedback/` | redirect to the Google Form |

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

Style rules, matching the app: no em dashes and no emojis anywhere in the output.

## Hosting: the purl-app org

The site is served from the `purl-app` GitHub org so public links carry no
personal handle. To stand it up (a one-time move the maintainer performs):

1. Create a free GitHub organisation named **`purl-app`**
   (github.com/organizations/new).
2. Transfer this repo into the org (repo Settings, Transfer ownership) to keep
   its history, or push it up fresh.
3. Rename the repo to **`purl-app.github.io`** so Pages serves it at the root
   (repo Settings, rename).
4. Repo Settings, Pages: deploy from branch `main`, folder `/` (root).
5. Confirm https://purl-app.github.io/ loads.

Then, around the same time:

- Publish an app OTA so installed builds pick up the new guide URL
  (`GUIDE_URL` in `../Purl/src/screens/MoreScreen.tsx` already points at
  `https://purl-app.github.io/guide/`). The old
  `jadedoyle.github.io/purl-site/` Pages URL stops resolving once the repo is
  transferred, so installs on the old URL need the OTA.
- Update the **privacy policy URL** in the Google Play Console to
  `https://purl-app.github.io/privacy/`.
