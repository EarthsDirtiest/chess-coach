import { practiceDrills } from './practice-library.js';
import { getMateOpportunity } from './mate-practice.js';

const $ = id => document.getElementById(id);
export class PracticeHub {
  constructor({ onStart, onReview }) {
    this.category = 'all'; this.game = null; this.signature = '';
    for (const [kind, container] of [['opening', 'openingCards'], ['mate', 'mateCards'], ['puzzle', 'puzzleCards']]) {
      $(container).replaceChildren(...practiceDrills.filter(drill => drill.kind === kind).map(drill => {
        const card = document.createElement('article'); card.className = 'practice-card';
        const badge = document.createElement('span'); badge.className = 'pill';
        badge.textContent = kind === 'opening' ? `Opening line · Play as ${drill.side === 'white' ? 'White' : 'Black'}` : kind === 'puzzle' ? 'Tactics · Play as White' : 'Stockfish defense';
        const title = document.createElement('h3'); title.textContent = drill.title;
        const description = document.createElement('p'); description.textContent = drill.description || (drill.id === 'mate-two'
          ? 'Plan your first move, face Stockfish’s defense, and finish the mating attack.' : 'Find the move that ends the game. Keep the solution hidden until you need it.');
        const button = document.createElement('button'); button.type = 'button'; button.className = 'primary';
        button.id = 'drill-' + drill.id; button.dataset.drill = drill.id;
        button.textContent = kind === 'opening' ? 'Practice opening' : kind === 'puzzle' ? 'Solve puzzle' : 'Try checkmate';
        card.append(badge, title, description, button); return card;
      }));
    }
    for (const button of document.querySelectorAll('[data-category]')) button.onclick = () => {
      this.category = button.dataset.category;
      for (const filter of document.querySelectorAll('[data-category]')) filter.setAttribute('aria-pressed', String(filter.dataset.category === this.category));
      for (const group of document.querySelectorAll('[data-practice-group]')) group.hidden = this.category !== 'all' && group.dataset.practiceGroup !== this.category;
    };
    for (const button of document.querySelectorAll('[data-drill]')) button.onclick = () => {
      const drill = practiceDrills.find(drill => drill.id === button.dataset.drill);
      if (drill) onStart({ drill, focusId:button.id });
    };
    this.onStart = onStart; $('practiceGoReview').onclick = onReview;
  }
  updateGame(game, phase) {
    const mates = game ? game.states.flatMap((state, ply) => {
      const opportunity = getMateOpportunity(state, game.analyses[ply]);
      return opportunity ? [{ state, ply, ...opportunity }] : [];
    }) : [];
    const signature = mates.map(mate => `${mate.ply}:${mate.attacker}:${mate.mateIn}`).join('|');
    $('practiceGameStatus').textContent = !game ? 'Review a game to find mating attacks you can try here.' : mates.length
      ? `${mates.length} mating ${mates.length === 1 ? 'position' : 'positions'} found in your current game. Choose one to practice.`
      : ['loading', 'running'].includes(phase) ? 'Your game is being reviewed. Mating positions will appear here as they are found.'
      : phase === 'complete' ? 'No forced mates were found in this review. Try a starter exercise, or review another game.'
      : 'No mating positions found yet. Resume the review to search the remaining positions.';
    if (this.game === game && this.signature === signature) return;
    this.game = game; this.signature = signature;
    const list = $('practiceGameMates'), scrollTop = list.scrollTop;
    const focusId = list.contains(document.activeElement) ? document.activeElement.id : null;
    $('practiceGameMates').replaceChildren(...mates.map(mate => {
      const button = document.createElement('button'), state = mate.state;
      button.type = 'button'; button.className = 'secondary'; button.id = `practice-game-${mate.ply}`;
      button.textContent = `${state.move ? `After ${state.moveNumber}${state.black ? '...' : '.'} ${state.san}` : 'Starting position'} · ${mate.attacker === 'white' ? 'White' : 'Black'} to mate`;
      button.onclick = () => this.onStart({ positionPly:mate.ply, focusId:button.id }); return button;
    }));
    list.scrollTop = scrollTop;
    if (focusId) $(focusId)?.focus({ preventScroll:true });
  }
}
