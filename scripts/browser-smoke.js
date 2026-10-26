import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';
import { openingDrills, puzzleDrills } from '../dist/js/practice-library.js';

async function openImport(page) {
  if (await page.$eval('#importDialog', element => element.open)) return;
  if (page.viewportSize().width <= 800) { await page.click('#menuToggle'); await page.click('#mobileImport'); }
  else await page.click('#openImport');
}
async function fillPgn(page, value) { await openImport(page); await page.fill('#pgn', value); }
async function analyzePgn(page) { await page.click('#analyze'); if (await page.$eval('#importDialog', element => element.open)) await page.click('#closeImport'); }
async function exampleGame(page) { await openImport(page); await page.click('#demo'); }
async function reviewAction(page) {
  if (page.viewportSize().width <= 800) await page.click('#enginePanelTab');
  await page.click('#reviewAction');
  if (page.viewportSize().width <= 800) await page.click('#coachPanelTab');
}
async function lastMove(page) {
  if (page.viewportSize().width <= 800) {
    await page.click('#movesPanelTab'); await page.locator('#moves [data-ply]').last().click(); await page.click('#coachPanelTab');
  } else await page.click('#last');
}


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
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.wasm': 'application/wasm' };
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
  await fillPgn(page, '1. f3 e5 2. g4 Qh4#');
  await analyzePgn(page);
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
  await lastMove(page);
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

  await exampleGame(page);
  await page.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'running' && document.querySelector('#engineProgress').value >= 2);
  await page.click('[data-ply="100"]');
  assert.match(await page.textContent('#coach'), /Pending/);
  await reviewAction(page);
  await waitForPhase('paused');
  const paused = await page.$eval('#engineProgress', element => element.value);
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(await page.$eval('#engineProgress', element => element.value), paused);
  await reviewAction(page);
  await page.waitForFunction(value => document.querySelector('#engineProgress').value > value, paused);
  // Replace a running review: the previous worker must never update the new game.
  await fillPgn(page, '[SetUp "1"]\n[FEN "4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 42"]\n\n42... Re1#');
  await analyzePgn(page);
  await waitForPhase('complete');
  await lastMove(page);
  assert.equal(await page.textContent('#positionTitle'), '42... Re1#');
  assert.equal(await page.textContent('#evaluation'), 'Black wins by mate');
  assert.equal(await page.locator('[data-ply]').count(), 1);
  await page.selectOption('#quality', 'deep');
  await reviewAction(page);
  await waitForPhase('complete');
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted:true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted:true }));
  });
  await waitForPhase('complete');
  await fillPgn(page, '1. e5');
  await analyzePgn(page);
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
  await fillPgn(page, '[SetUp "1"]\n[FEN "8/8/8/8/8/3K4/4Q3/k7 w - - 0 1"]\n\n1. Kc2 Ka2 2. Qa6#');
  await analyzePgn(page); await waitForPhase('complete');
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
  await reviewAction(page);
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
  await fillPgn(page, '[SetUp "1"]\n[FEN "8/8/8/8/8/2K5/4Q3/k7 b - - 1 1"]\n\n1... Kb1 2. Qb2#');
  await analyzePgn(page); await waitForPhase('complete');
  await page.click('#tryMate');
  await page.waitForFunction(() => document.querySelector('#practicePanel').dataset.state === 'player');
  assert.equal(await page.textContent('#sideLabel'), 'You play White');
  assert.match(await page.locator('[data-square="b1"]').getAttribute('aria-label'), /black king/);
  await page.click('#practiceReturn');
  assert.equal(await page.textContent('#sideLabel'), 'Black perspective');
  await lastMove(page); assert.equal(await page.locator('#tryMate').isVisible(), false);

  await fillPgn(page, '[SetUp "1"]\n[FEN "7k/5P2/6K1/8/8/8/8/8 w - - 0 1"]\n\n1. f8=Q#');
  await analyzePgn(page); await waitForPhase('complete'); await page.click('#tryMate');
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

  const coachContext = await browser.newContext(), coachPage = await coachContext.newPage();
  const coachErrors = []; coachPage.on('pageerror', error => coachErrors.push(error.message));
  // Upgrade a real version-one history database without losing its uploaded PGN.
  await coachPage.goto(url + 'vendor/chess.js/LICENSE');
  await coachPage.evaluate(async () => {
    const { parseGame } = await import('/chess-coach/js/chess-review.js');
    const { gameIdentity } = await import('/chess-coach/js/game-history.js');
    const pgn = '[White "Me"]\n[Black "Opponent"]\n\n1. f3 e5 2. g4 Qh4#', game = parseGame(pgn);
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('chess-coach-history', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('games', { keyPath:'id' });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('games', 'readwrite');
        tx.objectStore('games').add({ id:gameIdentity(game), pgn, headers:game.headers, halfMoves:4, uploadedAt:Date.now() });
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    });
  });
  await coachPage.goto(url); await coachPage.selectOption('#quality', 'quick');
  await coachPage.click('#historyTab'); await coachPage.waitForFunction(() => document.querySelectorAll('.history-card').length === 1);
  await coachPage.click('.history-card button');
  await coachPage.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'complete');
  assert.match(await coachPage.textContent('#gameCoachStatus'), /Choose.*I played White/);
  await coachPage.click('#coachTab'); assert.equal(await coachPage.textContent('#coachGameCount'), '0');
  await coachPage.click('#reviewTab'); await coachPage.selectOption('#player', 'white');
  await coachPage.waitForFunction(() => document.querySelector('#gameCoachStatus').textContent.includes('profile has been updated'));
  await coachPage.click('#coachTab'); assert.equal(await coachPage.textContent('#coachGameCount'), '1');
  assert.equal(await coachPage.textContent('#coachMoveCount'), '2');
  assert.match(await coachPage.locator('#coachPriorities h3').first().textContent(), /Spot mating threats/);
  assert.match(await coachPage.textContent('#coachEvidence'), /Early estimate/);
  const firstReport = await coachPage.evaluate(async () => {
    const { GameHistory } = await import('./js/game-history.js'); return (await new GameHistory().listReports())[0];
  });
  await coachPage.locator('#coachPriorities button').first().click();
  assert.equal(await coachPage.textContent('#practiceReturn'), 'Return to my coach');
  await coachPage.click('[data-square="e1"]'); await coachPage.click('[data-square="e8"]');
  await coachPage.click('#practiceReturn'); assert.equal(await coachPage.getAttribute('#coachTab', 'aria-selected'), 'true');
  assert.equal(await coachPage.textContent('#coachGameCount'), '1');
  await coachPage.locator('#coachPriorities').getByRole('button', { name:'Review this move' }).first().click();
  await coachPage.waitForFunction(() => document.querySelector('#step').textContent === '3 / 4');
  assert.equal(await coachPage.textContent('#step'), '3 / 4');
  await coachPage.waitForFunction(() => document.querySelector('#gameCoachStatus').textContent.includes('still counts once'));
  await coachPage.selectOption('#player', 'black');
  await coachPage.waitForFunction(() => document.querySelector('#gameCoachStats').textContent.includes('100/100'));
  await coachPage.click('#coachTab'); assert.equal(await coachPage.textContent('#coachGameCount'), '1');
  assert.equal(await coachPage.locator('#coachPriorities h3').count(), 0);
  await coachPage.click('#reviewTab'); await coachPage.selectOption('#player', 'white');
  await coachPage.waitForFunction(() => document.querySelector('#gameCoachStatus').textContent.includes('still counts once'));
  await fillPgn(coachPage, '[White "Me"]\n[Black "Another opponent"]\n[SetUp "1"]\n[FEN "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1"]\n\n1. Re8#');
  await analyzePgn(coachPage);
  await coachPage.waitForFunction(() => document.querySelector('#gameCoachStatus').textContent.includes('profile has been updated'));
  await coachPage.click('#coachTab'); assert.equal(await coachPage.textContent('#coachGameCount'), '2');
  assert.match(await coachPage.textContent('#coachTrend'), /^\+[1-9]\d* points$/);
  assert.equal(await coachPage.locator('#coachTimeline tr').count(), 2);
  await coachPage.screenshot({ path:'test-results/coach-profile-desktop.png', fullPage:true });
  await coachPage.setViewportSize({ width:390, height:844 });
  assert.equal(await coachPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await coachPage.screenshot({ path:'test-results/coach-profile-mobile.png', fullPage:true });
  await coachPage.reload(); await coachPage.click('#coachTab');
  await coachPage.waitForFunction(() => document.querySelector('#coachGameCount').textContent === '2');
  const persisted = await coachPage.evaluate(async () => { const { GameHistory } = await import('./js/game-history.js'); return new GameHistory().listReports(); });
  assert.equal(persisted.find(report => report.id === firstReport.id).firstReviewedAt, firstReport.firstReviewedAt);
  await coachPage.click('#practiceTab'); assert.ok(await coachPage.locator('#practiceRecommendations button').count());
  await coachPage.locator('#practiceRecommendations button').first().click(); await coachPage.click('#practiceReturn');
  assert.equal(await coachPage.getAttribute('#practiceTab', 'aria-selected'), 'true');
  await coachPage.click('#reviewTab'); await coachPage.selectOption('#quality', 'deep'); await coachPage.selectOption('#player', 'white');
  await fillPgn(coachPage, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6'); await analyzePgn(coachPage);
  await coachPage.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'running');
  await reviewAction(coachPage);
  await coachPage.click('#coachTab'); assert.equal(await coachPage.textContent('#coachGameCount'), '2');
  await coachPage.click('#reviewTab'); await coachPage.selectOption('#quality', 'quick'); await reviewAction(coachPage);
  await coachPage.waitForFunction(() => document.querySelector('#gameCoachStatus').textContent.includes('profile has been updated'));
  await coachPage.click('#coachTab'); assert.equal(await coachPage.textContent('#coachGameCount'), '3');
  const concurrentReports = await coachPage.evaluate(async () => {
    const { GameHistory } = await import('./js/game-history.js'), history = new GameHistory();
    const original = (await history.listReports())[0];
    await Promise.all([history.saveReport(original), new GameHistory().saveReport(original)]);
    const reports = await history.listReports(); return { count:reports.length, original:original.firstReviewedAt, after:reports.find(report => report.id === original.id).firstReviewedAt };
  });
  assert.equal(concurrentReports.count, 3); assert.equal(concurrentReports.after, concurrentReports.original);
  await coachPage.click('#reviewTab'); await coachPage.selectOption('#player', 'auto');
  await fillPgn(coachPage, '[White "EarthsDirtiest"]\n[Black "Rival"]\n\n1. d4 d5'); await analyzePgn(coachPage);
  await coachPage.waitForFunction(() => document.querySelector('#gameCoachStatus').textContent.includes('profile has been updated'));
  await coachPage.click('#coachTab'); assert.equal(await coachPage.textContent('#coachGameCount'), '4');
  // Fast prepared results isolate the example-exclusion rule from a long 110-ply review.
  await coachPage.evaluate(async () => {
    const { StockfishEngine } = await import('./js/stockfish-engine.js'), { Chess } = await import('./vendor/chess.js/chess.js');
    window.realAnalyze = StockfishEngine.prototype.analyze;
    StockfishEngine.prototype.analyze = async ({ fen }) => {
      const move = new Chess(fen).moves({ verbose:true })[0], uci = move.from + move.to + (move.promotion || '');
      return { score:{ type:'cp', value:0 }, bestMove:uci, pv:[uci], depth:1 };
    };
  });
  await coachPage.click('#reviewTab'); await exampleGame(coachPage);
  await coachPage.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'complete');
  assert.match(await coachPage.textContent('#gameCoachStatus'), /Example game.*will not change/);
  await coachPage.click('#coachTab'); assert.equal(await coachPage.textContent('#coachGameCount'), '4');
  assert.deepEqual(coachErrors, []); await coachContext.close();

  const reportQuotaContext = await browser.newContext();
  await reportQuotaContext.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) { if (this.name === 'coachReports') throw new DOMException('Quota exceeded', 'QuotaExceededError'); return put.apply(this, args); };
  });
  const reportQuotaPage = await reportQuotaContext.newPage(); await reportQuotaPage.goto(url);
  await reportQuotaPage.selectOption('#quality', 'quick'); await reportQuotaPage.selectOption('#player', 'white');
  await fillPgn(reportQuotaPage, '1. e4'); await analyzePgn(reportQuotaPage);
  await reportQuotaPage.waitForFunction(() => document.querySelector('#gameCoachStatus').textContent.includes('was not saved'));
  assert.equal(await reportQuotaPage.getAttribute('#engineStatus', 'data-state'), 'complete');
  await reportQuotaPage.click('#historyTab'); await reportQuotaPage.waitForFunction(() => document.querySelectorAll('.history-card').length === 1);
  await reportQuotaPage.click('#coachTab'); assert.equal(await reportQuotaPage.textContent('#coachGameCount'), '0');
  await reportQuotaContext.close();
  console.log('Personal coach: history migration, confirmed side, prioritized evidence, recommended practice, side correction, reanalysis deduplication, progress, reload, partial-review and example exclusion, concurrency, storage failure and mobile passed.');

  const historyContext = await browser.newContext(), historyPage = await historyContext.newPage();
  const historyErrors = []; historyPage.on('pageerror', error => historyErrors.push(error.message));
  await historyPage.goto(url); await historyPage.selectOption('#quality', 'quick');
  await fillPgn(historyPage, '1. e5'); await analyzePgn(historyPage);
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
  await fillPgn(historyPage, '[White "A changed header"]\n\n1. e4 {comment} e5\n2. Nf3! Nc6 *'); await analyzePgn(historyPage);
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
  await fillPgn(quotaPage, '1. e4'); await analyzePgn(quotaPage);
  await quotaPage.waitForFunction(() => document.querySelector('#saveStatus').textContent.includes('not saved'));
  await quotaPage.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'complete');
  await quotaPage.click('#historyTab');
  await quotaPage.waitForFunction(() => document.querySelector('#historyCount').textContent === '0 saved games');
  await quotaContext.close();

  const noStorageContext = await browser.newContext();
  await noStorageContext.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } }));
  const noStoragePage = await noStorageContext.newPage(); await noStoragePage.goto(url);
  await noStoragePage.selectOption('#quality', 'quick'); await fillPgn(noStoragePage, '1. e4'); await analyzePgn(noStoragePage);
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
  await fillPgn(failedPage, '1. e4'); await analyzePgn(failedPage);
  await failedPage.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'error', null, { timeout:35000 });
  assert.match(await failedPage.textContent('#error'), /could not complete/);
  assert.match(await failedPage.textContent('#reviewed'), /0 \/ 1/);
  await failedPage.click('#historyTab');
  await failedPage.waitForFunction(() => document.querySelector('#historyCount').textContent === '1 saved game');
  await failedPage.click('#reviewTab');
  await failedPage.click('[data-ply="1"]');
  assert.match(await failedPage.textContent('#coach'), /Pending/);
  await failedContext.unroute('**/*.wasm');
  await reviewAction(failedPage);
  await failedPage.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'complete');
  await failedContext.close();
  console.log('Missing WASM reports an error, leaves moves pending, and recovers on retry.');

  const layoutContext = await browser.newContext(), layoutPage = await layoutContext.newPage();
  const layoutErrors = []; layoutPage.on('pageerror', error => layoutErrors.push(error.message));
  layoutPage.on('response', response => { if (response.status() >= 400) layoutErrors.push(`${response.status()} ${response.url()}`); });
  await layoutPage.setViewportSize({ width:1440, height:1000 }); await layoutPage.goto(url);
  async function assertBoard(page, width) {
    await page.setViewportSize({ width, height:width <= 800 ? 900 : 1000 });
    await page.waitForFunction(() => [...document.querySelectorAll('#board img')].every(image => image.complete && image.naturalWidth > 0));
    const geometry = await page.evaluate(() => {
      const board = document.querySelector('#board'), bounds = board.getBoundingClientRect();
      const squares = [...board.children].map(square => square.getBoundingClientRect());
      return { width:bounds.width, height:bounds.height, count:squares.length,
        widths:squares.map(square => square.width), heights:squares.map(square => square.height),
        rows:new Set(squares.map(square => square.y.toFixed(2))).size, columns:new Set(squares.map(square => square.x.toFixed(2))).size,
        rowSizes:getComputedStyle(board).gridTemplateRows.split(' ').length, columnSizes:getComputedStyle(board).gridTemplateColumns.split(' ').length,
        overflow:document.documentElement.scrollWidth > innerWidth,
        pieces:[...board.querySelectorAll('img')].map(image => image.getAttribute('src')),
        css:getComputedStyle(document.body).backgroundColor,
      };
    });
    assert.equal(geometry.count, 64); assert.equal(geometry.rows, 8); assert.equal(geometry.columns, 8);
    assert.equal(geometry.rowSizes, 8); assert.equal(geometry.columnSizes, 8);
    assert.ok(Math.abs(geometry.width - geometry.height) < .2, `Square board at ${width}: ${geometry.width} × ${geometry.height}`);
    assert.ok(geometry.width > Math.min(250, width - 80));
    assert.ok(geometry.widths.every(value => Math.abs(value - geometry.width / 8) < .2));
    assert.ok(geometry.heights.every(value => Math.abs(value - geometry.height / 8) < .2));
    assert.equal(geometry.overflow, false, `Horizontal overflow at ${width}`);
    assert.equal(geometry.css, 'rgb(9, 19, 27)');
    assert.ok(geometry.pieces.every(src => /vendor\/pieces\/[wb][KQRBNP]\.svg$/.test(src)));
  }
  for (const width of [320,390,589,768,1024,1280,1440,1920]) await assertBoard(layoutPage, width);
  await layoutPage.locator('#reviewTab').focus(); await layoutPage.keyboard.press('ArrowDown');
  assert.equal(await layoutPage.getAttribute('#historyTab', 'aria-selected'), 'true');
  await layoutPage.keyboard.press('Home'); assert.equal(await layoutPage.getAttribute('#reviewTab', 'aria-selected'), 'true');
  assert.equal(await layoutPage.textContent('#liveEvaluation'), '—');
  assert.equal(await layoutPage.locator('#evaluationChart path').count(), 0);
  await layoutPage.setViewportSize({ width:1440, height:1000 });
  await layoutPage.selectOption('#quality', 'quick'); await layoutPage.selectOption('#player', 'white');
  await fillPgn(layoutPage, '[Event "Midnight review"]\n[White "EarthsDirtiest"]\n[Black "Training partner"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. O-O d6 6. c3 O-O 7. Re1 a6 8. Bb3 Ba7 9. Nbd2 h6 10. Nf1 Be6 11. Ng3 d5 12. Nxe5 Nxe5');
  await analyzePgn(layoutPage);
  await layoutPage.waitForFunction(() => document.querySelector('#gameCoachStatus').textContent.includes('profile has been updated'), null, { timeout:35000 });
  assert.equal(await layoutPage.$eval('#importDialog', element => element.open), false);
  await layoutPage.click('[data-ply="12"]');
  assert.equal(await layoutPage.textContent('#liveEvaluation'), await layoutPage.textContent('#evaluation'));
  assert.ok(await layoutPage.locator('#evaluationChart path').count());
  assert.match(await layoutPage.textContent('#summaryScore'), /\d+%/);
  assert.equal(await layoutPage.locator('.move-row').count(), 12);
  const whiteFiles = await layoutPage.textContent('#coords');
  await layoutPage.click('#flipBoard'); assert.notEqual(await layoutPage.textContent('#coords'), whiteFiles);
  assert.equal(await layoutPage.inputValue('#player'), 'white');
  await layoutPage.click('#flipBoard'); assert.equal(await layoutPage.textContent('#coords'), whiteFiles);
  await layoutPage.click('#showLine'); assert.equal(await layoutPage.locator('#coach .continuation').isVisible(), true);
  await layoutPage.locator('#evaluationChart').focus(); await layoutPage.keyboard.press('ArrowRight');
  assert.equal(await layoutPage.textContent('#step'), '13 / 24');
  await layoutPage.click('#playMoves');
  await layoutPage.waitForFunction(() => document.querySelector('#step').textContent !== '13 / 24');
  await layoutPage.click('#playMoves'); assert.equal(await layoutPage.getAttribute('#playMoves', 'aria-label'), 'Play through game');
  await layoutPage.click('[data-ply="23"]'); await layoutPage.evaluate(() => scrollTo(0, 0)); await layoutPage.screenshot({ path:'test-results/midnight-desktop.png', fullPage:true });
  for (const width of [320,390,589,768,1024,1440,1920]) await assertBoard(layoutPage, width);
  await layoutPage.setViewportSize({ width:390, height:900 });
  await layoutPage.click('#coachPanelTab'); assert.equal(await layoutPage.locator('#coachPane').isVisible(), true);
  assert.equal(await layoutPage.locator('#movesPanel').isVisible(), false);
  await layoutPage.click('#movesPanelTab'); await layoutPage.click('[data-ply="23"]');
  assert.equal(await layoutPage.textContent('#step'), '23 / 24');
  await layoutPage.click('#enginePanelTab'); assert.equal(await layoutPage.locator('#engineTop').isVisible(), true);
  assert.equal(await layoutPage.textContent('#mobileEvaluation'), await layoutPage.textContent('#liveEvaluation'));
  await layoutPage.click('#coachPanelTab'); assert.equal(await layoutPage.locator('#engineTop').isVisible(), false);
  await layoutPage.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  await layoutPage.screenshot({ path:'test-results/midnight-mobile.png', fullPage:true });
  await layoutPage.click('#menuToggle'); assert.equal(await layoutPage.locator('#mobileMenu').isVisible(), true);
  await layoutPage.keyboard.press('Escape'); assert.equal(await layoutPage.locator('#mobileMenu').isVisible(), false);
  assert.deepEqual(layoutErrors, []); await layoutContext.close();
  console.log('Midnight UI: real data, playback, independent flip, show line, interactive chart, mobile panels, SVG graphics and exact 8×8 square geometry at 320–1920px passed.');
  console.log('Browser smoke tests passed.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
