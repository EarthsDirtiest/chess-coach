import { Chess } from '../vendor/chess.js/chess.js';

const side = color => color === 'w' ? 'white' : 'black';
const uci = move => move.from + move.to + (move.promotion || '');
function play(chess, move) { return chess.move({ from:move.slice(0, 2), to:move.slice(2, 4), promotion:move[4] }); }

// Prepared lines teach a specific opening or tactic. They do not grade all legal alternatives.
export class LinePractice {
  constructor({ drill, onChange = () => {} }) {
    this.drill = drill; this.onChange = onChange; this.disposed = false;
    this.lines = [drill.line, ...(drill.alternatives || [])];
    for (const line of this.lines) { const chess = new Chess(drill.fen); for (const move of line) play(chess, move); }
    this.line = this.lines[0]; this.checkpoints = []; this.cursor = 0; this.solution = null;
    this.chess = new Chess(drill.fen); this.status = 'loading'; this.message = drill.intro;
  }
  get state() {
    return { fen:this.chess.fen(), board:this.chess.board().map(row => row.map(piece => !piece ? '.' : piece.color === 'w' ? piece.type.toUpperCase() : piece.type)),
      attacker:this.drill.side, turn:side(this.chess.turn()), status:this.status, message:this.message, instruction:this.drill.intro,
      legalMoves:this.status === 'player' ? this.chess.moves({ verbose:true }).map(move => ({ from:move.from, to:move.to, promotion:move.promotion })) : [],
      lastMove:this.lastMove ? { ...this.lastMove } : null, canUndo:this.checkpoints.length > 0,
      solution:this.solution ? [...this.solution] : null, solutionComplete:true, movesPlayed:this.chess.history(),
    };
  }
  start() { if (!this.disposed) { this._advance(); this.onChange(this.state); } return Promise.resolve(this.state); }
  async play(move) {
    if (this.disposed || this.status !== 'player') return this.state;
    const token = move.from + move.to + (move.promotion || '');
    const legal = this.chess.moves({ verbose:true }).some(item => uci(item) === token);
    if (!legal) throw new Error('That move is not legal in this position.');
    const candidate = this.lines.find(line => line.slice(0, this.cursor).join(' ') === this.line.slice(0, this.cursor).join(' ') && line[this.cursor] === token);
    if (!candidate) {
      this.message = this.drill.kind === 'opening' ? 'That is a legal move, but this exercise follows a specific opening line. Try another idea or reveal the practice line.'
        : 'That is a legal move, but it does not match this puzzle’s solution. Look again at the targets, or reveal the solution.';
      this.onChange(this.state); return this.state;
    }
    this.line = candidate; this.checkpoints.push(this.cursor); this.solution = null;
    const note = this.drill.notes?.[this.cursor] || 'Good. Keep following the idea.';
    this._record(token); this._advance(note); this.onChange(this.state); return this.state;
  }
  _record(token) { const move = play(this.chess, token); this.lastMove = { from:move.from, to:move.to }; this.cursor++; return move.san; }
  _advance(note = '') {
    const replies = [];
    while (this.cursor < this.line.length && side(this.chess.turn()) !== this.drill.side) replies.push(this._record(this.line[this.cursor]));
    if (this.cursor === this.line.length) {
      this.status = 'won'; this.message = `${this.drill.kind === 'opening' ? 'Opening line complete!' : 'Puzzle solved!'} ${note} ${this.drill.finish}`.trim();
    } else {
      this.status = 'player'; this.message = `${note}${replies.length ? ` Prepared reply: ${replies.join(' ')}.` : ''} Your move.`.trim();
    }
  }
  revealSolution() {
    if (this.disposed) return Promise.resolve([]);
    const chess = new Chess(this.chess.fen()); this.solution = this.line.slice(this.cursor).map(token => play(chess, token).san);
    this.onChange(this.state); return Promise.resolve([...this.solution]);
  }
  undoTurn() {
    if (this.disposed || !this.checkpoints.length) return false;
    const count = this.checkpoints.pop(); this.chess = new Chess(this.drill.fen); this.cursor = 0; this.lastMove = null;
    for (const move of this.line.slice(0, count)) this._record(move);
    this.solution = null; this.status = 'player'; this.message = 'Your turn was taken back. Try the idea again.'; this.onChange(this.state); return true;
  }
  restart() {
    if (this.disposed) return Promise.resolve(this.state);
    this.chess = new Chess(this.drill.fen); this.line = this.lines[0]; this.cursor = 0; this.lastMove = null; this.checkpoints = []; this.solution = null;
    return this.start();
  }
  dispose() { this.disposed = true; this.status = 'disposed'; this.solution = null; }
}
