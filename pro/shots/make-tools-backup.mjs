// The data for the Pro page's tool shots of 2026-10-25, written by code:
// written rows, Chart check, sizes, versions and the amigurumi maker.
//
// - "Horseshoe lace", 21 x 16, worked flat: the classic 10-stitch horseshoe,
//   twice, plus 1, so Write out finds the repeat. Characters from
//   SYMBOL_CHAR in the app's utils/knitSymbols.ts: '.' knit, 'o' yo,
//   's' sk2p. Wrong-side rows are all '.', purled.
// - "Horseshoe scarf", the same chart with one slip: row 11 knits where it
//   should make a yarn over, so it works 22 stitches over row 10's 21 and
//   Chart check marks it red.
// - "Horseshoe hem", 51 x 8, one band of the same lace five times, for the
//   pattern draft's size marks: S 21 stitches, M 31, L 41 and XL all 51.
//   Each size's cut holds whole repeats and the knit stitch that starts the
//   next, so its rows balance (a cut through a repeat fails Chart check).
// - "Horseshoe pullover", a pattern creator draft in four sizes whose facts
//   and text carry size tokens, the hem chart with its size marks, and the
//   rows written from it.
// - "Bear", the amigurumi toy of the app repo's assembly study
//   (docs/research/2026-10-25-amigurumi-assembly/bear.json), its parts and
//   joins as there, without the tail the study leaves unplaced. The study
//   names each part's shape and size; the app's own newPart draws its
//   outline, as the app repo's gate AMS does.
//
// It writes a .purl backup (archive v3, utils/backupArchive.ts). Import it
// through More, Export & import; every record has its own id, so it adds
// beside what an install has. The garment of the drape shot comes from
// make-garment-backup.mjs.
//
// Usage: node pro/shots/make-tools-backup.mjs <out.purl>
// PURL_REPO points at the app repo (default ../Purl beside this repo).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PURL = resolve(process.env.PURL_REPO || join(HERE, '..', '..', '..', 'Purl'));
const { compileUtils, tempOut } = await import(pathToFileURL(join(PURL, 'tools', 'garment-lib', 'compile.mjs')).href);
const lib = compileUtils(['amigurumi.ts', 'amigurumiToy.ts', 'patternDraftRules.ts'], { repo: PURL, root: PURL, out: tempOut('purl-pro-tools'), check: false });
// These modules import ../types, so tsc lands them in a utils/ folder.
const ami = await lib.load('utils/amigurumi.ts');
const toys = await lib.load('utils/amigurumiToy.ts');
const rules = await lib.load('utils/patternDraftRules.ts');
const NOW = Date.UTC(2026, 9, 25, 20, 0, 0);

// The horseshoe's right-side rows, read from the right edge: a stitch
// before the repeat, then the 10-stitch repeat.
const RS = [
  ['k', 'yo', 'k', 'k', 'k', 'sk2p', 'k', 'k', 'k', 'yo'],
  ['k', 'k', 'yo', 'k', 'k', 'sk2p', 'k', 'k', 'yo', 'k'],
  ['k', 'k', 'k', 'yo', 'k', 'sk2p', 'k', 'yo', 'k', 'k'],
  ['k', 'k', 'k', 'k', 'yo', 'sk2p', 'yo', 'k', 'k', 'k'],
];
const CHAR = { k: '.', yo: 'o', sk2p: 's' };

/** One row as the chart stores it, from the left (the highest column) to
 *  column 1 on the right. */
function rowCells(rs, repeats) {
  const right = ['k'];
  for (let i = 0; i < repeats; i++) right.push(...rs);
  return right.reverse().map((s) => CHAR[s]).join('');
}

/** cells is row-major from the BOTTOM row (row 1 first). */
function horseshoe(bands, repeats) {
  const cols = 1 + 10 * repeats;
  const rows = [];
  for (let b = 0; b < bands; b++) {
    for (const rs of RS) {
      rows.push(rowCells(rs, repeats));
      rows.push('.'.repeat(cols));
    }
  }
  return { cols, rows };
}

function chart(id, name, { cols, rows }) {
  return { id, name, v: 1, cols, rows: rows.length, cells: rows.join(''), flat: true, noStitchLook: 'cross', createdAt: NOW, updatedAt: NOW };
}

const lace = chart('pro-horseshoe-lace', 'Horseshoe lace', horseshoe(2, 2));

const slip = horseshoe(2, 2);
// Row 11 is the second band's row 3: its first yarn over from the right
// (column 4) becomes a knit.
const r11 = slip.rows[10].split('');
const col4 = r11.length - 4;
if (r11[col4] !== 'o') throw new Error('row 11 column 4 is not a yarn over');
r11[col4] = '.';
slip.rows[10] = r11.join('');
const scarf = chart('pro-horseshoe-scarf', 'Horseshoe scarf', slip);

const hemShape = horseshoe(1, 5);
const hem = chart('pro-horseshoe-hem', 'Horseshoe hem', hemShape);

for (const c of [lace, scarf, hem]) {
  if (c.cells.length !== c.cols * c.rows) throw new Error(c.name + ' has ' + c.cells.length + ' cells');
}

// The pattern creator draft. Size tokens: {S|M|L|XL}.
const hemRef = { kind: 'knit', id: hem.id, name: hem.name };
const draft = {
  id: 'pro-pullover',
  v: 1,
  name: 'Horseshoe pullover',
  page: 'a4',
  sizes: ['S', 'M', 'L', 'XL'],
  terms: 'us',
  gallery: [],
  createdAt: NOW,
  updatedAt: NOW,
  blocks: [
    { id: 'b-title', kind: 'heading', level: 1, text: 'Horseshoe pullover' },
    { id: 'b-facts', kind: 'facts', rows: [
      { label: 'Sizes', text: 'S (M) L (XL)' },
      { label: 'Chest', text: '{96|104|112|120} cm' },
      { label: 'Yarn', text: '{5|6|6|7} skeins of fingering wool, 200 m each' },
      { label: 'Needles', text: '3.5 mm circular, 80 cm' },
      { label: 'Gauge', text: '24 sts and 32 rnds to 10 cm in stockinette' },
    ] },
    { id: 'b-hem-h', kind: 'heading', level: 2, text: 'Lace panel' },
    { id: 'b-hem-t', kind: 'text', text: 'The front has a lace panel up the middle. Cast on {21|31|41|51} sts for it and work the chart for your size.' },
    { id: 'b-hem-c', kind: 'chart', chart: hemRef, width: 1, key: true, caption: 'Horseshoe lace, every size', sizeMarks: [
      { size: 'S', from: 12, to: 32 },
      { size: 'M', from: 12, to: 42 },
      { size: 'L', from: 2, to: 42 },
      { size: 'XL', from: 1, to: 51 },
    ] },
    { id: 'b-hem-r', kind: 'rows', from: hemRef, rows: [] },
    { id: 'b-body-h', kind: 'heading', level: 2, text: 'Body' },
    { id: 'b-body-t', kind: 'text', text: 'Knit the panel until the front measures {38|40|41|42} cm from the cast-on edge.' },
  ],
};

const readBack = rules.readDraft(draft);
if (!readBack || readBack.blocks.length !== draft.blocks.length || !readBack.blocks[4].sizeMarks) throw new Error('the app does not read the draft whole');

// The bear, from the app repo's study, without its tail.
const bear = JSON.parse(readFileSync(join(PURL, 'docs', 'research', '2026-10-25-amigurumi-assembly', 'bear.json'), 'utf8'));
const toy = {
  v: 1,
  id: 'pro-bear',
  name: 'Bear',
  createdAt: NOW,
  updatedAt: NOW,
  yarn: bear.yarn,
  hook: 3.5,
  parts: bear.parts.filter((p) => p.id !== 'tail').map((p) => {
    const { shape, width, height, colour, open, eyes } = p.part;
    const part = { ...ami.newPart(shape, width, height, colour), open: !!open };
    if (eyes) part.eyes = eyes;
    return { ...p, part };
  }),
  joins: bear.joins.filter((j) => j.a.part !== 'tail' && j.b.part !== 'tail'),
};
const read = toys.readToy(toy);
if (!read || read.parts.length !== toy.parts.length || read.joins.length !== toy.joins.length) throw new Error('the app does not read the bear');

const manifest = {
  _purl: 'purl-backup',
  version: 3,
  exportedAt: NOW,
  appVersion: 'pro-page-shots',
  data: {
    'purl:knitcharts': JSON.stringify([lace, scarf, hem]),
    'purl:patterndrafts': JSON.stringify([draft]),
    'purl:amigurumitoys': JSON.stringify([toy]),
  },
  files: [],
};
const m = Buffer.from(JSON.stringify(manifest), 'utf8');
const head = Buffer.alloc(24);
head.write('PURL', 0, 'ascii');
head.writeUInt32LE(3, 4);
head.write(m.length.toString(16).padStart(16, '0'), 8, 'ascii');

const out = process.argv[2];
if (!out) throw new Error('usage: node pro/shots/make-tools-backup.mjs <out.purl>');
writeFileSync(out, Buffer.concat([head, m]));
console.log('wrote', out);
