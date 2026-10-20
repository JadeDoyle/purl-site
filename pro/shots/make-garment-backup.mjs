// The demo garments for the Pro page's Studio shots, painted by code.
//
// The first Studio shots were painted by hand through emulator swipes, and it
// showed: stepped band edges, zigzag teeth of different sizes and stray
// squares at the ends (the maintainer, 2026-10-16). Here the app's own drafter
// makes each part's shape and this script paints exact repeats into its grid,
// mirror-symmetric about the part's centre line, so every tooth is the same.
//
// It writes a .purl backup (archive v3, utils/backupArchive.ts) that holds
// the garments as Studio file entries and nothing else. Import it through
// More, Export & import; its own ids, so it adds beside what an install has.
// Import adopts a garment it already has only when the backup's is newer:
// move NOW on to replace an earlier import of these.
//
// Usage: node pro/shots/make-garment-backup.mjs <out.purl>
// PURL_REPO points at the app repo (default ../Purl beside this repo).

import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PURL = resolve(process.env.PURL_REPO || join(HERE, '..', '..', '..', 'Purl'));
const { compileUtils, tempOut } = await import(pathToFileURL(join(PURL, 'tools', 'garment-lib', 'compile.mjs')).href);
const lib = compileUtils(['studio.ts', 'studioStarter.ts', 'studioStarterMitten.ts', 'studioPaint.ts'], { repo: PURL, root: PURL, out: tempOut('purl-pro-garments') });
const studio = await lib.load('studio.ts');
const paint = await lib.load('studioPaint.ts');
const starter = await lib.load('studioStarter.ts');
const mitten = await lib.load('studioStarterMitten.ts');

const NAVY = '1';
const CREAM = '.';
const NOW = Date.UTC(2026, 9, 16, 18, 0, 0);

// ---------------------------------------------------------------------
// Painting
// ---------------------------------------------------------------------

/** Distance in whole stitches from the centre line, the same on both sides:
 *  an even part has two middle columns at 0, an odd one a single one. */
function fromCentre(grid, c) {
  const m = grid.centre;
  if (Number.isInteger(m)) return c >= m ? c - m : m - 1 - c;
  return Math.abs(c - Math.floor(m));
}

/** The zigzag's row offset, 0 up to `teeth` and back, on whole stitches
 *  from the centre line. An even part's mirror line falls between two
 *  columns, so the tooth on it is two stitches wide; every peak and valley
 *  is drawn two wide (0, 1, .., teeth, teeth, .., 1, 0) so the centre one
 *  matches the rest. An odd part mirrors on a column, so its peaks are one. */
function tri(u, teeth, flat) {
  if (flat) {
    const period = 2 * (teeth + 1);
    const q = u % period;
    return q <= teeth ? q : 2 * teeth + 1 - q;
  }
  const period = 2 * teeth;
  const q = u % period;
  return q <= teeth ? q : period - q;
}

function painter(grid) {
  const cells = grid.cells.split('');
  const put = (r, c, ch) => {
    if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) return;
    const i = r * grid.cols + c;
    if (cells[i] !== '#') cells[i] = ch;
  };
  return {
    /** One whole row in a colour. */
    row(r, ch) { for (let c = 0; c < grid.cols; c++) put(r, c, ch); },
    /** A peerie band from row r up, `teeth + 5` rows: a row of `ch`, a row
     *  of ground, solid mountains of `ch` `teeth` rows tall on a base row, a
     *  row of ground and a row of `ch`. Solid shapes, as stranded bands are
     *  drawn: a zigzag line one stitch wide breaks into loose stitches on the
     *  knitted 3D. Returns the row above the band. */
    mountains(r, teeth, ch) {
      return this.band(r, teeth, ch, false);
    },
    /** The same with a second row of mountains hanging from above, peak to
     *  peak, so cream diamonds sit between navy hourglasses: `2 * teeth + 6`
     *  rows. */
    diamonds(r, teeth, ch) {
      return this.band(r, teeth, ch, true);
    },
    band(r, teeth, ch, double) {
      const flat = Number.isInteger(grid.centre);
      const tall = double ? 2 * (teeth + 1) : teeth + 1;
      this.row(r, ch);
      this.row(r + 1, CREAM);
      for (let c = 0; c < grid.cols; c++) {
        const top = tri(fromCentre(grid, c), teeth, flat);
        for (let k = 0; k < tall; k++) {
          const j = k <= teeth ? k : tall - 1 - k;
          put(r + 2 + k, c, j <= top ? ch : CREAM);
        }
      }
      this.row(r + tall + 2, CREAM);
      this.row(r + tall + 3, ch);
      return r + tall + 4;
    },
    /** The highest row wider than row `plain` (a plain hand row): on a
     *  mitten hand, the last round of the thumb gusset. */
    lastWider(plain) {
      const width = (r) => cells.slice(r * grid.cols, (r + 1) * grid.cols).filter((ch) => ch !== '#').length;
      for (let r = grid.rows - 1; r >= 0; r--) if (width(r) > width(plain)) return r;
      return -1;
    },
    done() { return { ...grid, cells: cells.join('') }; },
  };
}

function paintPiece(g, id, paint) {
  const pieces = g.pieces.map((p) => {
    if (p.id !== id) return p;
    const pen = painter(p.fill.grid);
    paint(pen, p.fill.grid);
    return { ...p, fill: { grid: pen.done() } };
  });
  return { ...g, pieces };
}

// ---------------------------------------------------------------------
// The raglan sweater
// ---------------------------------------------------------------------

function sweater() {
  const ids = { front: 'pro-raglan-front', back: 'pro-raglan-back', sleeveL: 'pro-raglan-sleeve-l', sleeveR: 'pro-raglan-sleeve-r' };
  const names = { front: 'Front', back: 'Back', sleeveL: 'Left sleeve', sleeveR: 'Right sleeve' };
  let g = studio.newStudioGarment({ id: 'pro-raglan', name: 'Fjord raglan', now: NOW });
  g = starter.addStarter(g, {
    construction: 'raglan', family: 'woman', chestCm: 94, gauge: { sts: 22, rows: 30 },
    ease: starter.starterEaseCm('raglan'),
  }, { ids, names, now: NOW });
  if (!g) throw new Error('the drafter refused the raglan spec');
  const body = (pen, grid) => {
    // The chest band: diamonds ten rows tall between their frame rows.
    pen.diamonds(Math.round(grid.joinRow * 0.5), 4, NAVY);
    yoke(pen, grid);
  };
  // The yoke band sits at the same rows above the joining round on every
  // part, so it runs round the garment unbroken.
  const yoke = (pen, grid) => { pen.diamonds(grid.joinRow + 8, 2, NAVY); };
  const sleeve = (pen, grid) => {
    pen.diamonds(10, 2, NAVY);
    yoke(pen, grid);
  };
  g = paintPiece(g, ids.front, body);
  g = paintPiece(g, ids.back, body);
  g = paintPiece(g, ids.sleeveL, sleeve);
  // The drafter links the sleeves; the right one is written from the left
  // by the app's own rule, or the app drops the link on opening.
  const left = g.pieces.find((p) => p.id === ids.sleeveL).fill.grid;
  g = paint.putSleeve(g, 'sleeveL', left, paint.sleeveLinkOf(g));
  if (paint.checkSleeveLink(g).dropped) throw new Error('the app would drop the sleeve link');
  return g;
}

// ---------------------------------------------------------------------
// The mittens
// ---------------------------------------------------------------------

function mittens() {
  const ids = { hand: 'pro-mitten-hand', thumb: 'pro-mitten-thumb' };
  const names = { hand: 'Hand', thumb: 'Thumb' };
  let g = studio.newStudioGarment({ id: 'pro-mittens', name: 'Winter mittens', now: NOW + 60000 });
  g = mitten.addMittenStarter(g, { construction: 'mitten', handCm: 19, gauge: { sts: 22, rows: 30 } }, { ids, names, now: NOW + 60000 });
  if (!g) throw new Error('the drafter refused the mitten spec');
  // The band sits just above the thumb gusset, so it runs whole round the hand.
  g = paintPiece(g, ids.hand, (pen, grid) => {
    const gusset = pen.lastWider(grid.rows - 12);
    if (gusset < 0) throw new Error('no thumb gusset on the mitten hand');
    pen.diamonds(gusset + 3, 3, NAVY);
  });
  return g;
}

// ---------------------------------------------------------------------
// The archive
// ---------------------------------------------------------------------

function archive(garments) {
  const payloads = garments.map((g) => {
    const read = studio.readStudioGarment(JSON.parse(JSON.stringify(g)));
    if (!read) throw new Error('the app would not read garment ' + g.id);
    return Buffer.from(JSON.stringify(g), 'utf8');
  });
  const manifest = {
    _purl: 'purl-backup',
    version: 3,
    exportedAt: NOW,
    appVersion: 'pro-page-shots',
    data: {},
    files: garments.map((g, i) => ({ uri: `file:///studio/${g.id}.json`, dir: 'studio-in', size: payloads[i].length, sg: { id: g.id, name: g.name, at: g.updatedAt } })),
  };
  const m = Buffer.from(JSON.stringify(manifest), 'utf8');
  const head = Buffer.alloc(24);
  head.write('PURL', 0, 'ascii');
  head.writeUInt32LE(3, 4);
  head.write(m.length.toString(16).padStart(16, '0'), 8, 'ascii');
  return Buffer.concat([head, m, ...payloads]);
}

const out = process.argv[2];
if (!out) throw new Error('usage: node pro/shots/make-garment-backup.mjs <out.purl>');
const gs = [sweater(), mittens()];
writeFileSync(out, archive(gs));
for (const g of gs) console.log(g.name, g.pieces.map((p) => `${p.name} ${p.fill.grid.cols}x${p.fill.grid.rows} join ${p.fill.grid.joinRow}`).join(', '));
console.log('wrote', out);
