import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

// Serve beneath a project path, as GitHub Pages does, to catch absolute asset URLs.
const root = resolve('dist'), prefix = '/chess-coach/';
const requested = [];
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    requested.push(pathname);
    if (!pathname.startsWith(prefix)) throw new Error('Wrong project path');
    const relative = pathname.slice(prefix.length) || 'index.html';
    const file = resolve(root, relative);
    if (!file.startsWith(root + sep)) throw new Error('Invalid path');
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'text/plain', 'Cache-Control': 'no-store' });
    response.end(data);
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}${prefix}`;
  await page.goto(url);
  assert.equal(await page.$eval('#engineDetails', element => element.open), false);
  assert.equal(await page.locator('#evaluation').isVisible(), false);
  const tactical = await page.evaluate(async () => {
    const { StockfishEngine } = await import('./js/stockfish-engine.js');
    const engine = new StockfishEngine();
    await engine.init();
    try {
      const white = await engine.analyze({ fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', depth: 16, moveTimeMs: 350 });
      const black = await engine.analyze({ fen: '4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', depth: 16, moveTimeMs: 350 });
      return { white, black };
    } finally { engine.dispose(); }
  });
  assert.equal(tactical.white.bestMove, 'e1e8');
  assert.deepEqual(tactical.white.score, { type: 'mate', value: 1 });
  assert.equal(tactical.black.bestMove, 'e8e1');
  assert.deepEqual(tactical.black.score, { type: 'mate', value: -1 });
  assert.ok(requested.includes(prefix + 'vendor/stockfish/stockfish-19-lite-single.wasm'));
  console.log('Real Stockfish WASM finds mate for both colors with White-normalized scores under a project URL.');

  const waitForPhase = phase => page.waitForFunction(value => document.querySelector('#engineStatus').dataset.state === value, phase);
  await page.selectOption('#quality', 'quick');
  await page.selectOption('#player', 'white');
  await page.fill('#pgn', '1. f3 e5 2. g4 Qh4#');
  await page.click('#analyze');
  await waitForPhase('complete');
  assert.match(await page.textContent('#reviewed'), /2 \/ 2/);
  await page.click('[data-ply="3"]');
  assert.match(await page.textContent('#coach'), /Blunder/);
  assert.match(await page.textContent('#coach'), /checkmating your king/);
  assert.doesNotMatch(await page.textContent('#coach p'), /Stockfish|evaluation|searched depth|first choice/i);
  assert.equal(await page.textContent('#evaluation'), '−M1');
  assert.match(await page.textContent('#searchDepth'), /Depth \d+/);
  await page.click('#engineDetails summary');
  assert.equal(await page.locator('#evaluation').isVisible(), true);
  await page.click('#last');
  assert.equal(await page.$eval('#engineDetails', element => element.open), true);
  assert.equal(await page.textContent('#evaluation'), 'Black wins by mate');
  const beforeSideChange = await page.$eval('#engineProgress', element => element.value);
  await page.selectOption('#player', 'black');
  assert.equal(await page.textContent('#sideLabel'), 'Black perspective');
  assert.match(await page.textContent('#coach'), /Well spotted/);
  assert.equal(await page.$eval('#engineProgress', element => element.value), Number(beforeSideChange));
  await page.evaluate(() => { navigator.clipboard.writeText = async value => { window.copiedReport = value; }; });
  await page.click('#copy');
  assert.match(await page.evaluate(() => window.copiedReport), /Your moves reviewed: 2 \/ 2; pending: 0/);
  assert.match(await page.evaluate(() => window.copiedReport), /engine evaluations: 4/);

  await page.click('#demo');
  await page.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'running' && document.querySelector('#engineProgress').value >= 2);
  await page.click('[data-ply="100"]');
  assert.match(await page.textContent('#coach'), /Pending/);
  await page.click('#reviewAction');
  await waitForPhase('paused');
  const paused = await page.$eval('#engineProgress', element => element.value);
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(await page.$eval('#engineProgress', element => element.value), paused);
  await page.click('#reviewAction');
  await page.waitForFunction(value => document.querySelector('#engineProgress').value > value, paused);
  // Replace a running review: the previous worker must never update the new game.
  await page.fill('#pgn', '[SetUp "1"]\n[FEN "4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 42"]\n\n42... Re1#');
  await page.click('#analyze');
  await waitForPhase('complete');
  await page.click('#last');
  assert.equal(await page.textContent('#positionTitle'), '42... Re1#');
  assert.equal(await page.textContent('#evaluation'), 'Black wins by mate');
  assert.equal(await page.locator('[data-ply]').count(), 1);
  await page.selectOption('#quality', 'deep');
  await page.click('#reviewAction');
  await waitForPhase('complete');
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted:true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted:true }));
  });
  await waitForPhase('complete');
  await page.fill('#pgn', '1. e5');
  await page.click('#analyze');
  assert.match(await page.textContent('#error'), /Could not read/);
  assert.equal(await page.locator('[data-ply]').count(), 1);
  await page.click('#engineDetails summary');
  await mkdir('test-results', { recursive:true });
  await page.screenshot({ path:'test-results/desktop.png', fullPage:true });
  await page.setViewportSize({ width:390, height:844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path:'test-results/mobile.png', fullPage:true });
  assert.deepEqual(errors, []);
  console.log('UI review, coaching, export, pause/resume, replacement, reanalysis, and mobile layout passed.');
  await context.close();

  const failedContext = await browser.newContext();
  await failedContext.route('**/*.wasm', route => route.fulfill({ status:404, body:'Missing engine' }));
  const failedPage = await failedContext.newPage();
  await failedPage.goto(url);
  await failedPage.selectOption('#player', 'white');
  await failedPage.fill('#pgn', '1. e4'); await failedPage.click('#analyze');
  await failedPage.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'error', null, { timeout:35000 });
  assert.match(await failedPage.textContent('#error'), /could not complete/);
  assert.match(await failedPage.textContent('#reviewed'), /0 \/ 1/);
  await failedPage.click('[data-ply="1"]');
  assert.match(await failedPage.textContent('#coach'), /Pending/);
  await failedContext.unroute('**/*.wasm');
  await failedPage.click('#reviewAction');
  await failedPage.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'complete');
  await failedContext.close();
  console.log('Missing WASM reports an error, leaves moves pending, and recovers on retry.');
  console.log('Browser smoke tests passed.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
