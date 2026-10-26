import { copyFile, mkdir } from 'node:fs/promises';
await mkdir('dist/vendor/chess.js', { recursive: true });
await copyFile('node_modules/chess.js/dist/esm/chess.js', 'dist/vendor/chess.js/chess.js');
await copyFile('node_modules/chess.js/LICENSE', 'dist/vendor/chess.js/LICENSE');
