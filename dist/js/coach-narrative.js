import { Chess } from '../vendor/chess.js/chess.js';

const NAMES = { p:'pawn', n:'knight', b:'bishop', r:'rook', q:'queen', k:'king' };
const VALUES = { p:1, n:3, b:3, r:5, q:9, k:0 };
const colorName = color => color === 'w' ? 'White' : 'Black';
const sideColor = side => side === 'white' ? 'w' : side === 'black' ? 'b' : null;
const opposite = color => color === 'w' ? 'b' : 'w';
const capitalize = text => text[0].toUpperCase() + text.slice(1);
const play = (chess, token) => chess.move({ from:token.slice(0, 2), to:token.slice(2, 4), promotion:token[4] });
const possessive = (color, view) => color === view ? 'your' : view ? 'their' : `${colorName(color)}’s`;
const person = (color, view) => color === view ? 'you' : colorName(color);

function material(chess, color) {
  return chess.board().flat().filter(Boolean).reduce((sum, piece) => sum + (piece.color === color ? 1 : -1) * VALUES[piece.type], 0);
}

function readLine(fen, tokens = [], limit = 8) {
  const chess = new Chess(fen), steps = [];
  for (const token of tokens.slice(0, limit)) {
    try {
      const before = chess.fen(), move = play(chess, token);
      steps.push({ move, before, after:chess.fen(), mate:chess.isCheckmate() });
    } catch { break; }
  }
  return steps;
}

function legalMovesFor(chess, color) {
  if (chess.turn() === color) return chess.moves({ verbose:true });
  const fields = chess.fen().split(' ');
  fields[1] = color;
  fields[3] = '-'; // Do not invent en passant rights when inspecting a future turn.
  return new Chess(fields.join(' ')).moves({ verbose:true });
}

// Describe visible chess facts, not a guessed explanation for a numerical score.
function purpose(fen, token, view) {
  if (!token) return null;
  try {
    const before = new Chess(fen), chess = new Chess(fen), move = play(chess, token);
    const owner = possessive(move.color, view), enemy = opposite(move.color);
    const piece = NAMES[move.promotion || move.piece];
    if (chess.isCheckmate()) return { reason:`checkmates ${possessive(enemy, view)} king`, theme:'mate', move };
    if (move.isPromotion()) return { reason:`turns ${owner} pawn into a ${piece}${chess.isCheck() ? ' with check' : ''}`, theme:'promotion', move };
    if (move.isEnPassant()) return { reason:`captures the pawn en passant${chess.isCheck() ? ' with check' : ''}`, theme:'capture', move };
    if (move.captured) return { reason:`takes ${possessive(enemy, view)} ${NAMES[move.captured]} on ${move.to}${chess.isCheck() ? ' with check' : ''}`, theme:'capture', move };
    if (before.isCheck()) return { reason:`answers the check${move.piece === 'k' ? ` by moving ${owner} king to ${move.to}` : ''}`, theme:'check', move };
    if (move.isKingsideCastle() || move.isQueensideCastle()) return { reason:`moves ${owner} king off the e-file and brings the rook into play`, theme:'king', move };
    if (chess.isCheck()) return { reason:`gives check, making ${person(enemy, view)} deal with the threat to ${possessive(enemy, view)} king`, theme:'check', move };
    if (legalMovesFor(before, enemy).some(capture => capture.to === move.from && capture.captured) && !legalMovesFor(chess, enemy).some(capture => capture.to === move.to && capture.captured)) return { reason:`moves ${owner} ${piece} off an attacked square`, theme:'safety', move };
    const activeMoves = legalMovesFor(chess, move.color).filter(next => next.from === move.to);
    const targets = chess.board().flat().filter(target => target && target.color === enemy && target.type !== 'k' && activeMoves.some(next => next.to === target.square && next.captured));
    targets.sort((a, b) => VALUES[b.type] - VALUES[a.type]);
    const target = targets[0];
    const develops = ['n','b'].includes(move.piece) && move.from[1] === (move.color === 'w' ? '1' : '8') && move.to[1] !== move.from[1];
    if (develops) return { reason:`brings ${owner} ${piece} off the back rank${target ? ` and attacks ${possessive(enemy, view)} ${NAMES[target.type]} on ${target.square}` : ''}`, theme:'development', move };
    if (target) return { reason:`attacks ${possessive(enemy, view)} ${NAMES[target.type]} on ${target.square}`, theme:'activity', move };
    if (move.piece === 'p' && ['d4','e4','d5','e5'].includes(move.to)) return { reason:`puts a pawn in the center, where it can influence play on both sides`, theme:'center', move };
    if (move.piece === 'r' && move.from[0] !== move.to[0] && !chess.board().flat().some(target => target?.type === 'p' && target.square[0] === move.to[0])) return { reason:`places ${owner} rook on the open ${move.to[0]}-file`, theme:'activity', move };
    const center = ['d4','e4','d5','e5'].filter(square => activeMoves.some(next => next.to === square) && !before.attackers(square, move.color).includes(move.from));
    if (center.length) return { reason:`brings ${owner} ${piece} into contact with the center, controlling ${center.slice(0, 2).join(' and ')}`, theme:'center', move };
    return { reason:null, theme:null, move };
  } catch { return null; }
}

export { purpose as describeMovePurpose };

function replySentence(step, view) {
  if (!step) return null;
  const move = step.move, actor = capitalize(person(move.color, view));
  if (step.mate) return `${actor} can play ${move.san}, checkmating ${possessive(opposite(move.color), view)} king.`;
  if (move.isEnPassant()) return `${actor} can capture en passant with ${move.san}.`;
  if (move.captured) return `${actor} can answer with ${move.san}, taking ${possessive(opposite(move.color), view)} ${NAMES[move.captured]}.`;
  if (move.san.includes('+')) return `${actor} can answer with ${move.san}, giving check.`;
  return `${actor} can answer with ${move.san}; consider that reply before choosing the next move.`;
}

function lesson(theme) {
  return ({
    safety:'Before committing, check the opponent’s captures and whether you can recapture.',
    development:'In the opening, try to bring a new piece into play with each move.',
    center:'Look for ways to put your pieces and pawns to work in the center.',
    king:'Keep king safety in mind before starting an attack elsewhere.',
    activity:'Look for active squares where a piece has a clear job.',
    check:'When there is a forcing move, check it before making a quiet move.',
    mate:'Before moving, look at the checks available to both players.',
    promotion:'A pawn close to promotion deserves your attention.',
  })[theme] || null;
}

export function writeCoachNote({ previousFen, state, before, after, level, lostMate, allowsMate, viewSide }) {
  const view = sideColor(viewSide), mover = state.black ? 'b' : 'w', enemy = opposite(mover);
  const own = view === mover, neutral = view === null, actor = capitalize(person(mover, view));
  const name = colorName(mover), played = state.san;
  const best = before.bestMove === state.move.uci;
  const playedIdea = purpose(previousFen, state.move.uci, view);
  const alternative = purpose(previousFen, before.bestMove, view);
  const replies = readLine(state.fen, after.pv), reply = replies[0];
  const bad = ['Blunder','Mistake','Inaccuracy'].includes(level);
  const sentences = [];
  let theme = null;
  const recommend = () => {
    if (!alternative || best) return;
    const lead = own || neutral ? `Try ${alternative.move.san} instead` : `${name} could have played ${alternative.move.san} instead`;
    sentences.push(`${lead}${alternative.reason ? `: it ${alternative.reason}` : ', then work through the continuation below'}.`);
    theme ||= alternative.theme;
  };

  if (state.checkmate) {
    return `${own ? 'Well spotted! ' : ''}${played} is checkmate. ${capitalize(possessive(enemy, view))} king is in check with no legal way to escape.`;
  }
  if (state.drawReason === 'stalemate') {
    sentences.push(`${actor} played ${played}, leaving ${colorName(enemy)} with no legal move but not in check. That is stalemate, so the game is drawn${bad ? ' and the advantage is gone' : ''}.`);
    recommend();
    if (bad) sentences.push('When ahead, make sure your opponent still has a legal move unless you are giving checkmate.');
    return sentences.join(' ');
  }
  if (state.drawReason) {
    const explanation = state.drawReason === 'insufficient mating material' ? 'Neither side has enough material to give checkmate now' : state.drawReason === 'fivefold repetition' ? 'The same position has occurred five times' : 'Seventy-five moves have passed without a pawn move or capture';
    sentences.push(`${actor} played ${played}. ${explanation}, so the game is drawn.`);
    if (bad) recommend();
    return sentences.join(' ');
  }
  if (best && (lostMate || allowsMate)) {
    // Independent time-limited searches can disagree about mate even after the
    // previous first choice. Show the new threat without blaming that choice.
    if (allowsMate) {
      sentences.push(`${actor} played ${played}. The follow-up line now shows a mating threat for ${colorName(enemy)}.`);
      if (reply) sentences.push(replySentence(reply, view));
      sentences.push('Check that threat carefully before going on.');
    } else sentences.push(`After ${played}, the follow-up line no longer shows a forced mate. Keep looking for checks, but do not assume the attack finishes the game yet.`);
    return sentences.join(' ');
  }
  if (allowsMate) {
    sentences.push(`${actor} played ${played}, but this gives ${person(enemy, view)} a forced mating attack.`);
    if (reply) sentences.push(replySentence(reply, view));
    recommend(); theme = 'mate';
  } else if (lostMate) {
    sentences.push(`${actor} played ${played}, but there was a way to force checkmate here.`);
    recommend(); theme = 'mate';
  } else if (bad) {
    // A capture is a concrete problem only when it is not offset by the played
    // capture/promotion or an available immediate recapture. Never infer a loss
    // from seeing one piece disappear in a truncated or sacrificial line.
    let exposed = false;
    if (reply?.move.captured && !reply.move.isEnPassant()) {
      const initial = new Chess(previousFen), position = new Chess(reply.after);
      const recaptures = position.moves({ verbose:true }).filter(move => move.to === reply.move.to && move.captured);
      exposed = material(position, mover) < material(initial, mover) && recaptures.length === 0;
    }
    if (exposed) {
      sentences.push(`${actor} played ${played}, but this lets ${person(enemy, view)} take ${possessive(mover, view)} ${NAMES[reply.move.captured]} on ${reply.move.to} with ${reply.move.san}.`);
      recommend(); theme = 'safety';
    } else {
      sentences.push(own ? `${played} is a move I would revisit.` : `${name}’s ${played} is a move to revisit.`);
      recommend();
      if (reply && (!alternative?.reason || reply.move.isEnPassant() || reply.move.san.includes('+'))) sentences.push(replySentence(reply, view));
    }
  } else {
    const lead = own ? (best ? 'Good choice' : 'This is a playable idea') : best ? `${name} found a strong move` : `${name} has a playable idea`;
    sentences.push(playedIdea?.reason ? `${lead}: ${played} ${playedIdea.reason}.` : `${actor} played ${played}.`);
    // A sound sacrifice should be described as a sequence, not blamed for its
    // first capture. The following checking reply is a directly verified fact.
    if (reply?.move.captured && replies[1] && /[+#]/.test(replies[1].move.san)) {
      sentences.push(`After ${reply.move.san}, ${replies[1].move.san} ${replies[1].mate ? 'is checkmate' : 'comes with check'}.`);
      theme = 'check';
    } else if (reply && (reply.mate || reply.move.san.includes('+') || !playedIdea?.reason)) sentences.push(replySentence(reply, view));
    theme ||= playedIdea?.theme;
    if (!best && alternative?.reason) sentences.push(`Another idea is ${alternative.move.san}, which ${alternative.reason}.`);
  }
  const tip = lesson(theme);
  if (tip && own) sentences.push(tip);
  if (state.claimableDrawReason) sentences.push(`${capitalize(person(enemy, view))} can claim a draw by ${state.claimableDrawReason}, but play can continue if no claim is made.`);
  return sentences.join(' ');
}
