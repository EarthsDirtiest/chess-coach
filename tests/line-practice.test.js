import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../dist/vendor/chess.js/chess.js';
import { LinePractice } from '../dist/js/line-practice.js';
import { openingDrills, puzzleDrills, practiceDrills } from '../dist/js/practice-library.js';

const move = token => ({ from:token.slice(0, 2), to:token.slice(2, 4), promotion:token[4] });
const values = { p:1, n:3, b:3, r:5, q:9, k:0 };
const material = chess => chess.board().flat().filter(Boolean).reduce((sum, piece) => sum + (piece.color === 'w' ? 1 : -1) * values[piece.type], 0);

test('library has exactly thirty playable exercises in each category and unique IDs', () => {
  assert.equal(new Set(practiceDrills.map(drill => drill.id)).size, 90);
  for (const kind of ['opening', 'mate', 'puzzle']) assert.equal(practiceDrills.filter(drill => drill.kind === kind).length, 30);
});

test('each prepared exercise starts legally and can be completed with legal automatic replies', async () => {
  for (const drill of [...openingDrills, ...puzzleDrills]) {
    const board = new Chess(drill.fen);
    assert.equal(board.isAttacked(board.findPiece({ type:'k', color:board.turn() === 'w' ? 'b' : 'w' })[0], board.turn()), false, drill.id);
    const session = new LinePractice({ drill }); await session.start();
    assert.equal(session.state.status, 'player'); assert.equal(session.state.solution, null);
    assert.equal(session.state.attacker, drill.side);
    while (session.state.status === 'player') await session.play(move(drill.line[session.cursor]));
    assert.equal(session.state.status, 'won', drill.id);
    assert.match(session.state.message, drill.kind === 'opening' ? /Opening line complete/ : /Puzzle solved/);
    assert.equal(session.state.movesPlayed.length, drill.line.length);
    session.dispose();
  }
});

test('opening alternatives remain legal choices and are not falsely called chess mistakes', async () => {
  const session = new LinePractice({ drill:openingDrills[0] }); await session.start(); const fen = session.state.fen;
  await session.play(move('d2d4'));
  assert.equal(session.state.fen, fen); assert.equal(session.state.canUndo, false);
  assert.match(session.state.message, /legal move.*specific opening line/);
  await session.play(move('e2e4')); assert.equal(session.state.movesPlayed.length, 2);
  session.undoTurn(); assert.equal(session.state.fen, fen); session.dispose();
});

test('solutions stay hidden until requested and reset on a move, undo and restart', async () => {
  const session = new LinePractice({ drill:openingDrills[0] }); await session.start();
  const fen = session.state.fen; const solution = await session.revealSolution(); assert.equal(solution[0], 'e4');
  assert.equal(session.state.fen, fen); solution.push('fake'); assert.notEqual(session.state.solution.at(-1), 'fake');
  await session.play(move('e2e4')); assert.equal(session.state.solution, null);
  session.undoTurn(); assert.equal(session.state.solution, null);
  await session.revealSolution(); await session.restart(); assert.equal(session.state.solution, null); session.dispose();
});

test('Black opening begins with White’s prepared move and undo keeps that initial reply', async () => {
  const session = new LinePractice({ drill:openingDrills[2] }); await session.start();
  assert.deepEqual(session.state.movesPlayed, ['e4']); assert.equal(session.state.turn, 'black');
  await session.play(move('c7c5')); assert.deepEqual(session.state.movesPlayed, ['e4','c5','Nf3']);
  session.undoTurn(); assert.deepEqual(session.state.movesPlayed, ['e4']);
  await session.restart(); assert.deepEqual(session.state.movesPlayed, ['e4']); session.dispose();
});

test('puzzle captures really gain the advertised material and the fork checks king and attacks queen', () => {
  for (const drill of puzzleDrills.slice(0, 3)) for (const line of [drill.line, ...(drill.alternatives || [])]) {
    const chess = new Chess(drill.fen), before = material(chess);
    for (const token of line) chess.move(move(token));
    assert.ok(material(chess) - before >= (drill.id === 'pinned-knight' ? 3 : 9), drill.id);
    assert.equal(chess.isInsufficientMaterial(), false);
  }
  const fork = new Chess(puzzleDrills[0].fen); fork.move(move('d5f6'));
  assert.equal(fork.isCheck(), true); assert.equal(fork.isAttacked('h7', 'w'), true);
});

test('both safe captures in the pinned-knight puzzle are accepted', async () => {
  const session = new LinePractice({ drill:puzzleDrills[1] }); await session.start();
  await session.play(move('b5d7')); assert.equal(session.state.status, 'won');
  session.undoTurn(); await session.play(move('d1d7')); assert.equal(session.state.status, 'won'); session.dispose();
});

test('illegal moves, wrong puzzle answers and disposal cannot advance an exercise', async () => {
  const session = new LinePractice({ drill:puzzleDrills[2] }); await session.start();
  const fen = session.state.fen; await assert.rejects(session.play(move('d1e3')), /not legal/);
  await session.play(move('d1d2')); assert.equal(session.state.fen, fen);
  session.dispose(); await session.play(move('d1d5')); assert.equal(session.state.fen, fen); assert.equal(session.state.status, 'disposed');
});
