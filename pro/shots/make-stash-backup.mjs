// The demo backup for the Pro page's phone shot, with invented yarns.
//
// Reads the app repo's store demo backup (docs/release/demo-data.purl) and
// renames every yarn's brand and name, so the stash on the page shows no real
// brand (ruled 2026-10-16). Ids, colours, amounts and gauges stay, so the
// projects that point at the yarns still find them.
//
// Usage: node pro/shots/make-stash-backup.mjs <demo-data.purl> <out.purl>
// Import the result on a cleared install (the importer skips ids it already
// has, so it cannot rename yarns that are there).

import { readFileSync, writeFileSync } from 'node:fs';

const RENAME = {
  'y-puno': ['Morilden Ull', 'Glød Gradient'],
  'y-mohair': ['Lyngmo Garn', 'Tåke Silk Mohair'],
  'y-finull': ['Kvistvik Spinneri', 'Tunull'],
  'y-blane': ['Heibakk Ull', 'Skavl'],
  'y-merino': ['Ospelund Fibre', 'Lett Merino'],
  'y-merinoef': ['Vardeholm Garn', 'Smørblomst DK'],
  'y-line': ['Morilden Ull', 'Sommerlin'],
  'y-alpakka': ['Lyngmo Garn', 'Mjuk Alpakka'],
};

const [src, out] = process.argv.slice(2);
const backup = JSON.parse(readFileSync(src, 'utf8'));
const yarns = JSON.parse(backup.data['purl:stash']);
for (const y of yarns) {
  const r = RENAME[y.id];
  if (!r) throw new Error('no invented name for ' + y.id);
  [y.brand, y.name] = r;
}
backup.data['purl:stash'] = JSON.stringify(yarns);
writeFileSync(out, JSON.stringify(backup));
console.log('wrote', out, yarns.map((y) => y.brand + ' / ' + y.name).join('; '));
