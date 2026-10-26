import { Chess } from '../vendor/chess.js/chess.js';

const coordinates = square => ['abcdefgh'.indexOf(square[0]), 8 - Number(square[1])];
const pieceChar = (type, color) => color === 'w' ? type.toUpperCase() : type;
const uci = move => move.from + move.to + (move.promotion || '');

function validateInitialFen(fen) {
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) throw new Error('The setup FEN must contain all six fields.');
  const [, turn, castling, , halfmove, fullmove] = fields;
  if (!/^\d+$/.test(halfmove) || Number(halfmove) > 32767) throw new Error('The setup FEN half-move counter must be an integer from 0 to 32767.');
  const gamePly = 2 * (Number(fullmove) - 1) + (turn === 'b' ? 1 : 0);
  if (!/^\d+$/.test(fullmove) || Number(fullmove) < 1 || !Number.isSafeInteger(gamePly) || gamePly > 100000) throw new Error('The setup FEN full-move number is outside Stockfish’s supported range.');
  if (!/^(?:-|[KQkq]{1,4})$/.test(castling) || new Set(castling).size !== castling.length) throw new Error('The setup FEN has invalid or repeated castling rights.');
  const chess = new Chess(fen);
  const counts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };
  const pieces = chess.board().flat().filter(Boolean);
  if (pieces.length > 32) throw new Error('The setup FEN has more than 32 pieces.');
  for (const piece of pieces) counts[piece.color][piece.type]++;
  for (const color of ['w', 'b']) {
    const count = counts[color];
    if (count.p > 8) throw new Error('The setup FEN has more than eight pawns for one side.');
    const promotions = Math.max(0, count.q - 1) + Math.max(0, count.r - 2) + Math.max(0, count.b - 2) + Math.max(0, count.n - 2);
    if (promotions > 8 - count.p) throw new Error('The setup FEN has more promoted pieces than its missing pawns allow.');
  }
  for (const [right, kingSquare, rookSquare, color] of [ ['K','e1','h1','w'], ['Q','e1','a1','w'], ['k','e8','h8','b'], ['q','e8','a8','b'] ]) {
    if (!castling.includes(right)) continue;
    const king = chess.get(kingSquare), rook = chess.get(rookSquare);
    if (king?.type !== 'k' || king.color !== color || rook?.type !== 'r' || rook.color !== color) throw new Error('The setup FEN grants castling without the king and rook on their starting squares.');
  }
  const other = turn === 'w' ? 'b' : 'w';
  if (chess.isAttacked(chess.findPiece({ type: 'k', color: other })[0], turn)) throw new Error('The setup FEN has the king of the side not to move in check.');
}

function snapshot(chess, ply, lastMove, uciMoves, positionCounts) {
  const fen = chess.fen(), checkmate = chess.isCheckmate();
  const key = fen.split(' ').slice(0, 4).join(' ');
  const repetitionCount = (positionCounts.get(key) || 0) + 1;
  positionCounts.set(key, repetitionCount);
  let drawReason = null, claimableDrawReason = null;
  if (!checkmate) {
    if (chess.isStalemate()) drawReason = 'stalemate';
    else if (chess.isInsufficientMaterial()) drawReason = 'insufficient mating material';
    else if (repetitionCount >= 5) drawReason = 'fivefold repetition';
    else if (Number(fen.split(' ')[4]) >= 150) drawReason = 'the seventy-five-move rule';
    else if (repetitionCount >= 3) claimableDrawReason = 'threefold repetition';
    else if (chess.isDrawByFiftyMoves()) claimableDrawReason = 'the fifty-move rule';
  }
  return {
    board: chess.board().map(row => row.map(piece => piece ? pieceChar(piece.type, piece.color) : '.')),
    fen,
    ply,
    san: lastMove?.san || 'Start',
    black: lastMove ? lastMove.color === 'b' : chess.turn() !== 'b',
    moveNumber: Number((lastMove?.before || chess.fen()).split(' ')[5]),
    move: lastMove ? {
      from: coordinates(lastMove.from), to: coordinates(lastMove.to),
      piece: pieceChar(lastMove.piece, lastMove.color),
      captured: lastMove.captured ? pieceChar(lastMove.captured, lastMove.color === 'w' ? 'b' : 'w') : '.',
      castle: lastMove.isKingsideCastle() || lastMove.isQueensideCastle(),
      promoted: Boolean(lastMove.promotion), uci: uci(lastMove),
    } : null,
    uciMoves: [...uciMoves],
    turn: chess.turn() === 'w' ? 'white' : 'black',
    check: chess.isCheck(), checkmate, drawReason, claimableDrawReason,
    terminal: checkmate || Boolean(drawReason),
  };
}

export function parseGame(input) {
  if (!input.trim()) throw new Error('Paste a PGN with moves to review.');
  if (input.length > 200000) throw new Error('This PGN is too large. Paste one game at a time.');
  const parsed = new Chess();
  try {
    parsed.loadPgn(input);
    for (const [name, fen] of Object.entries(parsed.getHeaders())) {
      if (name.toLowerCase() === 'fen') validateInitialFen(fen);
    }
  }
  catch (error) { throw new Error(`Could not read this PGN: ${error.message}`); }
  const history = parsed.history({ verbose: true });
  if (!history.length) throw new Error('No moves found. Paste a PGN including the moves.');
  if (history.length > 1000) throw new Error('This game has more than 1000 half-moves.');
  const initialFen = history[0].before;
  const chess = new Chess(initialFen);
  const moves = [], positionCounts = new Map();
  const states = [snapshot(chess, 0, null, moves, positionCounts)];
  for (const original of history) {
    if (states.at(-1).terminal) throw new Error('Could not read this PGN: moves continue after the game has ended.');
    // Replay with full rules and history so castling, en passant and draws are accurate.
    const move = chess.move({ from: original.from, to: original.to, promotion: original.promotion });
    moves.push(uci(move));
    states.push(snapshot(chess, states.length, move, moves, positionCounts));
  }
  const headers = Object.fromEntries(Object.entries(parsed.getHeaders()).filter(([, value]) => value !== '?'));
  return { headers, initialFen, history: history.map(move => move.san), states, analyses: states.map(() => null) };
}

export function terminalAnalysis(state) {
  if (!state.terminal) return null;
  const winner = state.turn === 'white' ? 'black' : 'white';
  return {
    score: state.checkmate ? { type: 'mate', value: winner === 'white' ? 0 : -0, winner } : { type: 'cp', value: 0 },
    bestMove: null, pv: [], depth: 0, terminal: true,
  };
}

export function formatScore(score) {
  if (!score) return '—';
  if (score.type === 'mate') {
    if (score.value === 0) return `${score.winner === 'white' ? 'White' : 'Black'} wins by mate`;
    return `${score.value > 0 ? '+' : '−'}M${Math.abs(score.value)}`;
  }
  return `${score.value > 0 ? '+' : ''}${(score.value / 100).toFixed(2)}`;
}

function mateWinner(score) {
  return score.type === 'mate' ? (score.winner || (score.value > 0 ? 'white' : 'black')) : null;
}

export function moveLoss(before, after, mover, playedUci) {
  if (!before?.score || !after?.score) return null;
  if (before.bestMove === playedUci) return 0;
  const beforeWinner = mateWinner(before.score), afterWinner = mateWinner(after.score);
  // Distance-to-mate changes aren't pawn losses, and must not inflate average centipawn loss.
  if (beforeWinner || afterWinner) {
    if (beforeWinner === afterWinner) return 0;
    if (beforeWinner === mover || (afterWinner && afterWinner !== mover)) return null;
    return 0;
  }
  const direction = mover === 'white' ? 1 : -1;
  return Math.max(0, Math.round(direction * (before.score.value - after.score.value)));
}

export function lineToSan(fen, line = [], limit = 8) {
  const chess = new Chess(fen), result = [];
  for (const token of line.slice(0, limit)) {
    try {
      const move = chess.move({ from: token.slice(0, 2), to: token.slice(2, 4), promotion: token[4] });
      result.push(move.san);
    } catch { break; }
  }
  return result;
}

const coachCache = new WeakMap();
export function coachMove(game, ply) {
  let cache = coachCache.get(game);
  if (!cache) { cache = []; coachCache.set(game, cache); }
  const before = game.analyses[Math.max(0, ply - 1)], after = game.analyses[ply], entry = cache[ply];
  if (entry && entry.before === before && entry.after === after) return entry.value;
  const value = calculateCoachMove(game, ply);
  cache[ply] = { before, after, value };
  return value;
}

function calculateCoachMove(game, ply) {
  const state = game.states[ply], before = game.analyses[Math.max(0, ply - 1)], after = game.analyses[ply];
  const title = ply ? `${state.moveNumber}${state.black ? '...' : '.'} ${state.san}` : 'Starting position';
  const outcome = state.checkmate ? 'Checkmate' : state.drawReason ? 'Draw' : null;
  const drawClaim = state.claimableDrawReason ? ` ${state.turn === 'white' ? 'White' : 'Black'} can claim a draw by ${state.claimableDrawReason}; play may continue if no claim is made.` : '';
  const base = { title, outcome, critical: [], bestMoveSan: null, pvSan: [], lossCp: null };
  if (!ply) {
    if (!after?.score) return { ...base, level: 'Pending', body: 'Stockfish has not evaluated the starting position yet.' + drawClaim };
    const pvSan = lineToSan(state.fen, after.pv);
    return { ...base, pvSan, bestMoveSan: pvSan[0] || null, level: 'Position', body: `Stockfish evaluates this position as ${formatScore(after.score)} from White’s perspective. Choose a move to compare it with the engine’s recommendation.` + drawClaim };
  }
  if (!before?.score || !after?.score) return { ...base, level: 'Pending', body: 'Awaiting Stockfish analysis of the positions before and after this move. Keep exploring the board while the review runs.' + drawClaim };
  const mover = state.black ? 'black' : 'white';
  const pvSan = lineToSan(game.states[ply - 1].fen, before.pv);
  const bestMoveSan = lineToSan(game.states[ply - 1].fen, before.bestMove ? [before.bestMove] : [])[0] || null;
  const lossCp = moveLoss(before, after, mover, state.move.uci);
  const lostMate = mateWinner(before.score) === mover && mateWinner(after.score) !== mover;
  const allowsMate = mateWinner(after.score) && mateWinner(after.score) !== mover && mateWinner(before.score) !== mateWinner(after.score);
  const best = before.bestMove === state.move.uci;
  let level = best ? 'Best move' : lostMate || allowsMate || lossCp >= 200 ? 'Blunder' : lossCp >= 100 ? 'Mistake' : lossCp >= 50 ? 'Inaccuracy' : 'Good move';
  const sentences = [];
  if (best) sentences.push('You played Stockfish’s first choice at the searched depth.');
  else if (allowsMate) sentences.push('This move allows a forced checkmate in Stockfish’s searched line.');
  else if (lostMate) sentences.push('Stockfish found a forced mate before this move; that mate is no longer found after your choice.');
  else if (lossCp >= 50) sentences.push(`This move gives up about ${(lossCp / 100).toFixed(2)} pawns of evaluation compared with the position before it.`);
  else sentences.push('This move keeps the evaluation close to Stockfish’s preferred play at this search depth.');
  if (bestMoveSan && !best) sentences.push(`Consider ${bestMoveSan} instead. Replay the calculated line to compare the responses.`);
  if (state.checkmate) { level = 'Checkmate'; sentences.push(`${mover === 'white' ? 'White' : 'Black'} delivers checkmate.`); }
  else if (state.drawReason) { if (!['Blunder', 'Mistake', 'Inaccuracy'].includes(level)) level = 'Draw'; sentences.push(`This position is drawn by ${state.drawReason}.`); }
  else {
    const token = after.pv?.[0];
    if (token) {
      try {
        const position = new Chess(state.fen);
        const reply = position.move({ from:token.slice(0, 2), to:token.slice(2, 4), promotion:token[4] });
        const names = { p:'pawn', n:'knight', b:'bishop', r:'rook', q:'queen' }, facts = [];
        if (reply.captured) facts.push(`capturing the ${names[reply.captured]}`);
        if (position.isCheckmate()) facts.push('delivering checkmate');
        else if (position.isCheck()) facts.push('giving check');
        if (reply.promotion) facts.push(`promoting to a ${names[reply.promotion]}`);
        sentences.push(`The opponent’s best calculated reply is ${reply.san}${facts.length ? ', ' + facts.join(' and ') : ''}.`);
      } catch { /* Describe only legal moves in the engine's principal variation. */ }
    }
    if (state.move.promoted) sentences.push('Your pawn promotes in this position.');
    else if (state.check) sentences.push('Your move gives check, so the opponent must answer it.');
  }
  if (drawClaim) sentences.push(drawClaim.trim());
  sentences.push(`Evaluation: ${formatScore(before.score)} → ${formatScore(after.score)} (White’s perspective).`);
  return { ...base, level, body: sentences.join(' '), bestMoveSan, pvSan, lossCp };
}

export function summarizeGame(game, side) {
  const own = game.states.filter(state => state.ply && (state.black ? 'black' : 'white') === side);
  const reviewed = own.filter(state => game.analyses[state.ply - 1]?.score && game.analyses[state.ply]?.score);
  const coaches = reviewed.map(state => coachMove(game, state.ply));
  const losses = coaches.map(coach => coach.lossCp).filter(value => value !== null);
  return {
    total: own.length, reviewed: reviewed.length,
    mistakes: coaches.filter(coach => coach.level === 'Mistake').length,
    blunders: coaches.filter(coach => coach.level === 'Blunder').length,
    averageLossCp: losses.length ? Math.round(losses.reduce((sum, loss) => sum + loss, 0) / losses.length) : null,
  };
}
