const WORKER_URL = new URL('../vendor/stockfish/stockfish-19-lite-single.js', import.meta.url);
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
function abortError() { const error = new Error('Stockfish analysis was cancelled.'); error.name = 'AbortError'; return error; }
function validFen(value, label) {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) throw new TypeError(`${label} must be a FEN position.`);
  const fen = value.trim(), fields = fen.split(/\s+/);
  if (fields.length !== 6 || !['w', 'b'].includes(fields[1])) throw new TypeError(`${label} must be a complete FEN position.`);
  return fen;
}
/** One bounded UCI search at a time. Scores always use White's perspective. */
export class StockfishEngine {
  constructor({ workerFactory = () => new Worker(WORKER_URL), startupTimeoutMs = 30000, searchTimeoutMs = 15000 } = {}) {
    if (typeof workerFactory !== 'function') throw new TypeError('workerFactory must be a function.');
    if (!Number.isFinite(startupTimeoutMs) || !Number.isFinite(searchTimeoutMs) || !(startupTimeoutMs > 0) || !(searchTimeoutMs > 0)) throw new TypeError('Stockfish timeouts must be positive.');
    Object.assign(this, { _workerFactory: workerFactory, _startupTimeoutMs: startupTimeoutMs, _searchTimeoutMs: searchTimeoutMs, _worker: null, _state: 'uninitialized', _initPromise: null, _initResolve: null, _initReject: null, _startupTimer: null, _search: null, _busy: false, _disposed: false, _failure: null });
  }
  init() {
    if (this._disposed) return Promise.reject(abortError());
    if (this._failure) return Promise.reject(this._failure);
    if (this._initPromise) return this._initPromise;
    this._initPromise = new Promise((resolve, reject) => {
      this._initResolve = resolve; this._initReject = reject; this._state = 'awaiting-uci';
      this._startupTimer = setTimeout(() => this._fail(new Error('Stockfish initialization timed out. Please reload and try again.')), this._startupTimeoutMs);
      try {
        this._worker = this._workerFactory();
        this._worker.onmessage = (event) => this._receive(event.data);
        this._worker.onerror = (event) => { event.preventDefault?.(); this._fail(new Error(`Stockfish could not run${event.message ? `: ${event.message}` : '.'}`)); };
        this._worker.onmessageerror = () => this._fail(new Error('Stockfish returned an unreadable worker message.'));
        this._send('uci');
      } catch (error) { this._fail(new Error(`Stockfish could not start: ${error.message || error}`)); }
    });
    return this._initPromise;
  }
  async analyze({ fen, initialFen, moves = [], depth = 18, moveTimeMs = 700 } = {}) {
    if (this._disposed) throw abortError();
    if (this._failure) throw this._failure;
    if (this._busy) throw new Error('Stockfish is already analyzing a position.');
    const currentFen = validFen(fen, 'fen'), startFen = initialFen == null ? null : validFen(initialFen, 'initialFen');
    if (!Array.isArray(moves) || moves.some((move) => typeof move !== 'string' || !UCI_MOVE.test(move))) throw new TypeError('moves must be an array of UCI moves.');
    if (!Number.isInteger(depth) || depth < 1 || depth > 245) throw new TypeError('depth must be an integer between 1 and 245.');
    if (!Number.isInteger(moveTimeMs) || moveTimeMs < 1 || moveTimeMs > 60000) throw new TypeError('moveTimeMs must be an integer between 1 and 60000.');
    this._busy = true;
    try {
      await this.init();
      if (this._disposed) throw abortError();
      if (this._failure) throw this._failure;
      return await new Promise((resolve, reject) => {
        const search = { resolve, reject, sign: currentFen.split(/\s+/)[1] === 'w' ? 1 : -1, evaluation: null, timer: null };
        this._search = search;
        search.timer = setTimeout(() => this._fail(new Error('Stockfish analysis timed out. Please restart analysis.')), this._searchTimeoutMs);
        // The starting position and game moves preserve threefold repetition history.
        const base = (startFen || currentFen) === START_FEN ? 'startpos' : `fen ${startFen || currentFen}`;
        this._send(`position ${base}${startFen && moves.length ? ` moves ${moves.join(' ')}` : ''}`);
        if (!this._failure && !this._disposed) this._send(`go depth ${depth} movetime ${moveTimeMs}`);
      });
    } finally { this._busy = false; }
  }
  dispose() {
    if (this._disposed) return;
    this._disposed = true; this._state = 'disposed'; this._rejectPending(abortError()); this._terminate();
  }
  _send(command) {
    if (this._disposed || this._failure) return;
    try { this._worker.postMessage(command); }
    catch (error) { this._fail(new Error(`Stockfish communication failed: ${error.message || error}`)); }
  }
  _receive(data) {
    if (this._disposed || this._failure || typeof data !== 'string') return;
    for (const line of data.split(/\r?\n/)) {
      const text = line.trim();
      if (/CRITICAL ERROR/i.test(text)) this._fail(new Error(`Stockfish failed: ${text}`));
      else if (this._state === 'awaiting-uci' && text === 'uciok') {
        this._state = 'awaiting-ready';
        this._send('setoption name Hash value 16'); this._send('setoption name Threads value 1'); this._send('setoption name MultiPV value 1'); this._send('ucinewgame'); this._send('isready');
      } else if (this._state === 'awaiting-ready' && text === 'readyok') {
        clearTimeout(this._startupTimer); this._startupTimer = null; this._state = 'ready';
        const resolve = this._initResolve; this._initResolve = null; this._initReject = null; resolve();
      } else if (this._state === 'ready' && this._search) {
        if (text.startsWith('info ')) this._receiveInfo(text);
        else if (text.startsWith('bestmove ')) this._finishSearch(text);
      }
      if (this._disposed || this._failure) break;
    }
  }
  _receiveInfo(line) {
    const tokens = line.split(/\s+/), multiIndex = tokens.indexOf('multipv');
    if (tokens[1] === 'string') return;
    if (multiIndex !== -1 && tokens[multiIndex + 1] !== '1') return;
    if (tokens.includes('lowerbound') || tokens.includes('upperbound')) return;
    const scoreIndex = tokens.indexOf('score'), depthIndex = tokens.indexOf('depth'), pvIndex = tokens.indexOf('pv');
    if (scoreIndex < 0 || depthIndex < 0 || pvIndex < 0) return;
    const type = tokens[scoreIndex + 1], value = Number(tokens[scoreIndex + 2]), depth = Number(tokens[depthIndex + 1]), pv = tokens.slice(pvIndex + 1);
    if (!['cp', 'mate'].includes(type) || !Number.isInteger(value) || !Number.isInteger(depth) || depth < 0) return;
    if (!pv.length || pv.some((move) => !UCI_MOVE.test(move))) return;
    if (this._search.evaluation && depth < this._search.evaluation.depth) return;
    this._search.evaluation = { score: { type, value: value === 0 ? 0 : value * this._search.sign }, pv, depth };
  }
  _finishSearch(line) {
    const move = line.split(/\s+/)[1];
    if (!UCI_MOVE.test(move) && move !== '(none)' && move !== '0000') { this._fail(new Error('Stockfish returned an invalid best move.')); return; }
    const search = this._search;
    if (!search.evaluation) { this._fail(new Error('Stockfish finished without an exact evaluation. Please restart analysis.')); return; }
    clearTimeout(search.timer); this._search = null;
    // On a timed stop, final bestmove can follow an unfinished bounded search.
    // Keep the recommendation, score and line from the last completed exact search together.
    search.resolve({ ...search.evaluation, bestMove: UCI_MOVE.test(move) ? search.evaluation.pv[0] : null });
  }
  _fail(error) {
    if (this._disposed || this._failure) return;
    this._failure = error; this._state = 'failed'; this._rejectPending(error); this._terminate();
  }
  _rejectPending(error) {
    clearTimeout(this._startupTimer); this._startupTimer = null;
    const rejectInit = this._initReject; this._initResolve = null; this._initReject = null; rejectInit?.(error);
    if (this._search) { clearTimeout(this._search.timer); const rejectSearch = this._search.reject; this._search = null; rejectSearch(error); }
  }
  _terminate() {
    if (!this._worker) return;
    this._worker.onmessage = null; this._worker.onerror = null; this._worker.onmessageerror = null;
    this._worker.terminate(); this._worker = null;
  }
}
