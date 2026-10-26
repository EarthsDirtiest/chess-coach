import { MatePractice } from './mate-practice.js';
import { renderBoard } from './chess-board.js';

const $ = id => document.getElementById(id);
const title = side => side === 'white' ? 'White' : 'Black';

export class MatePracticeUI {
  constructor({ onReturn }) {
    this.session = null; this.selected = null; this.promotion = null; this.showSolution = false;
    $('practiceReturn').onclick = onReturn;
    $('practiceUndo').onclick = () => { this.resetInput(); this.session?.undoTurn(); };
    $('practiceRestart').onclick = () => { this.resetInput(); void this.session?.restart(); };
    $('practiceSolutionToggle').onclick = async () => {
      if (!this.session) return;
      this.showSolution = !this.showSolution; this.selected = null;
      if (this.showSolution) await this.session.revealSolution();
      this.render();
    };
    for (const button of $('practicePromotion').querySelectorAll('[data-promotion]')) button.onclick = () => {
      if (!this.promotion) return;
      const move = this.promotion.find(move => move.promotion === button.dataset.promotion);
      if (move) this.play(move);
    };
  }
  get active() { return Boolean(this.session); }
  start({ title = 'Find the checkmate', returnLabel = 'Return to review', ...options }) {
    this.close(); this.resetInput();
    this.title = title; this.returnLabel = returnLabel;
    this.session = new MatePractice({ ...options, onChange:() => this.render() });
    document.body.classList.add('practice-mode'); $('practicePanel').hidden = false;
    // Do not leave the original game's continuation in the visible practice screen.
    $('coach').replaceChildren(); $('moves').replaceChildren();
    void this.session.start(); this.render();
    $('board').querySelector('button:not(:disabled)')?.focus({ preventScroll:true });
  }
  close() {
    const previous = this.session; this.session = null; previous?.dispose(); this.resetInput();
    document.body.classList.remove('practice-mode'); $('practicePanel').hidden = true;
    $('practiceSolution').replaceChildren(); $('practiceSolution').hidden = true;
  }
  resetInput() { this.selected = null; this.promotion = null; this.showSolution = false; }
  choose(square) {
    const state = this.session?.state; if (!state || state.status !== 'player' || this.promotion) return;
    const choices = state.legalMoves.filter(move => move.from === this.selected && move.to === square);
    if (choices.length) {
      if (choices.some(move => move.promotion)) {
        this.promotion = choices; this.render(); $('practicePromotion button:not(:disabled)')?.focus();
      } else this.play(choices[0]);
      return;
    }
    this.selected = state.legalMoves.some(move => move.from === square) && this.selected !== square ? square : null;
    this.render();
  }
  play(move) {
    this.resetInput();
    void this.session.play(move).catch(error => { if (this.active) $('practiceStatus').textContent = error.message; });
  }
  render() {
    if (!this.session) return;
    const state = this.session.state, busy = ['loading', 'thinking'].includes(state.status);
    $('practicePanel').dataset.state = state.status;
    $('gameTitle').textContent = 'CHECKMATE PRACTICE'; $('positionTitle').textContent = this.title;
    $('practiceReturn').textContent = this.returnLabel;
    $('sideLabel').textContent = `You play ${title(state.attacker)}`;
    $('practiceStatus').textContent = state.message;
    $('practiceUndo').disabled = !state.canUndo;
    $('practiceSolutionToggle').disabled = !['player', 'lost-mate'].includes(state.status) || Boolean(this.promotion);
    $('practiceSolutionToggle').textContent = this.showSolution ? 'Hide solution' : 'Show solution';
    $('practiceSolutionToggle').setAttribute('aria-expanded', String(this.showSolution));
    $('practiceSolution').hidden = !this.showSolution;
    $('practiceSolution').textContent = this.showSolution ? state.solution?.length
      ? `${state.solutionComplete ? 'One mating line from here' : 'Calculated continuation (the full mate was not resolved)'}: ${state.solution.join(' ')}`
      : busy ? 'Calculating…' : 'No forced mating line was found here. Undo your move or start again to see the original solution.' : '';
    $('practicePromotion').hidden = !this.promotion;
    for (const button of $('practicePromotion').querySelectorAll('[data-promotion]')) button.disabled = !this.promotion?.some(move => move.promotion === button.dataset.promotion);
    renderBoard({ element:$('board'), coords:$('coords'), board:state.board, perspective:state.attacker,
      lastMove:state.lastMove, onSquare:square => this.choose(square), selected:this.selected, legalMoves:state.legalMoves,
      disabled:state.status !== 'player' || Boolean(this.promotion) });
  }
}
