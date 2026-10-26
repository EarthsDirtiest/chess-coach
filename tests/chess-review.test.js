import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGame, terminalAnalysis, coachMove, lineToSan, moveLoss, summarizeGame, formatScore } from '../dist/js/chess-review.js';

const result = (value, bestMove = 'e2e4', pv = [bestMove]) => ({ score: { type: 'cp', value }, bestMove, pv, depth: 16 });

test('PGN replay tracks legal en passant, castling, full FEN and UCI history', () => {
  const ep = parseGame('1. e4 a6 2. e5 d5 3. exd6');
  assert.equal(ep.states[4].fen.split(' ')[3], 'd6');
  assert.equal(ep.states[5].board[3][3], '.');
  assert.equal(ep.states[5].move.captured, 'p');
  assert.deepEqual(ep.states[5].uciMoves, ['e2e4', 'a7a6', 'e4e5', 'd7d5', 'e5d6']);
  const castle = parseGame('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O');
  assert.equal(castle.states[7].board[7][5], 'R');
  assert.equal(castle.states[7].board[7][6], 'K');
  assert.equal(castle.states[7].fen.split(' ')[2], 'kq');
});

test('rejects illegal en passant and castling rather than inventing a position', () => {
  assert.throws(() => parseGame('1. e4 a6 2. e5 d5 3. Nf3 a5 4. exd6'), /Could not read/);
  assert.throws(() => parseGame('1. e4 e5 2. O-O'), /Could not read/);
});

test('black to move FEN games keep move numbers, promotions, and side', () => {
  const game = parseGame('[SetUp "1"]\n[FEN "7k/8/8/8/8/8/1p6/7K b - - 0 42"]\n\n42... b1=Q+ 43. Kh2');
  assert.equal(game.states[1].moveNumber, 42);
  assert.equal(game.states[1].black, true);
  assert.equal(game.states[1].move.promoted, true);
  assert.equal(game.states[1].board[7][1], 'q');
  assert.equal(game.states[2].moveNumber, 43);
  assert.equal(game.states[2].black, false);
});

test('PGN annotations and nested variations do not change the main line', () => {
  const game = parseGame('1. e4 {hello} e5 (1... c5 (1... e6)) 2. Nf3 $1 Nc6 *');
  assert.deepEqual(game.history, ['e4', 'e5', 'Nf3', 'Nc6']);
});

test('terminal analysis identifies mate, stalemate, material and history draws', () => {
  const mate = parseGame('1. f3 e5 2. g4 Qh4#');
  const terminal = terminalAnalysis(mate.states[4]);
  assert.equal(terminal.score.winner, 'black');
  assert.equal(formatScore(terminal.score), 'Black wins by mate');
  assert.equal(terminalAnalysis(mate.states[3]), null);
  const stalemate = parseGame('[SetUp "1"]\n[FEN "7k/5K2/8/6Q1/8/8/8/8 w - - 0 1"]\n\n1. Qg6');
  assert.equal(stalemate.states[1].drawReason, 'stalemate');
  assert.equal(terminalAnalysis(stalemate.states[1]).score.value, 0);
  const repetition = parseGame('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8');
  assert.equal(repetition.states[8].claimableDrawReason, 'threefold repetition');
  assert.equal(terminalAnalysis(repetition.states[8]), null);
  const insufficient = parseGame('[SetUp "1"]\n[FEN "7k/8/8/8/8/1n6/2B5/K7 w - - 0 1"]\n\n1. Bxb3');
  assert.equal(insufficient.states[1].drawReason, 'insufficient mating material');
  const fifty = parseGame('[SetUp "1"]\n[FEN "7k/8/8/8/8/8/R7/K7 w - - 99 1"]\n\n1. Rb2');
  assert.equal(fifty.states[1].claimableDrawReason, 'the fifty-move rule');
});

test('move loss uses the mover perspective and does not penalize engine best moves', () => {
  assert.equal(moveLoss(result(20), result(-180), 'white', 'd2d4'), 200);
  assert.equal(moveLoss(result(20), result(220), 'black', 'g8f6'), 200);
  assert.equal(moveLoss(result(20), result(-180), 'white', 'e2e4'), 0);
  assert.equal(moveLoss(result(20), result(80), 'white', 'd2d4'), 0);
  assert.equal(moveLoss(result(0), null, 'white', 'd2d4'), null);
});

test('mate transitions are not converted to fake centipawns', () => {
  const mate = value => ({ score: { type: 'mate', value }, bestMove: 'e2e4' });
  assert.equal(moveLoss(mate(4), mate(6), 'white', 'd2d4'), 0);
  assert.equal(moveLoss(mate(4), result(500), 'white', 'd2d4'), null);
  assert.equal(moveLoss(result(0), mate(-3), 'white', 'd2d4'), null);
});

test('coach does not grade pending positions and summary counts completed pairs only', () => {
  const game = parseGame('1. d4 d5');
  assert.equal(coachMove(game, 1).level, 'Pending');
  game.analyses[0] = result(20);
  game.analyses[1] = result(-250, 'd7d5', ['d7d5', 'c2c4']);
  assert.equal(coachMove(game, 1).level, 'Blunder');
  assert.equal(coachMove(game, 1).bestMoveSan, 'e4');
  assert.match(coachMove(game, 1).body, /best calculated reply is d5/);
  assert.deepEqual(summarizeGame(game, 'white'), { reviewed: 1, total: 1, mistakes: 0, blunders: 1, averageLossCp: 270 });
  assert.equal(summarizeGame(game, 'black').reviewed, 0);
});

test('PV notation follows legal moves including promotion; invalid PV is truncated', () => {
  const game = parseGame('1. e4 e5');
  assert.deepEqual(lineToSan(game.initialFen, ['e2e4', 'e7e5', 'g1f3', 'bad']), ['e4', 'e5', 'Nf3']);
  assert.deepEqual(lineToSan('7k/P7/8/8/8/8/8/7K w - - 0 1', ['a7a8q']), ['a8=Q+']);
  assert.equal(formatScore({ type: 'mate', value: -3 }), '−M3');
});

const setupGame = (fen, moves = '1. Rb2') => `[SetUp "1"]\n[FEN "${fen}"]\n\n${moves}`;
test('rejects illegal setup positions before sending them to Stockfish', () => {
  assert.throws(() => parseGame(setupGame('4k3/8/8/8/8/8/4R3/4K3 w - - 0 1', '1. Re3')), /side not to move in check/);
  assert.throws(() => parseGame(setupGame('4k3/8/8/8/8/8/8/4K3 w K - 0 1', '1. O-O')), /castling without/);
  assert.throws(() => parseGame(setupGame('4k3/8/8/8/8/8/8/4K2R w KK - 0 1', '1. Rh2')), /repeated castling/);
  assert.throws(() => parseGame(setupGame('7k/8/8/8/8/P7/PPPPPPPP/4K3 w - - 0 1', '1. Kf1')), /eight pawns/);
  assert.throws(() => parseGame(setupGame('7k/8/8/8/8/QQ6/PPPPPPPP/4K3 w - - 0 1', '1. Qc3')), /promoted pieces/);
  assert.throws(() => parseGame(setupGame('rnbqkbnr/pppppppp/8/8/8/Q7/PPPPPPPP/RNBQKBNR w KQkq - 0 1', '1. e4')), /32 pieces/);
  assert.throws(() => parseGame(setupGame('7k/8/8/8/8/8/R7/K7 w - - 40000 1')), /half-move counter/);
  assert.throws(() => parseGame(setupGame('7k/8/8/8/8/8/R7/K7 w - - 0 100001')), /full-move number/);
  assert.throws(() => parseGame(setupGame('7k/8/8/8/8/8/R7/K7 w - - 0x 1')), /half-move counter/);
  assert.equal(parseGame(setupGame('7k/8/8/8/8/QQ6/PPPPPPP1/4K3 w - - 0 1', '1. Qc3')).states.length, 2);
});
test('claimable draws can continue while automatic draws end the game', () => {
  const continued = parseGame('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 5. e4');
  assert.equal(continued.states[8].terminal, false);
  assert.equal(terminalAnalysis(continued.states[8]), null);
  assert.equal(continued.states[9].claimableDrawReason, null);
  assert.match(coachMove(continued, 8).body, /White can claim a draw/);
  const repeated = '1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 5. Nf3 Nf6 6. Ng1 Ng8 7. Nf3 Nf6 8. Ng1 Ng8';
  const fivefold = parseGame(repeated);
  assert.equal(fivefold.states[16].drawReason, 'fivefold repetition');
  assert.equal(terminalAnalysis(fivefold.states[16]).score.value, 0);
  assert.throws(() => parseGame(repeated + ' 9. e4'), /after the game has ended/);
  const seventyFive = parseGame(setupGame('7k/8/8/8/8/8/R7/K7 w - - 149 1'));
  assert.equal(seventyFive.states[1].drawReason, 'the seventy-five-move rule');
  const mate = parseGame(setupGame('7k/5K2/8/6Q1/8/8/8/8 w - - 149 1', '1. Qh5#'));
  assert.equal(mate.states[1].checkmate, true);
  assert.equal(mate.states[1].drawReason, null);
});
test('stalemating a won position retains the error grade and summary count', () => {
  const game = parseGame(setupGame('7k/5K2/8/6Q1/8/8/8/8 w - - 0 1', '1. Qg6'));
  game.analyses[0] = { score:{ type:'mate', value:1 }, bestMove:'g5h5', pv:['g5h5'], depth:16 };
  game.analyses[1] = terminalAnalysis(game.states[1]);
  const coach = coachMove(game, 1);
  assert.equal(coach.level, 'Blunder'); assert.equal(coach.outcome, 'Draw'); assert.equal(coach.lossCp, null);
  assert.match(coach.body, /drawn by stalemate/); assert.equal(summarizeGame(game, 'white').blunders, 1);
  game.analyses[0] = result(150, 'g5h5', ['g5h5']);
  assert.equal(coachMove(game, 1).level, 'Mistake'); assert.equal(summarizeGame(game, 'white').mistakes, 1);
});
test('mate zero preserves each winner; incomplete analysis stays pending', () => {
  const white = parseGame('1. e4 f6 2. d4 g5 3. Qh5#'), black = parseGame('1. f3 e5 2. g4 Qh4#');
  assert.equal(formatScore(terminalAnalysis(white.states[5]).score), 'White wins by mate');
  assert.equal(formatScore(terminalAnalysis(black.states[4]).score), 'Black wins by mate');
  const game = parseGame('1. d4'); game.analyses[0] = result(0); game.analyses[1] = { depth:2 };
  assert.equal(coachMove(game, 1).level, 'Pending'); assert.equal(summarizeGame(game, 'white').reviewed, 0);
});
test('reply explanations describe verified captures and checkmate', () => {
  const game = parseGame(setupGame('3r2k1/5ppp/8/8/8/8/3R1PPP/6K1 w - - 0 1', '1. Kh1'));
  game.analyses[0] = result(0, 'd2d8', ['d2d8']); game.analyses[1] = result(-500, 'd8d2', ['d8d2']);
  assert.match(coachMove(game, 1).body, /capturing the rook/);
  const mate = parseGame('1. f3 e5 2. g4');
  mate.analyses[2] = result(-100, 'g1f3', ['g1f3']);
  mate.analyses[3] = { score:{ type:'mate', value:-1 }, bestMove:'d8h4', pv:['d8h4'], depth:16 };
  assert.match(coachMove(mate, 3).body, /delivering checkmate/);
});
