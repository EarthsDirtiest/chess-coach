import { Chess } from '../vendor/chess.js/chess.js';
import { StockfishEngine } from './stockfish-engine.js';

const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const side = color => color === 'w' ? 'white' : 'black';
const moveUci = move => move.from + move.to + (move.promotion || '');
const cancelled = () => Object.assign(new Error('Mate practice was cancelled.'), { name:'AbortError' });
const copyAnalysis = value => value ? { ...value, score:{ ...value.score }, pv:[...(value.pv || [])] } : null;

export function getMateOpportunity(state, analysis) {
  const score = analysis?.score;
  if (state?.terminal || analysis?.terminal || score?.type !== 'mate' || !Number.isInteger(score.value) || score.value === 0) return null;
  return { attacker:score.value > 0 ? 'white' : 'black', mateIn:Math.abs(score.value) };
}
function playUci(chess, token) {
  if (typeof token !== 'string' || !UCI.test(token)) throw new Error('Expected a UCI chess move.');
  return chess.move({ from:token.slice(0, 2), to:token.slice(2, 4), ...(token[4] ? { promotion:token[4] } : {}) });
}
// Claimable draws belong to the player to move; they do not automatically end a game.
function drawReasons(chess) {
  const fen = chess.fen(), key = value => value.split(' ').slice(0, 4).join(' ');
  const history = chess.history({ verbose:true });
  const positions = [history[0]?.before || fen, ...history.map(move => move.after)];
  const repeats = positions.filter(value => key(value) === key(fen)).length;
  const clock = Number(fen.split(' ')[4]);
  return {
    automatic:chess.isStalemate() ? 'stalemate' : chess.isInsufficientMaterial() ? 'insufficient mating material'
      : repeats >= 5 ? 'fivefold repetition' : clock >= 150 ? 'the seventy-five-move rule' : null,
    claimable:repeats >= 3 ? 'threefold repetition' : clock >= 100 ? 'the fifty-move rule' : null,
  };
}

export class MatePractice {
  constructor({ initialFen, moves = [], analysis, engineFactory = () => new StockfishEngine(), onChange = () => {} }) {
    if (!Array.isArray(moves)) throw new TypeError('Practice history must be an array of UCI moves.');
    this._initialFen = initialFen; this._historyUci = [...moves]; this._practiceUci = []; this._practiceSan = []; this._checkpoints = [];
    this._engineFactory = engineFactory; this._onChange = onChange; this._engine = null; this._generation = 0; this._pending = null;
    this._revealPromise = null; this._startPromise = null; this._started = false; this._disposed = false; this._solution = null; this._solutionComplete = false;
    this._status = 'loading'; this._message = 'Preparing the mate position…'; this._rebuild([]);
    const opportunity = getMateOpportunity({ terminal:this._chess.isCheckmate() || Boolean(drawReasons(this._chess).automatic) }, analysis);
    if (!opportunity) throw new Error('This position does not have a live forced-mate evaluation.');
    this._attacker = opportunity.attacker; this._initialAnalysis = copyAnalysis(analysis);
    this._latest = { fen:this._chess.fen(), analysis:this._initialAnalysis };
  }
  get state() {
    const legalMoves = this._status === 'player' ? this._chess.moves({ verbose:true }).map(move => ({ from:move.from, to:move.to, ...(move.promotion ? { promotion:move.promotion } : {}), san:move.san })) : [];
    return {
      fen:this._chess.fen(), board:this._chess.board().map(row => row.map(piece => !piece ? '.' : piece.color === 'w' ? piece.type.toUpperCase() : piece.type)),
      turn:side(this._chess.turn()), attacker:this._attacker, status:this._status, message:this._message, legalMoves,
      lastMove:this._lastMove ? { ...this._lastMove } : null, canUndo:this._checkpoints.length > 0,
      movesPlayed:[...this._practiceSan], solution:this._solution ? [...this._solution] : null, solutionComplete:this._solutionComplete,
    };
  }
  start() {
    if (this._disposed) return Promise.resolve(this.state);
    if (this._started) return this._startPromise || Promise.resolve(this.state);
    this._started = true; const token = this._generation; this._startPromise = this._runStart(token); return this._startPromise;
  }
  async _runStart(token) {
    try { if (this._markTerminal()) this._notify(); else if (side(this._chess.turn()) === this._attacker) this._playerTurn(); else await this._defend(token); }
    catch (error) { this._handleError(error, token); } return this.state;
  }
  async play({ from, to, promotion } = {}) {
    if (this._disposed) throw cancelled();
    if (this._status !== 'player' || side(this._chess.turn()) !== this._attacker) throw new Error('Wait for your turn to play.');
    let move; try { move = this._chess.move({ from, to, ...(promotion ? { promotion } : {}) }); } catch { throw new Error('That move is not legal in this position.'); }
    this._checkpoints.push(this._practiceUci.length); this._record(move); const token = this._generation;
    if (this._markTerminal()) { this._notify(); return this.state; }
    this._status = 'thinking'; this._message = 'Checking your continuation…'; this._notify();
    try {
      const analysis = await this._analyze(token); if (!this._current(token)) return this.state;
      const opportunity = getMateOpportunity({ terminal:false }, analysis);
      if (opportunity?.attacker !== this._attacker) {
        this._status = 'lost-mate'; this._message = 'I haven’t confirmed a forced mate after that move. Take it back and try another idea.'; this._notify();
      } else await this._defend(token);
    } catch (error) { this._handleError(error, token); } return this.state;
  }
  revealSolution() {
    if (this._disposed) return Promise.reject(cancelled());
    if (this._revealPromise) return this._revealPromise;
    if (!['player', 'lost-mate'].includes(this._status)) return Promise.reject(new Error('Wait for the current move to finish.'));
    if (this._solution !== null) return Promise.resolve([...this._solution]);
    const token = this._generation, priorStatus = this._status, priorMessage = this._message;
    this._status = 'loading'; this._message = 'Calculating the line to reveal…'; this._notify();
    const task = (async () => {
      try {
        const analysis = await this._analyze(token); if (!this._current(token)) return [];
        const opportunity = getMateOpportunity({ terminal:false }, analysis);
        const solution = opportunity?.attacker === this._attacker ? await this._buildSolution(analysis, token) : { line:[], complete:false };
        if (!this._current(token)) return [];
        this._solution = solution.line; this._solutionComplete = solution.complete;
        this._status = priorStatus; this._message = priorMessage; this._notify(); return [...this._solution];
      } catch (error) { this._handleError(error, token); return []; }
    })();
    this._revealPromise = task; task.finally(() => { if (this._revealPromise === task) this._revealPromise = null; }); return task;
  }
  undoTurn() {
    if (this._disposed || !this._checkpoints.length) return false;
    const count = this._checkpoints.pop(), keep = this._practiceUci.slice(0, count);
    this._cancelEngine(); this._rebuild(keep);
    this._latest = count === 0 ? { fen:this._chess.fen(), analysis:this._initialAnalysis } : null;
    this._solution = null; this._status = 'player'; this._message = 'Your move was taken back. Try another continuation.'; this._notify(); return true;
  }
  restart() {
    if (this._disposed) return Promise.resolve(this.state);
    this._cancelEngine(); this._checkpoints = []; this._rebuild([]);
    this._latest = { fen:this._chess.fen(), analysis:this._initialAnalysis }; this._solution = null;
    this._status = 'loading'; this._message = 'Restarting the mate position…'; this._started = false; this._startPromise = null; return this.start();
  }
  dispose() {
    if (this._disposed) return; this._disposed = true; this._cancelEngine(); this._solution = null;
    this._status = 'disposed'; this._message = 'Mate practice closed.'; this._notify();
  }
  _rebuild(practice) {
    const chess = new Chess(this._initialFen); for (const move of this._historyUci) playUci(chess, move);
    const sans = []; for (const move of practice) sans.push(playUci(chess, move).san);
    this._chess = chess; this._practiceUci = [...practice]; this._practiceSan = sans;
    const last = chess.history({ verbose:true }).at(-1); this._lastMove = last ? { from:last.from, to:last.to } : null;
  }
  _record(move) {
    this._practiceUci.push(moveUci(move)); this._practiceSan.push(move.san); this._lastMove = { from:move.from, to:move.to };
    this._solution = null; this._latest = null;
  }
  _current(token) { return !this._disposed && token === this._generation; }
  _notify() { this._onChange(this.state); }
  _playerTurn() { this._status = 'player'; this._message = 'Your turn. Find a forcing continuation.'; this._notify(); }
  async _analyze(token) {
    if (!this._current(token)) throw cancelled(); const fen = this._chess.fen();
    if (this._latest?.fen === fen) return this._latest.analysis;
    if (this._pending?.token === token && this._pending.fen === fen) return this._pending.promise;
    if (!this._engine) this._engine = this._engineFactory();
    const engine = this._engine, moves = [...this._historyUci, ...this._practiceUci]; let promise;
    promise = Promise.resolve().then(() => { if (!this._current(token)) throw cancelled(); return engine.analyze({ fen, initialFen:this._initialFen, moves, depth:20, moveTimeMs:1000 }); })
      .then(analysis => { if (!this._current(token)) throw cancelled(); this._latest = { fen, analysis }; return analysis; })
      .finally(() => { if (this._pending?.promise === promise) this._pending = null; });
    this._pending = { token, fen, promise }; return promise;
  }
  async _defend(token) {
    if (!this._current(token)) return; if (this._markTerminal()) { this._notify(); return; }
    this._status = 'thinking'; this._message = 'Stockfish is choosing the strongest defense…'; this._notify();
    const analysis = await this._analyze(token); if (!this._current(token)) return;
    const tokenMove = analysis.bestMove || analysis.pv?.[0]; let move;
    try { move = playUci(this._chess, tokenMove); } catch { throw new Error('Stockfish did not provide a legal defensive move. Restart to try again.'); }
    this._record(move); if (this._markTerminal()) this._notify(); else this._playerTurn();
  }
  async _buildSolution(analysis, token) {
    // A principal variation can stop before mate. Extend it on a separate board,
    // preserving history, without playing any of those moves on the practice board.
    const chess = new Chess(this._initialFen), history = [...this._historyUci, ...this._practiceUci], line = [];
    for (const move of history) playUci(chess, move);
    const limit = Math.min(256, Math.abs(analysis.score.value) * 2 + 4);
    let current = analysis, searches = 0;
    while (this._current(token) && line.length < limit) {
      let advanced = false;
      for (const move of current.pv || []) {
        if (line.length >= limit || chess.isCheckmate() || drawReasons(chess).automatic) break;
        try { line.push(playUci(chess, move).san); history.push(move); advanced = true; } catch { break; }
      }
      if (chess.isCheckmate() || drawReasons(chess).automatic || !advanced || ++searches > 16) break;
      if (!this._current(token)) throw cancelled();
      if (!this._engine) this._engine = this._engineFactory();
      current = await this._engine.analyze({ fen:chess.fen(), initialFen:this._initialFen, moves:[...history], depth:22, moveTimeMs:1000 });
      if (getMateOpportunity({}, current)?.attacker !== this._attacker) break;
    }
    return { line, complete:chess.isCheckmate() && side(chess.turn()) !== this._attacker };
  }
  _markTerminal() {
    if (this._chess.isCheckmate()) {
      const winner = this._chess.turn() === 'w' ? 'black' : 'white'; this._status = winner === this._attacker ? 'won' : 'lost-mate';
      this._message = winner === this._attacker ? 'Checkmate! You completed the mating attack.' : 'The defender delivered checkmate. Undo your move to try again.'; return true;
    }
    const draw = drawReasons(this._chess), claimed = side(this._chess.turn()) !== this._attacker && draw.claimable;
    if (!draw.automatic && !claimed) return false;
    this._status = 'draw'; this._message = draw.automatic ? `Draw by ${draw.automatic}. Take back your move to try again.`
      : `The defender can claim a draw by ${claimed}. Take back your move to try again.`; return true;
  }
  _handleError(error, token) {
    if (!this._current(token)) return; this._status = 'error';
    this._message = `Practice analysis could not finish: ${error?.message || error}. Restart to try again.`; this._notify();
  }
  _cancelEngine() {
    this._generation++; this._pending = null; this._revealPromise = null; this._engine?.dispose?.(); this._engine = null;
  }
}
