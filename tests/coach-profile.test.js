import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGameReport, buildProfile, skills } from '../dist/js/coach-profile.js';
import { parseGame, terminalAnalysis } from '../dist/js/chess-review.js';
import { practiceDrills } from '../dist/js/practice-library.js';

const cp = (value = 0, bestMove = 'e2e4', pv = [bestMove]) => ({ score:{ type:'cp', value }, bestMove, pv, depth:18 });
const mate = (value, bestMove, pv = [bestMove]) => ({ score:{ type:'mate', value }, bestMove, pv, depth:18 });
const ready = pgn => { const game = parseGame(pgn); game.analyses = game.states.map(state => terminalAnalysis(state) || cp()); return game; };
const setup = (fen, moves) => `[SetUp "1"]\n[FEN "${fen}"]\n\n${moves}`;
const report = (id, index, ownMoves, incidents = []) => ({ version:1, completed:true, id, side:'white', firstReviewedAt:index, updatedAt:index,
  ownMoves, incidents, penalty:incidents.reduce((sum, incident) => sum + incident.cost, 0), score:100 - incidents.reduce((sum, incident) => sum + incident.cost, 0) / ownMoves, title:id, openingDrill:'italian' });
const incident = (skill, cost = 20) => ({ skill, cost, ply:1, move:'1. d4', reason:'Verified test fact.' });

test('only complete reviews with a confirmed side and its own moves can become reports', () => {
  const game = parseGame('1. e4');
  assert.throws(() => buildGameReport(game, null, 'quick'), /Choose which side/);
  assert.throws(() => buildGameReport(game, 'white', 'quick'), /Finish the full/);
  game.analyses = [cp(), cp(NaN)]; assert.throws(() => buildGameReport(game, 'white', 'quick'), /Finish the full/);
  game.analyses = [cp(), cp()]; assert.throws(() => buildGameReport(game, 'black', 'quick'), /no moves/);
});

test('opponent mistakes never lower the selected player score and Black evaluation is normalized', () => {
  const game = ready('1. e4 f6'); game.analyses = [cp(0, 'e2e4'), cp(0, 'e7e5'), cp(200, 'd2d4')];
  const white = buildGameReport(game, 'white', 'quick'), black = buildGameReport(game, 'black', 'quick');
  assert.equal(white.score, 100); assert.equal(white.incidents.length, 0); assert.equal(white.ownMoves, 1);
  assert.equal(black.score, 60); assert.equal(black.incidents[0].lossCp, 200); assert.equal(black.incidents[0].skill, 'opening');
});

test('allowed mate is highest severity, includes exact evidence and does not turn mate into centipawns', () => {
  const game = ready('1. f3 e5 2. g4 Qh4#');
  game.analyses[0] = cp(0, 'e2e4'); game.analyses[1] = cp(-20, 'e7e5'); game.analyses[2] = cp(-30, 'g1f3');
  game.analyses[3] = mate(-1, 'd8h4');
  const result = buildGameReport(game, 'white', 'quick');
  assert.equal(result.ownMoves, 2); assert.equal(result.score, 65); assert.equal(result.incidents.length, 1);
  assert.equal(result.incidents[0].skill, 'king'); assert.equal(result.incidents[0].cost, 70); assert.equal(result.incidents[0].lossCp, null);
  assert.equal(result.incidents[0].ply, 3); assert.equal(result.incidents[0].move, '2. g4');
});

test('losing a found mate is tracked but best-choice search fluctuations are not blamed', () => {
  const game = ready(setup('7k/5K2/8/6Q1/8/8/8/8 w - - 0 1', '1. Qg6'));
  game.analyses[0] = mate(1, 'g5h5');
  assert.equal(buildGameReport(game, 'white', 'quick').incidents[0].skill, 'finish');
  const changed = ready('1. d4'); changed.analyses = [mate(3, 'd2d4'), cp(150)];
  const result = buildGameReport(changed, 'white', 'quick'); assert.equal(result.score, 100); assert.deepEqual(result.incidents, []);
});

test('unrecapturable material losses are verified, equal exchanges do not become pieces-safety errors', () => {
  const game = ready(setup('3r2k1/5ppp/8/8/8/8/3R1PPP/6K1 w - - 0 1', '1. Kh1'));
  game.analyses = [cp(0, 'd2d8'), cp(-500, 'd8d2', ['d8d2'])];
  assert.equal(buildGameReport(game, 'white', 'quick').incidents[0].skill, 'pieces');
  const exchange = ready(setup('3r2k1/5ppp/8/8/8/8/3R1PPP/3R2K1 w - - 0 1', '1. Kh1'));
  exchange.analyses = [cp(0, 'd2d8'), cp(-150, 'd8d2', ['d8d2', 'd1d2'])];
  assert.notEqual(buildGameReport(exchange, 'white', 'quick').incidents[0].skill, 'pieces');
});

test('opening mistakes require a development/center/castling alternative and enough pieces on board', () => {
  const game = ready('1. h4'); game.analyses = [cp(0, 'e2e4'), cp(-100, 'd7d5')];
  assert.equal(buildGameReport(game, 'white', 'quick').incidents[0].skill, 'opening');
  const late = ready(setup('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 30', '30. Re2'));
  late.analyses = [cp(200, 'e1e8'), cp(0, 'g8f8')];
  assert.notEqual(buildGameReport(late, 'white', 'quick').incidents[0].skill, 'opening');
});

test('automatic draw from an advantage is conversion work; generic losses get an honest calculation label', () => {
  const game = ready(setup('7k/5K2/8/6Q1/8/8/8/8 w - - 0 1', '1. Qg6'));
  game.analyses[0] = cp(300, 'g5h5'); assert.equal(buildGameReport(game, 'white', 'quick').incidents[0].skill, 'conversion');
  const generic = ready('1. h4'); generic.analyses = [cp(0, 'g1h3'), cp(-100, 'a7a6', [])];
  // A developing alternative is real board evidence even when the played move has no tactical explanation.
  assert.equal(buildGameReport(generic, 'white', 'quick').incidents[0].skill, 'opening');
  generic.analyses[0] = cp(0, 'a2a3');
  assert.equal(buildGameReport(generic, 'white', 'quick').incidents[0].skill, 'calculation');
});

test('no data and clean games do not invent weaknesses or progress', () => {
  const empty = buildProfile([]); assert.equal(empty.score, null); assert.equal(empty.delta, null); assert.deepEqual(empty.priorities, []);
  const clean = buildProfile([report('clean', 1, 30)]); assert.equal(clean.score, 100); assert.equal(clean.provisional, true); assert.deepEqual(clean.priorities, []);
});

test('priorities weigh severity, repetition and recency rather than the number of times a game was opened', () => {
  const severe = buildProfile([report('a', 1, 10, [incident('opening', 10), incident('king', 70)])]);
  assert.equal(severe.priorities[0].key, 'king');
  const recurring = buildProfile([report('a', 1, 10, [incident('king', 70)]), ...[2,3,4].map(i => report(String(i), i, 10, [incident('pieces', 20)]))]);
  assert.equal(recurring.priorities[0].key, 'pieces'); assert.equal(recurring.priorities[0].games, 3);
  const replacement = report('a', 1, 10); const deduped = buildProfile([report('a', 1, 10, [incident('king', 70)]), replacement]);
  assert.equal(deduped.count, 1); assert.equal(deduped.score, 100); assert.deepEqual(deduped.priorities, []);
});

test('trend compares equal groups of distinct analyses and normalizes for your move count', () => {
  const profile = buildProfile([report('a', 1, 10, [incident('pieces', 60)]), report('b', 2, 100, [incident('pieces', 60)])]);
  assert.equal(profile.delta, 5); assert.equal(profile.windowSize, 1);
  assert.equal(profile.priorities[0].previousRate, 10); assert.equal(profile.priorities[0].recentRate, 1);
  assert.equal(profile.score, 99); // Weighted across 110 own moves, not a simple game-score average.
  assert.equal(profile.provisional, true);
});

test('only the latest ten unique reviews inform current priorities, scores use the latest five', () => {
  const reports = [report('old', 0, 20, [incident('king', 70)]), ...Array.from({ length:10 }, (_, i) => report(String(i), i + 1, 20))];
  const profile = buildProfile(reports); assert.deepEqual(profile.priorities, []); assert.equal(profile.score, 100);
  assert.equal(profile.count, 11); assert.equal(profile.windowSize, 5); assert.equal(profile.provisional, false);
});

test('every skill maps to available practice and opening recommendation follows the reviewed side', () => {
  for (const skill of Object.values(skills)) for (const id of skill.drills) assert.ok(practiceDrills.some(drill => drill.id === id), id);
  const game = ready('1. d4'); game.analyses = [cp(0, 'e2e4'), cp(-100, 'd7d5')];
  const saved = { ...buildGameReport(game, 'white', 'quick'), firstReviewedAt:1 };
  assert.deepEqual(buildProfile([saved]).priorities[0].drills, ['queens-gambit']);
});
