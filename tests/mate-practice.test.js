import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../dist/vendor/chess.js/chess.js';
import { MatePractice, getMateOpportunity } from '../dist/js/mate-practice.js';

const WHITE = '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1';
const BLACK = '4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1';
const TWO = '8/8/8/8/8/3K4/4Q3/k7 w - - 0 1';
const analysis = (value, pv) => ({ score:{ type:'mate', value }, pv, bestMove:pv[0], depth:20 });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
function practice(initialFen = WHITE, initial = analysis(1, ['e1e8']), results = []) {
  const calls = [], engines = [];
  const session = new MatePractice({ initialFen, analysis:initial, engineFactory:() => {
    const engine = { disposed:false, dispose() { this.disposed = true; }, async analyze(options) {
      calls.push(options); const next = results.shift(); if (next instanceof Error) throw next;
      return await next;
    } }; engines.push(engine); return engine;
  } });
  return { session, calls, engines };
}

test('mate entry uses White-normalized score and excludes pending, cp, mate zero and terminal positions', () => {
  assert.deepEqual(getMateOpportunity({}, analysis(-3, [])), { attacker:'black', mateIn:3 });
  for (const a of [null, { score:{ type:'cp', value:900 } }, analysis(0, []), { ...analysis(2, []), terminal:true }]) assert.equal(getMateOpportunity({}, a), null);
  assert.equal(getMateOpportunity({ terminal:true }, analysis(1, [])), null);
});

test('legal mate works for either color; no solution or review mutation occurs', async () => {
  for (const [fen, value, from, to] of [[WHITE, 1, 'e1', 'e8'], [BLACK, -1, 'e8', 'e1']]) {
    const source = analysis(value, [from + to]), snapshot = structuredClone(source), { session, calls } = practice(fen, source);
    await session.start(); assert.equal(session.state.status, 'player'); assert.equal(session.state.solution, null);
    await session.play({ from, to }); assert.equal(session.state.status, 'won'); assert.equal(calls.length, 0);
    assert.deepEqual(source, snapshot); assert.equal(session.undoTurn(), true); assert.equal(session.state.fen, fen);
    assert.equal(session.state.status, 'player'); session.dispose();
  }
});

test('solution is explicit, legal SAN, independent, and hidden again after restart', async () => {
  const { session } = practice(); await session.start(); assert.equal(session.state.solution, null);
  assert.deepEqual(await session.revealSolution(), ['Re8#']);
  const copy = session.state; copy.solution.push('spoiler'); assert.deepEqual(session.state.solution, ['Re8#']);
  await session.restart(); assert.equal(session.state.solution, null); assert.equal(session.state.fen, WHITE); session.dispose();
});

test('a truncated solution is extended on a separate board with the original history', async () => {
  const { session, calls } = practice(TWO, analysis(2, ['d3c3']), [analysis(1, ['a1b1', 'e2b2'])]);
  await session.start(); const original = session.state.fen;
  assert.deepEqual(await session.revealSolution(), ['Kc3', 'Kb1', 'Qb2#']);
  assert.equal(session.state.solutionComplete, true); assert.equal(session.state.fen, original);
  assert.deepEqual(session.state.movesPlayed, []); assert.deepEqual(calls[0].moves, ['d3c3']); session.dispose();
});

test('an unresolved solution prefix is labeled incomplete rather than inventing a mate', async () => {
  const { session } = practice(TWO, analysis(2, ['d3c3']), [{ score:{ type:'cp', value:900 }, pv:['a1b1'], bestMove:'a1b1' }]);
  await session.start(); assert.deepEqual(await session.revealSolution(), ['Kc3']);
  assert.equal(session.state.solutionComplete, false); assert.equal(session.state.fen, TWO); session.dispose();
});

test('alternative mating moves are accepted and defender replies from reanalysis', async () => {
  const { session, calls } = practice(TWO, analysis(2, ['d3c2', 'a1a2', 'e2a6']), [analysis(1, ['a1b1', 'e2b2'])]);
  await session.start(); await session.play({ from:'d3', to:'c3' });
  assert.equal(session.state.status, 'player'); assert.deepEqual(session.state.movesPlayed, ['Kc3', 'Kb1']);
  assert.deepEqual(calls[0].moves, ['d3c3']); assert.equal(calls[0].initialFen, TWO);
  await session.play({ from:'e2', to:'b2' }); assert.equal(session.state.status, 'won');
  session.undoTurn(); assert.deepEqual(session.state.movesPlayed, ['Kc3', 'Kb1']);
  session.undoTurn(); assert.equal(session.state.fen, TWO); assert.equal(session.state.canUndo, false); session.dispose();
});

test('defender can move first and undo preserves that opening defense', async () => {
  const chess = new Chess(TWO); chess.move('Kc3'); const fen = chess.fen();
  const { session } = practice(fen, analysis(1, ['a1b1', 'e2b2']));
  await session.start(); assert.deepEqual(session.state.movesPlayed, ['Kb1']); assert.equal(session.state.attacker, 'white');
  await session.play({ from:'e2', to:'b2' }); assert.equal(session.state.status, 'won');
  session.undoTurn(); assert.deepEqual(session.state.movesPlayed, ['Kb1']);
  await session.restart(); assert.deepEqual(session.state.movesPlayed, ['Kb1']); session.dispose();
});

test('illegal moves cannot mutate practice or advance its turn', async () => {
  const { session } = practice(); await session.start();
  await assert.rejects(session.play({ from:'e1', to:'f3' }), /not legal/);
  assert.equal(session.state.fen, WHITE); assert.equal(session.state.canUndo, false); session.dispose();
});

test('promotion supports underpromotion and requires an explicit legal choice', async () => {
  const fen = '7k/5P2/6K1/8/8/8/8/8 w - - 0 1';
  const { session } = practice(fen, analysis(1, ['f7f8q'])); await session.start();
  assert.equal(session.state.legalMoves.filter(move => move.from === 'f7' && move.to === 'f8').length, 4);
  await session.play({ from:'f7', to:'f8', promotion:'r' }); assert.equal(session.state.status, 'won');
  session.undoTurn(); await session.play({ from:'f7', to:'f8', promotion:'n' }); assert.equal(session.state.status, 'draw'); session.dispose();
});

test('stalemate is a draw, never a completed mating attack', async () => {
  const { session } = practice('7k/5K2/8/6Q1/8/8/8/8 w - - 0 1', analysis(1, ['g5h5']));
  await session.start(); await session.play({ from:'g5', to:'g6' });
  assert.equal(session.state.status, 'draw'); assert.match(session.state.message, /stalemate/); session.dispose();
});

test('unconfirmed mate is described honestly, can be undone, and does not auto-reveal the answer', async () => {
  const { session } = practice(WHITE, analysis(1, ['e1e8']), [{ score:{ type:'cp', value:450 }, pv:['g8f8'], bestMove:'g8f8', depth:20 }]);
  await session.start(); await session.play({ from:'e1', to:'e2' });
  assert.equal(session.state.status, 'lost-mate'); assert.match(session.state.message, /haven’t confirmed/);
  assert.equal(session.state.solution, null); session.undoTurn(); assert.equal(session.state.fen, WHITE); session.dispose();
});

test('return/dispose during calculation ignores stale replies and terminates the engine', async () => {
  const pending = deferred(), { session, engines } = practice(TWO, analysis(2, ['d3c2']), [pending.promise]);
  await session.start(); const playing = session.play({ from:'d3', to:'c3' }); await tick();
  assert.equal(session.state.status, 'thinking'); session.dispose(); assert.equal(engines[0].disposed, true);
  pending.resolve(analysis(1, ['a1b1', 'e2b2'])); await playing;
  assert.equal(session.state.status, 'disposed'); assert.deepEqual(session.state.movesPlayed, ['Kc3']);
});

test('undo and restart invalidate searches even if a disposed engine resolves late', async () => {
  const pending = deferred(), { session } = practice(TWO, analysis(2, ['d3c2']), [pending.promise]);
  await session.start(); const playing = session.play({ from:'d3', to:'c3' }); await tick();
  session.undoTurn(); await session.restart(); pending.resolve(analysis(1, ['a1b1', 'e2b2'])); await playing;
  assert.equal(session.state.fen, TWO); assert.equal(session.state.status, 'player'); assert.equal(session.state.solution, null); session.dispose();
});

test('engine failure preserves the returnable position and restart recovers', async () => {
  const { session } = practice(TWO, analysis(2, ['d3c2']), [new Error('Offline worker')]);
  await session.start(); await session.play({ from:'d3', to:'c3' });
  assert.equal(session.state.status, 'error'); assert.match(session.state.message, /Offline worker/);
  await session.restart(); assert.equal(session.state.fen, TWO); assert.equal(session.state.status, 'player'); session.dispose();
});

test('full original history is retained in practice searches and remains untouched', async () => {
  const chess = new Chess(TWO), moves = ['d3c3']; chess.move('Kc3');
  const calls = [], session = new MatePractice({ initialFen:TWO, moves, analysis:analysis(1, ['a1b1', 'e2b2']), engineFactory:() => ({ dispose() {}, async analyze(value) { calls.push(value); return analysis(1, ['a1a2']); } }) });
  await session.start(); await session.play({ from:'e2', to:'e1' });
  assert.deepEqual(moves, ['d3c3']); assert.deepEqual(calls[0].moves, ['d3c3', 'a1b1', 'e2e1']); session.dispose();
});

test('claimable fifty-move draw permits an attacker to mate but defender claims after a quiet move', async () => {
  const fen = WHITE.replace('0 1', '100 1'), { session } = practice(fen);
  await session.start(); assert.equal(session.state.status, 'player');
  await session.play({ from:'e1', to:'e8' }); assert.equal(session.state.status, 'won');
  session.undoTurn(); await session.play({ from:'e1', to:'e2' });
  assert.equal(session.state.status, 'draw'); assert.match(session.state.message, /defender can claim.*fifty/); session.dispose();
});

test('automatic seventy-five-move draw cannot start a mate challenge', () => {
  assert.throws(() => practice(WHITE.replace('0 1', '150 1')), /live forced-mate/);
});

test('repetition history allows the attacker to continue a claimable draw but fivefold ends practice', async () => {
  const cycle = ['e1e2', 'g8f8', 'e2e1', 'f8g8'];
  const session = new MatePractice({ initialFen:WHITE, moves:[...cycle, ...cycle], analysis:analysis(1, ['e1e8']) });
  await session.start(); assert.equal(session.state.status, 'player');
  await session.play({ from:'e1', to:'e8' }); assert.equal(session.state.status, 'won'); session.dispose();
  assert.throws(() => new MatePractice({ initialFen:WHITE, moves:Array(4).fill(cycle).flat(), analysis:analysis(1, ['e1e8']) }), /live forced-mate/);
});
