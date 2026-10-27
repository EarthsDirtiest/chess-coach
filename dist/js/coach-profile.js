import { Chess } from '../vendor/chess.js/chess.js';
import { coachMove } from './chess-review.js';
import { describeMovePurpose } from './coach-narrative.js';
import { gameIdentity } from './game-history.js';
import { recommendPractices } from './practice-goals.js';

export const REPORT_VERSION = 1;
export const skills = {
  king:{ title:'Spot mating threats', habit:'Before every move, check your opponent’s checks and the escape squares around your king.' },
  finish:{ title:'Finish the mating attack', habit:'When you have an attack, calculate the forcing checks through the opponent’s best defense.' },
  pieces:{ title:'Keep your pieces safe', habit:'Before committing, list the opponent’s captures and check whether you can safely recapture.' },
  forcing:{ title:'Look for forcing moves', habit:'Check checks and captures before choosing a quiet move. Look for moves that create two threats.' },
  opening:{ title:'Develop with a plan', habit:'Bring pieces into play, contest the center, and make your king safe before launching an attack.' },
  conversion:{ title:'Protect your advantage', habit:'When ahead, check the opponent’s reply and avoid forcing a draw when you can keep playing for a win.' },
  calculation:{ title:'Check the reply before moving', habit:'Name the opponent’s strongest reply before you commit. Practice calculating one more move.' },
};
const winner = score => score?.type === 'mate' ? score.winner || (score.value > 0 ? 'white' : 'black') : null;
const play = (chess, token) => chess.move({ from:token.slice(0, 2), to:token.slice(2, 4), promotion:token[4] });
const values = { p:1, n:3, b:3, r:5, q:9, k:0 };
const material = (chess, color) => chess.board().flat().filter(Boolean).reduce((sum, piece) => sum + (piece.color === color ? 1 : -1) * values[piece.type], 0);

function classify(game, state, before, after, lossCp, side) {
  const previous = game.states[state.ply - 1], enemy = side === 'white' ? 'black' : 'white';
  if (winner(after.score) === enemy && winner(before.score) !== enemy) return { skill:'king', reason:'This move allowed a forced mating attack.' };
  if (winner(before.score) === side && winner(after.score) !== side) return { skill:'finish', reason:state.drawReason ? 'You had a mating attack, but this move ended the game in a draw.' : 'There was a mate to look for here. Revisit the forcing line before choosing this continuation.' };
  try {
    const chess = new Chess(state.fen), reply = after.pv?.[0] ? play(chess, after.pv[0]) : null;
    const color = side === 'white' ? 'w' : 'b';
    if (reply?.captured && !reply.isEnPassant() && material(chess, color) < material(new Chess(previous.fen), color)
      && !chess.moves({ verbose:true }).some(move => move.to === reply.to && move.captured)) {
      return { skill:'pieces', topics:['piece-safety','loose-piece'], reason:`After ${reply.san}, you lose material and cannot recapture it immediately.` };
    }
  } catch { /* An incomplete PV is not evidence of a tactical pattern. */ }
  const advantage = before.score.type === 'cp' ? before.score.value * (side === 'white' ? 1 : -1) : 0;
  if (advantage >= 200 && state.drawReason) return { skill:'conversion', reason:'A favorable position was turned into an automatic draw.' };
  const idea = describeMovePurpose(previous.fen, before.bestMove, null);
  const openingPosition = state.moveNumber <= 10 && previous.board.flat().filter(piece => piece !== '.').length >= 24;
  if (openingPosition && ['development','center','king'].includes(idea?.theme)) return { skill:'opening', topics:[{ development:'development', center:'central-control', king:'castle' }[idea.theme]], reason:'There was a chance to develop, control the center, or castle more effectively.' };
  if (lossCp >= 100 && ['check','capture'].includes(idea?.theme)) return { skill:'forcing', topics:[idea.theme === 'check' ? 'checking-moves' : 'capture'], reason:'A check or capture was worth considering here. Work through that forcing alternative before choosing your move.' };
  return { skill:'calculation', reason:'This move needs another look. Work through the opponent’s reply; a more specific tactical cause was not confirmed.' };
}

export function buildGameReport(game, side, quality) {
  if (!['white','black'].includes(side)) throw new Error('Choose which side you played before updating your coaching profile.');
  if (game.analyses.length !== game.states.length || game.analyses.some(analysis => !['cp','mate'].includes(analysis?.score?.type) || !Number.isFinite(analysis.score.value))) throw new Error('Finish the full game analysis before updating your coaching profile.');
  const own = game.states.filter(state => state.ply && (state.black ? 'black' : 'white') === side);
  if (!own.length) throw new Error('There are no moves by your selected side in this PGN.');
  const incidents = []; let penalty = 0;
  for (const state of own) {
    const before = game.analyses[state.ply - 1], after = game.analyses[state.ply], coach = coachMove(game, state.ply, side);
    if (before.bestMove === state.move.uci) continue; // Independent mate searches can disagree even after their own first choice.
    const mateIncident = winner(before.score) === side && winner(after.score) !== side
      || winner(after.score) && winner(after.score) !== side && winner(before.score) !== winner(after.score);
    const lossCp = coach.lossCp;
    if (!mateIncident && !(lossCp >= 50)) continue;
    const cost = mateIncident ? 70 : Math.min(60, lossCp / 5);
    penalty += cost;
    incidents.push({ ...classify(game, state, before, after, lossCp, side), ply:state.ply,
      move:`${state.moveNumber}${state.black ? '...' : '.'} ${state.san}`, cost, lossCp:mateIncident ? null : lossCp,
      mate:Boolean(mateIncident), level:mateIncident ? 'Blunder' : coach.level });
  }
  return { version:REPORT_VERSION, completed:true, id:gameIdentity(game), side, quality, ownMoves:own.length, penalty,
    score:Math.round(100 - penalty / own.length), incidents, title:`${game.headers.White || 'White'} vs ${game.headers.Black || 'Black'}`,
    openingDrill:side === 'black' ? 'sicilian' : game.states.find(state => state.ply && !state.black)?.move.uci === 'd2d4' ? 'queens-gambit' : 'italian' };
}

const aggregateScore = reports => {
  const moves = reports.reduce((sum, report) => sum + report.ownMoves, 0);
  return moves ? Math.round(100 - reports.reduce((sum, report) => sum + report.penalty, 0) / moves) : null;
};
export function buildProfile(input) {
  // One contribution per match, including after side corrections or reanalysis.
  const unique = new Map();
  for (const report of input) if (report.version === REPORT_VERSION && report.completed && ['white','black'].includes(report.side)
    && report.ownMoves > 0 && Number.isFinite(report.score) && Number.isFinite(report.penalty) && Array.isArray(report.incidents)) unique.set(report.id, report);
  const reports = [...unique.values()].sort((a, b) => a.firstReviewedAt - b.firstReviewedAt || a.id.localeCompare(b.id));
  const windowSize = Math.min(5, Math.floor(reports.length / 2)), recent = windowSize ? reports.slice(-windowSize) : [], previous = windowSize ? reports.slice(-windowSize * 2, -windowSize) : [];
  const recentScore = aggregateScore(recent), previousScore = aggregateScore(previous);
  const focus = reports.slice(-10), weights = focus.map((_, i) => .85 ** (focus.length - 1 - i));
  const denominator = focus.reduce((sum, report, i) => sum + report.ownMoves * weights[i], 0);
  const priorities = Object.entries(skills).map(([key, skill]) => {
    const examples = [], games = new Set(); let count = 0, impact = 0;
    focus.forEach((report, i) => {
      for (const incident of report.incidents.filter(incident => incident.skill === key)) {
        count++; games.add(report.id); impact += incident.cost * weights[i];
        examples.push({ ...incident, gameId:report.id, side:report.side, title:report.title });
      }
    });
    const rate = group => {
      const moves = group.reduce((sum, report) => sum + report.ownMoves, 0);
      return moves ? group.reduce((sum, report) => sum + report.incidents.filter(incident => incident.skill === key).length, 0) * 100 / moves : null;
    };
    const opening = [...focus].reverse().find(report => report.incidents.some(incident => incident.skill === 'opening'));
    return { ...skill, key, count, games:games.size, impact:denominator ? impact / denominator : 0,
      drills:recommendPractices({ skill:key, side:examples.at(-1)?.side,
        topics:[...new Set(examples.flatMap(example => example.topics || []))],
        preferredId:key === 'opening' ? opening?.openingDrill : undefined }),
      recentRate:rate(recent), previousRate:rate(previous), examples:examples.reverse().slice(0, 3) };
  }).filter(priority => priority.count).sort((a, b) => b.impact - a.impact || b.count - a.count || a.key.localeCompare(b.key));
  const moves = reports.reduce((sum, report) => sum + report.ownMoves, 0);
  return { reports, count:reports.length, moves, score:aggregateScore(reports.slice(-5)), priorities,
    recentScore, previousScore, windowSize, delta:recentScore == null || previousScore == null ? null : recentScore - previousScore,
    provisional:reports.length < 3 || moves < 30 };
}
