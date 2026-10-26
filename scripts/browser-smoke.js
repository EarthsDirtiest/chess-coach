import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
import { openingDrills, puzzleDrills } from '../dist/js/practice-library.js';

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
  assert.equal(await page.getAttribute('#reviewTab', 'aria-selected'), 'true');
  await page.click('#practiceTab');
  assert.equal(await page.locator('#reviewView').isVisible(), false);
  assert.equal(await page.locator('[data-practice-group]:visible').count(), 3);
  await page.click('[data-category="openings"]');
  assert.equal(await page.locator('[data-practice-group]:visible').count(), 1);
  assert.equal(await page.locator('[data-practice-group="openings"]').isVisible(), true);
  assert.equal(await page.locator('[data-practice-group="openings"] [data-drill]').count(), 3);
  await page.click('[data-category="puzzles"]');
  assert.equal(await page.locator('[data-practice-group="puzzles"]').isVisible(), true);
  assert.equal(await page.locator('[data-practice-group="puzzles"] [data-drill]').count(), 3);
  for (const drill of [...openingDrills, ...puzzleDrills]) {
    await page.click(`[data-category="${drill.kind === 'opening' ? 'openings' : 'puzzles'}"]`);
    await page.click(`[data-drill="${drill.id}"]`);
    assert.equal(await page.textContent('#practiceSolution'), '');
    assert.equal(await page.locator('#practiceInstruction').isVisible(), true);
    if (drill.id === 'italian') {
      await page.click('[data-square="d2"]'); await page.click('[data-square="d4"]');
      assert.match(await page.textContent('#practiceStatus'), /legal move.*specific opening line/);
      assert.match(await page.locator('[data-square="d2"]').getAttribute('aria-label'), /white pawn/);
    }
    await page.click('#practiceSolutionToggle');
    assert.match(await page.textContent('#practiceSolution'), /Practice line from here/);
    await page.click('#practiceRestart'); assert.equal(await page.textContent('#practiceSolution'), '');
    for (let i = drill.side === 'white' ? 0 : 1; i < drill.line.length; i += 2) {
      const token = drill.line[i];
      await page.click(`[data-square="${token.slice(0, 2)}"]`); await page.click(`[data-square="${token.slice(2, 4)}"]`);
    }
    assert.equal(await page.getAttribute('#practicePanel', 'data-state'), 'won', drill.id);
    assert.match(await page.textContent('#practiceStatus'), drill.kind === 'opening' ? /Opening line complete/ : /Puzzle solved/);
    await page.click('#practiceUndo'); assert.equal(await page.getAttribute('#practicePanel', 'data-state'), 'player');
    await page.click('#practiceReturn');
  }
  await page.click('[data-category="checkmates"]');
  assert.equal(await page.locator('[data-practice-group="checkmates"] [data-drill]').count(), 3);
  assert.match(await page.textContent('#practiceGameStatus'), /Review a game/);
  for (const [drill, from, to] of [['mate-one-white', 'e1', 'e8'], ['mate-one-black', 'e8', 'e1']]) {
    await page.click(`[data-drill="${drill}"]`);
    assert.equal(await page.locator('#practiceHub').isVisible(), false);
    assert.equal(await page.getAttribute('#practiceTab', 'aria-selected'), 'true');
    assert.equal(await page.textContent('#practiceReturn'), 'Return to practices');
    assert.equal(await page.textContent('#practiceSolution'), '');
    await page.click(`[data-square="${from}"]`); await page.click(`[data-square="${to}"]`);
    assert.equal(await page.getAttribute('#practicePanel', 'data-state'), 'won');
    await page.click('#practiceReturn');
    assert.equal(await page.locator('#practiceHub').isVisible(), true);
    assert.equal(await page.getAttribute('[data-category="checkmates"]', 'aria-pressed'), 'true');
  }
  await page.click('[data-category="all"]');
  await page.setViewportSize({ width:390, height:844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mkdir('test-results', { recursive:true });
  await page.screenshot({ path:'test-results/practice-hub-mobile.png', fullPage:true });
  await page.setViewportSize({ width:1280, height:900 });
  await page.screenshot({ path:'test-results/practice-hub-desktop.png', fullPage:true });
  await page.locator('#practiceTab').focus(); await page.keyboard.press('Home');
  assert.equal(await page.getAttribute('#reviewTab', 'aria-selected'), 'true');
  assert.equal(await page.textContent('#step'), '0 / 0');
  assert.equal(await page.textContent('#pgn'), '');
  console.log('Practice library: all three openings, all three puzzles, checkmates for both colors, solutions, takebacks, keyboard and mobile layout passed.');
  assert.equal(await page.locator('#tryMate').isVisible(), false);
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
  const reviewPgn = await page.inputValue('#pgn');
  await page.click('#practiceTab');
  await page.click('[data-category="checkmates"]');
  assert.ok(await page.locator('#practiceGameMates button').count() > 0);
  await page.click('[data-drill="mate-two"]');
  await page.click('[data-square="d3"]'); await page.click('[data-square="c3"]');
  await page.waitForFunction(() => document.querySelector('#practicePanel').dataset.state === 'player');
  await page.click('[data-square="e2"]'); await page.click('[data-square="b2"]');
  assert.equal(await page.getAttribute('#practicePanel', 'data-state'), 'won');
  await page.click('#practiceReturn');
  await page.click('#practice-game-3');
  assert.equal(await page.textContent('#sideLabel'), 'You play Black');
  // Switching the main tab safely closes the trainer and restores the original review.
  await page.click('#reviewTab');
  assert.equal(await page.textContent('#step'), '3 / 4');
  assert.equal(await page.inputValue('#pgn'), reviewPgn);
  assert.equal(await page.textContent('#sideLabel'), 'White perspective');
  assert.equal(await page.locator('#reviewView > #reviewBoard').count(), 1);
  assert.equal(await page.locator('#practiceSession').isVisible(), false);
  assert.equal(await page.locator('#tryMate').isVisible(), true);
  assert.doesNotMatch(await page.textContent('#coach'), /Qh4/);
  await page.click('#engineDetails summary');
  const originalBoard = await page.locator('#board').textContent(), originalMoves = await page.locator('#moves').textContent();
  await page.click('#tryMate');
  assert.equal(await page.textContent('#sideLabel'), 'You play Black');
  assert.equal(await page.locator('#practiceSolution').isVisible(), false);
  assert.equal(await page.textContent('#practiceSolution'), '');
  assert.equal(await page.locator('#moves').isVisible(), false);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.textContent('#step'), '3 / 4');
  await page.click('[data-square="d8"]'); await page.click('[data-square="h4"]');
  assert.equal(await page.getAttribute('#practicePanel', 'data-state'), 'won');
  assert.match(await page.textContent('#practiceStatus'), /Checkmate!/);
  await page.click('#practiceUndo');
  assert.equal(await page.getAttribute('#practicePanel', 'data-state'), 'player');
  await page.click('#practiceSolutionToggle');
  assert.match(await page.textContent('#practiceSolution'), /Qh4#/);
  await page.click('#practiceRestart');
  assert.equal(await page.locator('#practiceSolution').isVisible(), false);
  assert.equal(await page.textContent('#practiceSolution'), '');
  await page.click('#practiceReturn');
  assert.equal(await page.textContent('#step'), '3 / 4');
  assert.equal(await page.textContent('#sideLabel'), 'White perspective');
  assert.equal(await page.locator('#board').textContent(), originalBoard);
  assert.equal(await page.locator('#moves').textContent(), originalMoves);
  assert.equal(await page.$eval('#engineDetails', element => element.open), true);
  assert.doesNotMatch(await page.textContent('#coach'), /Qh4/);
  await page.click('#revealMateAnalysis');
  assert.match(await page.textContent('#coach'), /Blunder/);
  assert.match(await page.textContent('#coach'), /checkmating your king/);
  assert.doesNotMatch(await page.textContent('#coach p'), /Stockfish|evaluation|searched depth|first choice/i);
  assert.equal(await page.textContent('#evaluation'), '−M1');
  assert.match(await page.textContent('#searchDepth'), /Depth \d+/);
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

  // A mate in two has two valid first moves. Accept the alternative and play a real defense.
  await page.setViewportSize({ width:1280, height:900 });
  await page.selectOption('#quality', 'quick');
  await page.fill('#pgn', '[SetUp "1"]\n[FEN "8/8/8/8/8/3K4/4Q3/k7 w - - 0 1"]\n\n1. Kc2 Ka2 2. Qa6#');
  await page.click('#analyze'); await waitForPhase('complete');
  await page.click('#tryMate');
  await page.click('[data-square="d3"]'); await page.click('[data-square="c3"]');
  await page.waitForFunction(() => document.querySelector('#practicePanel').dataset.state === 'player');
  assert.match(await page.locator('[data-square="b1"]').getAttribute('aria-label'), /black king/);
  await page.click('[data-square="e2"]'); await page.click('[data-square="b2"]');
  assert.equal(await page.getAttribute('#practicePanel', 'data-state'), 'won');
  await page.click('#practiceUndo');
  assert.match(await page.locator('[data-square="e2"]').getAttribute('aria-label'), /white queen/);
  await page.click('#practiceUndo');
  assert.match(await page.locator('[data-square="d3"]').getAttribute('aria-label'), /white king/);
  await page.click('#practiceSolutionToggle');
  assert.match(await page.textContent('#practiceSolution'), /#/);
  await mkdir('test-results', { recursive:true });
  await page.click('#practiceSolutionToggle');
  await page.screenshot({ path:'test-results/mate-practice-desktop.png', fullPage:true });
  await page.setViewportSize({ width:390, height:844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path:'test-results/mate-practice-mobile.png', fullPage:true });
  await page.click('[data-square="d3"]'); await page.click('[data-square="c3"]');
  // Return before initialization/search completes: no late defensive reply may replace review.
  await page.click('#practiceReturn');
  await page.waitForTimeout(1200);
  assert.equal(await page.textContent('#step'), '0 / 3');
  assert.equal(await page.locator('#practicePanel').isVisible(), false);
  assert.equal(await page.locator('#board button').count(), 0);

  // Entering during review pauses its worker; leaving resumes at the same review position.
  // Tiny tablebase-like mate positions can finish instantly, so hold each search briefly.
  await page.evaluate(async () => {
    const { StockfishEngine } = await import('./js/stockfish-engine.js');
    window.originalAnalyze = StockfishEngine.prototype.analyze;
    StockfishEngine.prototype.analyze = async function (options) {
      await new Promise(resolve => setTimeout(resolve, 400)); return window.originalAnalyze.call(this, options);
    };
  });
  await page.selectOption('#quality', 'deep');
  await page.click('#reviewAction');
  await page.waitForFunction(() => !document.querySelector('#tryMate').hidden && document.querySelector('#engineStatus').dataset.state === 'running');
  const reviewedBeforePractice = await page.$eval('#engineProgress', element => element.value);
  await page.click('#tryMate'); await page.waitForTimeout(300);
  assert.equal(await page.$eval('#engineProgress', element => element.value), reviewedBeforePractice);
  await page.click('#practiceReturn'); await waitForPhase('complete');
  await page.evaluate(async () => { const { StockfishEngine } = await import('./js/stockfish-engine.js'); StockfishEngine.prototype.analyze = window.originalAnalyze; });
  assert.equal(await page.textContent('#step'), '0 / 3');
  assert.equal(await page.locator('#board button').count(), 0);

  // Defender moves first, even though the reviewer selected Black and the winning side is White.
  await page.selectOption('#quality', 'quick');
  await page.selectOption('#player', 'black');
  await page.fill('#pgn', '[SetUp "1"]\n[FEN "8/8/8/8/8/2K5/4Q3/k7 b - - 1 1"]\n\n1... Kb1 2. Qb2#');
  await page.click('#analyze'); await waitForPhase('complete');
  await page.click('#tryMate');
  await page.waitForFunction(() => document.querySelector('#practicePanel').dataset.state === 'player');
  assert.equal(await page.textContent('#sideLabel'), 'You play White');
  assert.match(await page.locator('[data-square="b1"]').getAttribute('aria-label'), /black king/);
  await page.click('#practiceReturn');
  assert.equal(await page.textContent('#sideLabel'), 'Black perspective');
  await page.click('#last'); assert.equal(await page.locator('#tryMate').isVisible(), false);

  await page.fill('#pgn', '[SetUp "1"]\n[FEN "7k/5P2/6K1/8/8/8/8/8 w - - 0 1"]\n\n1. f8=Q#');
  await page.click('#analyze'); await waitForPhase('complete'); await page.click('#tryMate');
  await page.locator('[data-square="f7"]').focus(); await page.keyboard.press('Enter');
  await page.locator('[data-square="f8"]').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#practicePromotion').isVisible(), true);
  await page.click('[data-promotion="r"]');
  assert.equal(await page.getAttribute('#practicePanel', 'data-state'), 'won');
  await page.click('#practiceRestart');
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted:true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted:true }));
  });
  assert.equal(await page.locator('#practicePanel').isVisible(), false);
  assert.equal(await page.textContent('#step'), '0 / 1');
  assert.deepEqual(errors, []);
  console.log('Mate practice: both colors, alternative mating move, real defense, hidden/revealed solution, undo, promotion, return, review resume, lifecycle and mobile layout passed.');
  await context.close();

  const historyContext = await browser.newContext(), historyPage = await historyContext.newPage();
  const historyErrors = []; historyPage.on('pageerror', error => historyErrors.push(error.message));
  await historyPage.goto(url); await historyPage.selectOption('#quality', 'quick');
  await historyPage.fill('#pgn', '1. e5'); await historyPage.click('#analyze');
  await historyPage.click('#historyTab');
  await historyPage.waitForFunction(() => document.querySelector('#historyCount').textContent === '0 saved games');
  await historyPage.click('#reviewTab');
  const uploadedPgn = '[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6';
  await historyPage.setInputFiles('#pgnFile', { name:'match.pgn', mimeType:'application/x-chess-pgn', buffer:Buffer.from(uploadedPgn) });
  await historyPage.waitForFunction(() => document.querySelector('#saveStatus').textContent.startsWith('Saved to game history'));
  await historyPage.click('#historyTab');
  await historyPage.waitForFunction(() => document.querySelectorAll('.history-card').length === 1);
  assert.match(await historyPage.textContent('#historyList'), /Alice vs Bob/);
  await historyPage.reload(); await historyPage.click('#historyTab');
  await historyPage.waitForFunction(() => document.querySelectorAll('.history-card').length === 1);
  await historyPage.click('.history-card button');
  assert.equal(await historyPage.getAttribute('#reviewTab', 'aria-selected'), 'true');
  assert.equal(await historyPage.inputValue('#pgn'), uploadedPgn);
  await historyPage.selectOption('#quality', 'quick');
  await historyPage.fill('#pgn', '[White "A changed header"]\n\n1. e4 {comment} e5\n2. Nf3! Nc6 *'); await historyPage.click('#analyze');
  await historyPage.waitForFunction(() => document.querySelector('#saveStatus').textContent.includes('No duplicate was added'));
  await historyPage.click('#historyTab'); assert.equal(await historyPage.locator('.history-card').count(), 1);
  // Independent database connections race to save the same game: only one insert wins.
  const concurrent = await historyPage.evaluate(async () => {
    const { GameHistory } = await import('./js/game-history.js'), { parseGame } = await import('./js/chess-review.js');
    const pgn = '[White "<img src=x onerror=alert(1)>"]\n\n1. c4 e5', game = parseGame(pgn);
    const results = await Promise.all([new GameHistory().save(game, pgn), new GameHistory().save(game, pgn)]);
    return results.map(result => result.duplicate).sort();
  });
  assert.deepEqual(concurrent, [false, true]);
  await historyPage.click('#reviewTab'); await historyPage.click('#historyTab');
  await historyPage.waitForFunction(() => document.querySelectorAll('.history-card').length === 2);
  assert.equal(await historyPage.locator('#historyList img').count(), 0);
  assert.match(await historyPage.textContent('#historyList'), /<img src=x onerror=alert\(1\)>/);
  await historyPage.screenshot({ path:'test-results/game-history-desktop.png', fullPage:true });
  await historyPage.setViewportSize({ width:390, height:844 });
  assert.equal(await historyPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await historyPage.screenshot({ path:'test-results/game-history-mobile.png', fullPage:true });
  assert.deepEqual(historyErrors, []); await historyContext.close();

  const quotaContext = await browser.newContext();
  await quotaContext.addInitScript(() => { IDBObjectStore.prototype.add = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  const quotaPage = await quotaContext.newPage(); await quotaPage.goto(url); await quotaPage.selectOption('#quality', 'quick');
  await quotaPage.fill('#pgn', '1. e4'); await quotaPage.click('#analyze');
  await quotaPage.waitForFunction(() => document.querySelector('#saveStatus').textContent.includes('not saved'));
  await quotaPage.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'complete');
  await quotaPage.click('#historyTab');
  await quotaPage.waitForFunction(() => document.querySelector('#historyCount').textContent === '0 saved games');
  await quotaContext.close();

  const noStorageContext = await browser.newContext();
  await noStorageContext.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } }));
  const noStoragePage = await noStorageContext.newPage(); await noStoragePage.goto(url);
  await noStoragePage.selectOption('#quality', 'quick'); await noStoragePage.fill('#pgn', '1. e4'); await noStoragePage.click('#analyze');
  await noStoragePage.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'complete');
  assert.match(await noStoragePage.textContent('#saveStatus'), /not saved/);
  await noStoragePage.click('#historyTab'); assert.match(await noStoragePage.textContent('#historyError'), /unavailable/);
  await noStorageContext.close();
  console.log('Game history: real file upload, invalid PGN exclusion, reload persistence, reopen, normalized duplicates, concurrent deduplication, safe text, mobile and storage failures passed.');

  const failedContext = await browser.newContext();
  await failedContext.route('**/*.wasm', route => route.fulfill({ status:404, body:'Missing engine' }));
  const failedPage = await failedContext.newPage();
  await failedPage.goto(url);
  await failedPage.selectOption('#player', 'white');
  await failedPage.fill('#pgn', '1. e4'); await failedPage.click('#analyze');
  await failedPage.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'error', null, { timeout:35000 });
  assert.match(await failedPage.textContent('#error'), /could not complete/);
  assert.match(await failedPage.textContent('#reviewed'), /0 \/ 1/);
  await failedPage.click('#historyTab');
  await failedPage.waitForFunction(() => document.querySelector('#historyCount').textContent === '1 saved game');
  await failedPage.click('#reviewTab');
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
