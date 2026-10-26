import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = 'dist/vendor/stockfish';
await mkdir(root, { recursive: true });
const version = 'v19.0.1';
const assets = {
  'stockfish-19-lite-single.js': 'ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a',
  'stockfish-19-lite-single.wasm': 'ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de',
};
for (const [name, expected] of Object.entries(assets)) {
  const response = await fetch(`https://github.com/nmrugg/stockfish.js/releases/download/${version}/${name}`);
  if (!response.ok) throw new Error(`Download failed for ${name}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(buffer).digest('hex') !== expected) throw new Error(`Unexpected checksum: ${name}`);
  await writeFile(`${root}/${name}`, buffer);
}
const license = await fetch(`https://raw.githubusercontent.com/nmrugg/stockfish.js/${version}/Copying.txt`);
if (!license.ok) throw new Error(`License download failed: ${license.status}`);
await writeFile(`${root}/Copying.txt`, await license.text());
