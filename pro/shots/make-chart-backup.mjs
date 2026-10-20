// The "Cable panel" knit chart of the Pro page's chart shots, written by code.
//
// The first one was painted by hand on the emulator (2026-10-16). This writes
// the same chart, so a retake (the dark theme twins, 2026-10-18) shows the
// same squares: 22 x 16, worked flat, purl columns 2 wide between three
// cables, a 2/2 LC and a 2/2 RC on rows 3, 7, 11 and 15 and a 3/3 LC in the
// middle on rows 5 and 13. Characters from SYMBOL_CHAR in the app's
// utils/knitSymbols.ts: '.' knit, 'p' purl, a cable's head then '-' tails.
//
// It writes a .purl backup (archive v3, utils/backupArchive.ts) whose data
// holds purl:knitcharts and nothing else. Import it through More, Export &
// import; the chart merges newer-wins by id.
//
// Usage: node pro/shots/make-chart-backup.mjs <out.purl>

import { writeFileSync } from 'node:fs';

const COLS = 22;
const ROWS = 16;
const NOW = Date.UTC(2026, 9, 16, 3, 0, 0);

// One row from the left (column 22) to the right (column 1).
function row(cable) {
  const purl = 'pp';
  const plain = (n) => '.'.repeat(n);
  const left = cable.left ? '#---' : plain(4);    // 2/2 LC
  const mid = cable.mid ? '_-----' : plain(6);    // 3/3 LC
  const right = cable.right ? '*---' : plain(4);  // 2/2 RC
  return purl + left + purl + mid + purl + right + purl;
}

// cells is row-major from the BOTTOM row (row 1 first).
let cells = '';
for (let r = 1; r <= ROWS; r++) {
  const two = r === 3 || r === 7 || r === 11 || r === 15;
  const three = r === 5 || r === 13;
  const line = row({ left: two, right: two, mid: three });
  if (line.length !== COLS) throw new Error('row ' + r + ' is ' + line.length + ' wide');
  cells += line;
}

const chart = {
  id: 'pro-cable-panel',
  name: 'Cable panel',
  v: 1,
  cols: COLS,
  rows: ROWS,
  cells,
  flat: true,
  noStitchLook: 'cross',
  createdAt: NOW,
  updatedAt: NOW,
};

const manifest = {
  _purl: 'purl-backup',
  version: 3,
  exportedAt: NOW,
  appVersion: 'pro-page-shots',
  data: { 'purl:knitcharts': JSON.stringify([chart]) },
  files: [],
};
const m = Buffer.from(JSON.stringify(manifest), 'utf8');
const head = Buffer.alloc(24);
head.write('PURL', 0, 'ascii');
head.writeUInt32LE(3, 4);
head.write(m.length.toString(16).padStart(16, '0'), 8, 'ascii');

const out = process.argv[2];
if (!out) throw new Error('usage: node pro/shots/make-chart-backup.mjs <out.purl>');
writeFileSync(out, Buffer.concat([head, m]));
console.log('wrote', out);
