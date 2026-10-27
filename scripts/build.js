import { readFile, readdir, access, open } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// The site ships as static files. Validate the committed distribution without
// introducing an engine build step or replacing vendored binaries.
const html = await readFile('dist/index.html', 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML element IDs.');
for (const id of ['board','ranks','coords','pgn','player','quality','coach','moves','engineDetails','practicePanel','historyView','coachView']) {
  if (!ids.includes(id)) throw new Error(`Missing UI integration point: ${id}`);
}
for (const match of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)) await access(resolve('dist', match[1]));
for (const file of await readdir('dist/js')) if (file.endsWith('.js')) {
  const check = spawnSync(process.execPath, ['--check', resolve('dist/js', file)], { encoding:'utf8' });
  if (check.status !== 0) throw new Error(check.stderr);
}
const { practiceDrills } = await import('../dist/js/practice-library.js');
if (practiceDrills.length !== 90 || ['opening','mate','puzzle'].some(kind => practiceDrills.filter(drill => drill.kind === kind).length !== 30)) throw new Error('Practice category counts must be 30 each.');
if (practiceDrills.some(drill => !drill.learningGoal || !drill.subject || !drill.targetSkills?.length)) throw new Error('Every practice needs a learning goal and coach skill tags.');
for (const color of ['w','b']) for (const piece of ['K','Q','R','B','N','P']) {
  const svg = await readFile(`dist/vendor/pieces/${color}${piece}.svg`, 'utf8');
  if (!svg.includes('<svg') || !svg.includes('viewBox=')) throw new Error('Invalid chess piece SVG.');
}
const css = await readFile('dist/css/app.css', 'utf8');
if ((css.match(/{/g) || []).length !== (css.match(/}/g) || []).length) throw new Error('Unbalanced stylesheet.');
const wasm = await open('dist/vendor/stockfish/stockfish-19-lite-single.wasm', 'r');
try { const header = Buffer.alloc(4); await wasm.read(header, 0, 4, 0); if (header.toString('hex') !== '0061736d') throw new Error('Invalid Stockfish WASM.'); }
finally { await wasm.close(); }
console.log('Static build verified: UI modules, integration IDs, styles, local assets, twelve SVG pieces and Stockfish WASM.');
