# The Purl Professional page

On purl.no since the push of this branch, unlisted (the maintainer,
2026-10-20): `/professional/` and `/no/professional/`, each with a file
types page under it (`file-types/`). Public by address only. The pages carry
`noindex, nofollow`, stay out of the sitemap, and no other page on purl.no
links to them; robots.txt does not name the path, since a Disallow line would
advertise it and stop a crawler from reading the noindex. The announcement,
with the home page's half of the switch, waits on the bar in the app repo's
`docs/features/professional-page.md`.

## Build and look

The site's own build makes the pages, with purl.no's header, footer and
theme scripts, like every other page:

    npm run build                            # writes professional/ and assets/pro/ too
    python -m http.server 8765 --bind 127.0.0.1   (from the repo root)
    python pro/shots/devices.py              # the three hero devices
    sh pro/capture-heroes.sh <out>           # the hero still
    sh pro/shot-page.sh "professional/?theme=light" <out> pro

- The Professional section of `build-site.mjs` (`professional()`,
  `professionalFiles()`, `proTopBar()`, `copyProAssets()`) writes the four
  pages and copies `web/*`, `files/read_purl.py` and the shots the page
  names into `assets/pro/`.
- The words live in the app repo's `docs/site/copy.json`, under `en.pro`,
  `no.pro` and `fileTypes` in both languages, edited in the online editor's
  Website copy tab. The Norwegian is first-pass, for the tester.
- `files/file-types.htm`: the file types page body, English only; the
  Norwegian page sets it in `lang="en"` under its Norwegian title and lead.
  Not `.html`, so the build's stale-page check does not take it for a page.
- `web/`: the page's CSS and scripts. `switch.css` holds only the Purl and
  Professional switch and the flip, so the home page can load it when it
  gets its half of the switch.
- `shots/frames.py`: the iPad Air feature frames (yarn view, blueprints,
  mitten), from raws taken at 2360 x 1600, density 320.
- `files/`: the file types page body and `read_purl.py`, a reader for
  `.purl` backups checked against the app's data-safety corpus.
- `shots/`: `raw/` holds emulator captures (`raw/MANIFEST.txt` says how
  each was taken). `dress.py` and `shots.json` turn the feature shots into
  framed shots in `out/`. The PNGs there are the masters; `webp.py` writes
  the WebP beside each, and the page serves only those (a sixth of the
  bytes). The build stops on a WebP missing, and on one older than its PNG
  outside CI, so run `python pro/shots/webp.py` after any of the shot
  scripts.

Until 2026-10-20 the page was built by `pro/build-pro.mjs` into a gitignored
`_preview/`, served at https://editor.hbc3.no/preview/pro/ with a copy of
the home page carrying the other half of the switch. Git history keeps it.

## The hero

Flat 2D, ruled 2026-10-16. The Mac and the iPad are each one picture from
`shots/devices.py`, drawn at the real proportions of a MacBook Air 13-inch
and an iPad Air 11-inch, from emulator captures taken at those devices'
pixels and point scale. The phone is the home page's own first phone, its
Stash shot in its `.phoneframe`, in the page's language.

## Try it in your browser

The four maker buttons under the hero point at the web demo,
`/professional/demo/<garment|colour|knit|crochet>/` on this site (the app
repo's docs/features/web-demo.md, r0.7, 2026-10-23), in the same tab: the
demo has no page of its own, and its Back and its folder's own page go to
the page's `#try`. `DEMO_PATH` in `build-site.mjs` names the folder. The
demo's files are the app's web build, put there and committed by the app
repo's `npm run demo:publish`; this site's build never writes them. Both
Professional pages, English and Norwegian, open the same demo.

## Coming soon (2026-10-18)

`PRO_COMING_SOON` in `build-site.mjs`: a plum pill above the title, the
not-on-sale note under the lead, no Ready badges. Every built feature shows,
the ones the demo does not reach included, and the On the way cards follow.
The switch reads Purl and Professional, spelled out at every width. The top
bar stays one row down to 355 px: on phones the switch and links are a size
smaller and, below 400 px, the logo steps aside (`pro/web/switch.css`).

## A fast switch (2026-10-18)

`web/switch.js` fetches the other half's page and first pictures once the
page has loaded and the browser is idle. The URLs sit on the off half of
the switch in `data-prefetch` ("a|b" is the light and dark picture). It
fetches nothing when the visitor saves data or is on 2G. purl.no (GitHub
Pages) sends `max-age=600` for pages and assets. The shots are WebP.

## A flip without a snap (2026-10-18)

A flip moves the home page's first phone into the small phone in the hero
in 0.75 s (the maintainer's choice over 0.5 s) and cross-fades the rest in
0.35 s, by a cross-document view transition (`switch.css`; Chrome and Edge
126, Safari 18.2, not Firefox, which gets a fade). The switch's filled part
slides with the phone; the Mac and iPad fade in over the end of the move.
`switch.js` goes inline into the head, because its `pagereveal` listener
must exist before the first frame: it keeps the phone out of the move when
it is off the screen or the visitor asked for less motion, fades pictures
that arrive late, and skips the flip on a move to a page without the switch
(the pill's `data-flip`, `FLIP_PAGES` in `build-site.mjs`), since that page
would report the aborted flip as an error. `--purl-vt-slow` on the root
stretches the timings for a slowed-down check.

Until the home page gets its half of the switch, it does not opt in, so the
Purl half opens it as a plain page change, and its top bar is shorter than
the Professional pages': 6 px from 641 px up (the pill is taller than the
moon), one row against two on phones.

## One top bar, and a moon for dark (2026-10-18)

The Professional pages draw purl.no's own header (`header()` in
`build-site.mjs`), with the switch after the logo and Home left out, since
the logo and the Purl half lead home. Privacy lives in the footer, which is
purl.no's own. Light by default, a crescent moon for dark, no Auto, from
purl.no's styles.css and theme scripts.
