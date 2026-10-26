import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGame, coachMove, terminalAnalysis } from '../dist/js/chess-review.js';

const analysis = (value, bestMove, pv = [bestMove]) => ({ score:{ type:'cp', value }, bestMove, pv, depth:16 });
const setup = (fen, moves) => `[SetUp "1"]\n[FEN "${fen}"]\n\n${moves}`;
const jargon = /Stockfish|evaluation|centipawn|searched depth|first choice|preferred play|close to/i;

test('a bad move names the exposed piece, the reply and a better move', () => {
  const game = parseGame(setup('3r2k1/5pp1/8/8/8/8/3R1PPP/6K1 w - - 0 1', '1. Kh1'));
  game.analyses[0] = analysis(300, 'd2d8'); game.analyses[1] = analysis(-500, 'd8d2');
  const note = coachMove(game, 1, 'white');
  assert.match(note.body, /You played Kh1, but this lets Black take your rook on d2 with Rxd2/);
  assert.match(note.body, /Try Rxd8\+ instead: it takes their rook on d8 with check/);
  assert.match(note.body, /check the opponent’s captures and whether you can recapture/);
  assert.doesNotMatch(note.body, jargon);
});
test('switching sides changes pronouns and advice without stale cached text', () => {
  const game = parseGame(setup('3r2k1/5pp1/8/8/8/8/3R1PPP/6K1 w - - 0 1', '1. Kh1'));
  game.analyses[0] = analysis(300, 'd2d8'); game.analyses[1] = analysis(-500, 'd8d2');
  assert.match(coachMove(game, 1, 'white').body, /take your rook/);
  const black = coachMove(game, 1, 'black');
  assert.match(black.body, /White played Kh1, but this lets you take their rook/);
  assert.match(black.body, /White could have played Rxd8\+ instead/);
  assert.doesNotMatch(black.body, /Try Rxd8\+|take your rook/);
  assert.match(coachMove(game, 1, 'white').body, /take your rook/);
});
test('a legal recapture prevents a false hanging-piece explanation', () => {
  const game = parseGame(setup('3r2k1/5ppp/8/8/8/8/3R1PPP/3K4 w - - 0 1', '1. Kc1'));
  game.analyses[0] = analysis(100, 'd2d8'); game.analyses[1] = analysis(-200, 'd8d2', ['d8d2','c1d2']);
  assert.doesNotMatch(coachMove(game, 1, 'white').body, /but this lets Black take your rook|lose.*rook|gives away/);
});
test('an equal exchange is not presented as a free lost bishop', () => {
  const game = parseGame('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6');
  game.analyses[6] = analysis(200, 'b5a4'); game.analyses[7] = analysis(0, 'd7c6');
  const note = coachMove(game, 7, 'white');
  assert.doesNotMatch(note.body, /but this lets Black take your bishop|lose.*bishop|for free/);
  assert.doesNotMatch(note.body, jargon);
});
test('mate warning describes the actual checkmate and gives an alternative', () => {
  const game = parseGame('1. f3 e5 2. g4');
  game.analyses[2] = analysis(-100, 'g1h3');
  game.analyses[3] = { score:{ type:'mate', value:-1 }, bestMove:'d8h4', pv:['d8h4'], depth:16 };
  const note = coachMove(game, 3, 'white');
  assert.match(note.body, /You played g4.*Black a forced mating attack/);
  assert.match(note.body, /Qh4#, checkmating your king/);
  assert.match(note.body, /Try Nh3 instead/);
  assert.doesNotMatch(note.body, /opens.*diagonal|evaluation|Stockfish/);
});
test('stalemate explains the distinction from mate and the winning alternative', () => {
  const game = parseGame(setup('7k/5K2/8/6Q1/8/8/8/8 w - - 0 1', '1. Qg6'));
  game.analyses[0] = { score:{ type:'mate', value:1 }, bestMove:'g5h5', pv:['g5h5'], depth:16 };
  game.analyses[1] = terminalAnalysis(game.states[1]);
  const note = coachMove(game, 1, 'white');
  assert.equal(note.level, 'Blunder');
  assert.match(note.body, /no legal move but not in check.*stalemate/);
  assert.match(note.body, /Try Qh5# instead: it checkmates their king/);
  assert.doesNotMatch(note.body, jargon);
});
test('a good sacrifice is not called wrong because of a short material deficit', () => {
  const game = parseGame('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7');
  game.analyses[10] = analysis(80, 'g5f7');
  game.analyses[11] = analysis(70, 'e8f7', ['e8f7','d1f3','f7e6','b1c3']);
  const note = coachMove(game, 11, 'white');
  assert.equal(note.level, 'Best move');
  assert.match(note.body, /After Kxf7, Qf3\+ comes with check/);
  assert.doesNotMatch(note.body, /wrong|mistake|lose.*knight|gives away|for free/);
});
test('quiet alternatives teach development without inventing a tactic', () => {
  const game = parseGame('1. e4 e5 2. Nf3 Nc6 3. a3');
  game.analyses[4] = analysis(20, 'f1b5'); game.analyses[5] = analysis(-130, 'g8f6', ['g8f6','f1b5','f8c5']);
  const note = coachMove(game, 5, 'white');
  assert.match(note.body, /Try Bb5 instead: it brings your bishop off the back rank and attacks their knight on c6/);
  assert.doesNotMatch(note.body, /fork|pin|wins.*knight|hanging|lost material/);
  assert.doesNotMatch(note.body, jargon);
});
test('en passant does not describe a pawn as hanging on the empty destination square', () => {
  const game = parseGame('1. e4 a6 2. e5 d5');
  game.analyses[3] = analysis(0, 'a6a5');
  game.analyses[4] = analysis(200, 'e5d6', ['e5d6','e7d6']);
  const note = coachMove(game, 4, 'black');
  assert.match(note.body, /White can capture en passant with exd6/);
  assert.doesNotMatch(note.body, /pawn on d6|hanging|lose.*pawn|for free/);
});
test('best moves are praised for a concrete benefit and pending moves get no verdict', () => {
  const game = parseGame('1. e4 e5 2. Nf3');
  assert.equal(coachMove(game, 3, 'white').level, 'Pending');
  assert.doesNotMatch(coachMove(game, 3, 'white').body, /wrong|Good choice|mistake/);
  game.analyses[2] = analysis(25, 'g1f3'); game.analyses[3] = analysis(20, 'b8c6');
  const note = coachMove(game, 3, 'white');
  assert.match(note.body, /Good choice: Nf3 brings your knight off the back rank and attacks their pawn on e5/);
  assert.doesNotMatch(note.body, jargon);
});
test('changed mate detection does not blame a move that matched the previous first choice', () => {
  const game = parseGame('1. e4');
  game.analyses[0] = { score:{ type:'mate', value:5 }, bestMove:'e2e4', pv:['e2e4'], depth:16 };
  game.analyses[1] = analysis(400, 'e7e5');
  let note = coachMove(game, 1, 'white');
  assert.equal(note.level, 'Best move');
  assert.match(note.body, /follow-up line no longer shows a forced mate/);
  assert.doesNotMatch(note.body, /but there was a way|Try .*instead|wrong|mistake/);
  game.analyses[1] = { score:{ type:'mate', value:-5 }, bestMove:'e7e5', pv:['e7e5'], depth:16 };
  note = coachMove(game, 1, 'white');
  assert.equal(note.level, 'Best move');
  assert.match(note.body, /follow-up line now shows a mating threat for Black/);
  assert.doesNotMatch(note.body, /but this gives|Try .*instead|wrong|mistake/);
});
test('a pinned piece is not praised for an illegal threat to the queen', () => {
  const game = parseGame(setup('4r1k1/5ppp/8/8/8/7q/4R3/4K3 w - - 0 1', '1. Kd1'));
  game.analyses[0] = analysis(0, 'e2e3'); game.analyses[1] = analysis(-200, 'g7g6');
  const note = coachMove(game, 1, 'white');
  assert.match(note.body, /Try Re3 instead/);
  assert.doesNotMatch(note.body, /attacks their queen|wins.*queen|open e-file/);
});
