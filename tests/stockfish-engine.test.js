import test from 'node:test';
import assert from 'node:assert/strict';
import { StockfishEngine } from '../dist/js/stockfish-engine.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BLACK = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const CUSTOM = '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1';
class FakeWorker {
  commands = []; terminated = 0; onmessage = null; onerror = null; onmessageerror = null;
  postMessage(command) { this.commands.push(command); }
  terminate() { this.terminated++; }
  emit(data) { this.onmessage?.({ data }); }
}
function harness(options = {}) {
  const worker = new FakeWorker();
  return { worker, engine:new StockfishEngine({ workerFactory:() => worker, ...options }) };
}
async function ready(engine, worker) {
  const initialized = engine.init(); worker.emit('uciok'); worker.emit('readyok'); await initialized;
}

test('UCI handshake waits for both acknowledgements, sets safe options, and initializes once', async () => {
  const { engine, worker } = harness(), initialized = engine.init();
  assert.equal(engine.init(), initialized);
  assert.deepEqual(worker.commands, ['uci']);
  worker.emit('readyok');
  assert.deepEqual(worker.commands, ['uci']);
  worker.emit('id name Stockfish 19\nuciok');
  assert.deepEqual(worker.commands, ['uci','setoption name Hash value 16','setoption name Threads value 1','setoption name MultiPV value 1','ucinewgame','isready']);
  worker.emit('readyok'); await initialized; await engine.init();
  assert.equal(worker.commands.length, 6); engine.dispose();
});
test('Black centipawn scores become White perspective; history and both search limits are sent', async () => {
  const { engine, worker } = harness(); await ready(engine, worker);
  const result = engine.analyze({ fen:BLACK, initialFen:START, moves:['e2e4'], depth:14, moveTimeMs:450 });
  await Promise.resolve();
  assert.deepEqual(worker.commands.slice(-2), ['position startpos moves e2e4','go depth 14 movetime 450']);
  worker.emit('info depth 14 multipv 1 score cp 37 nodes 500 pv e7e5 g1f3\nbestmove e7e5 ponder g1f3');
  assert.deepEqual(await result, { score:{ type:'cp', value:-37 }, depth:14, pv:['e7e5','g1f3'], bestMove:'e7e5' }); engine.dispose();
});
test('timed stops keep the recommendation and score from the deepest exact PV together', async () => {
  const { engine, worker } = harness(); await ready(engine, worker);
  const result = engine.analyze({ fen:START }); await Promise.resolve();
  for (const line of ['info depth 8 score cp 21 pv e2e4 e7e5','info depth 9 multipv 2 score cp 900 pv d2d4','info depth 10 score cp 800 lowerbound pv d2d4','info depth 10 score cp -800 upperbound pv d2d4','info string depth 99 score cp 999 pv d2d4','info depth 4 score cp 2 pv d2d4','info depth 15 nodes 700','bestmove d2d4']) worker.emit(line);
  assert.deepEqual(await result, { score:{ type:'cp', value:21 }, depth:8, pv:['e2e4','e7e5'], bestMove:'e2e4' }); engine.dispose();
});
test('mate signs normalize for either side and each search discards the previous score', async () => {
  const { engine, worker } = harness(); await ready(engine, worker);
  for (const [fen, engineValue, whiteValue] of [[START,3,3],[BLACK,3,-3],[BLACK,-2,2]]) {
    const result = engine.analyze({ fen }); await Promise.resolve();
    worker.emit(`info depth 12 score mate ${engineValue} pv e2e4\nbestmove e2e4`);
    assert.deepEqual((await result).score, { type:'mate', value:whiteValue });
  }
  const missing = engine.analyze({ fen:START }); await Promise.resolve(); worker.emit('bestmove e2e4');
  await assert.rejects(missing, /without an exact evaluation/); assert.equal(worker.terminated, 1);
});
test('custom starting positions preserve history; standalone FEN uses its own position', async () => {
  const { engine, worker } = harness(); await ready(engine, worker);
  const first = engine.analyze({ fen:CUSTOM, initialFen:CUSTOM, moves:['e1e2'] }); await Promise.resolve();
  assert.equal(worker.commands.at(-2), `position fen ${CUSTOM} moves e1e2`);
  worker.emit('info depth 1 score cp 0 pv e2e1\nbestmove e2e1'); await first;
  const second = engine.analyze({ fen:BLACK, moves:['e2e4'] }); await Promise.resolve();
  assert.equal(worker.commands.at(-2), `position fen ${BLACK}`);
  worker.emit('info depth 1 score cp 0 pv e7e5\nbestmove e7e5');
  assert.equal((await second).score.value, 0); engine.dispose();
});
test('overlapping searches are rejected during initialization and calculation', async () => {
  const { engine, worker } = harness(), first = engine.analyze({ fen:START });
  await assert.rejects(engine.analyze({ fen:START }), /already analyzing/);
  worker.emit('uciok'); worker.emit('readyok'); await Promise.resolve();
  await assert.rejects(engine.analyze({ fen:START }), /already analyzing/);
  worker.emit('info depth 1 score cp 10 pv e2e4\nbestmove e2e4'); await first; engine.dispose();
});
test('dispose cancels initialization and is idempotent', async () => {
  const { engine, worker } = harness(), initialized = engine.init();
  const rejected = assert.rejects(initialized, { name:'AbortError' }); engine.dispose(); engine.dispose();
  await rejected; assert.equal(worker.terminated, 1); await assert.rejects(engine.init(), { name:'AbortError' });
});
test('dispose cancels search, ignores queued output and prevents reuse', async () => {
  const { engine, worker } = harness(); await ready(engine, worker);
  const result = engine.analyze({ fen:START }); await Promise.resolve();
  const queued = worker.onmessage, rejected = assert.rejects(result, { name:'AbortError' });
  engine.dispose(); queued({ data:'info depth 20 score cp 500 pv e2e4\nbestmove e2e4' });
  await rejected; assert.equal(worker.terminated, 1); await assert.rejects(engine.analyze({ fen:START }), { name:'AbortError' });
});
test('worker runtime and message errors fail promptly and terminate', async () => {
  for (const kind of ['error','messageerror']) {
    const { engine, worker } = harness(); await ready(engine, worker);
    const result = engine.analyze({ fen:START }); await Promise.resolve();
    if (kind === 'error') worker.onerror({ message:'WASM load failed', preventDefault() {} });
    else worker.onmessageerror({});
    await assert.rejects(result, /could not run|unreadable/); assert.equal(worker.terminated, 1);
    await assert.rejects(engine.init(), /could not run|unreadable/);
  }
});
test('startup and search timeouts terminate workers and reject pending operations', async () => {
  const startup = harness({ startupTimeoutMs:10 }); await assert.rejects(startup.engine.init(), /initialization timed out/);
  assert.equal(startup.worker.terminated, 1);
  const search = harness({ searchTimeoutMs:10 }); await ready(search.engine, search.worker);
  await assert.rejects(search.engine.analyze({ fen:START }), /analysis timed out/); assert.equal(search.worker.terminated, 1);
});
test('bounded-only scores cannot produce a published result', async () => {
  const { engine, worker } = harness(); await ready(engine, worker);
  const result = engine.analyze({ fen:START }); await Promise.resolve();
  worker.emit('info depth 15 score cp 500 lowerbound pv e2e4\nbestmove e2e4');
  await assert.rejects(result, /without an exact evaluation/); assert.equal(worker.terminated, 1);
});
test('critical failures reject instead of waiting for a bestmove', async () => {
  const { engine, worker } = harness(); await ready(engine, worker);
  const result = engine.analyze({ fen:START }); await Promise.resolve(); worker.emit('info string CRITICAL ERROR: invalid position');
  await assert.rejects(result, /CRITICAL ERROR/); assert.equal(worker.terminated, 1);
});
test('factory failures and invalid arguments report clearly', async () => {
  const broken = new StockfishEngine({ workerFactory() { throw new Error('unavailable'); } });
  await assert.rejects(broken.init(), /could not start: unavailable/);
  const { engine, worker } = harness();
  await assert.rejects(engine.analyze({ fen:START, moves:['e2e4\ngo infinite'] }), /UCI moves/);
  await assert.rejects(engine.analyze({ fen:START, depth:0 }), /depth/);
  await assert.rejects(engine.analyze({ fen:START, moveTimeMs:Infinity }), /moveTimeMs/);
  assert.deepEqual(worker.commands, []); engine.dispose();
});
