import { practiceDrills } from './practice-library.js';
import { getMateOpportunity } from './mate-practice.js';
import { subjectLabel } from './practice-goals.js';

const $ = id => document.getElementById(id);
export class PracticeHub {
  constructor({ onStart, onReview }) {
    this.category = 'all'; this.game = null; this.signature = '';
    this.cards = [];
    for (const [kind, container] of [['opening', 'openingCards'], ['mate', 'mateCards'], ['puzzle', 'puzzleCards']]) {
      $(container).replaceChildren(...practiceDrills.filter(drill => drill.kind === kind).map(drill => {
        const card = document.createElement('article'); card.className = 'practice-card';
        const badge = document.createElement('span'); badge.className = 'pill';
        badge.textContent = `${subjectLabel(drill.difficulty)} · Play as ${drill.side === 'white' ? 'White' : 'Black'}`;
        const title = document.createElement('h3'); title.textContent = drill.title;
        const description = document.createElement('p'); description.className = 'practice-card-goal'; description.textContent = `Learning goal: ${drill.learningGoal}`;
        const subject = document.createElement('span'); subject.className = 'practice-subject'; subject.textContent = subjectLabel(drill.subject);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'primary';
        button.id = 'drill-' + drill.id; button.dataset.drill = drill.id;
        button.textContent = kind === 'opening' ? 'Practice opening' : kind === 'puzzle' ? 'Solve puzzle' : 'Try checkmate';
        card.append(badge, title, subject, description, button);
        this.cards.push({ card, drill }); return card;
      }));
    }
    for (const button of document.querySelectorAll('[data-category]')) button.onclick = () => {
      this.category = button.dataset.category;
      for (const filter of document.querySelectorAll('[data-category]')) filter.setAttribute('aria-pressed', String(filter.dataset.category === this.category));
      this.filter();
    };
    for (const subject of [...new Set(practiceDrills.map(drill => drill.subject))].sort()) {
      const option = document.createElement('option'); option.value = subject; option.textContent = subjectLabel(subject); $('practiceSubject').append(option);
    }
    for (const id of ['practiceSearch','practiceSubject','practiceDifficulty']) $(id).addEventListener(id === 'practiceSearch' ? 'input' : 'change', () => this.filter());
    this.filter();
    for (const button of document.querySelectorAll('[data-drill]')) button.onclick = () => {
      const drill = practiceDrills.find(drill => drill.id === button.dataset.drill);
      if (drill) onStart({ drill, focusId:button.id });
    };
    this.onStart = onStart; $('practiceGoReview').onclick = onReview;
  }
  filter() {
    const query = $('practiceSearch').value.trim().toLocaleLowerCase(), subject = $('practiceSubject').value, level = $('practiceDifficulty').value;
    const kinds = { opening:'openings', mate:'checkmates', puzzle:'puzzles' }; let count = 0;
    for (const { card, drill } of this.cards) {
      card.hidden = (this.category !== 'all' && kinds[drill.kind] !== this.category)
        || (subject !== 'all' && drill.subject !== subject) || (level !== 'all' && drill.difficulty !== level)
        || (query && !`${drill.title} ${drill.learningGoal} ${subjectLabel(drill.subject)} ${drill.topics.join(' ')}`.toLocaleLowerCase().includes(query));
      if (!card.hidden) count++;
    }
    for (const group of document.querySelectorAll('[data-practice-group]')) {
      const visible = this.cards.some(({ card, drill }) => kinds[drill.kind] === group.dataset.practiceGroup && !card.hidden);
      // Keep review-derived mates available within the checkmates category.
      group.hidden = !visible && !(group.dataset.practiceGroup === 'checkmates' && ['all','checkmates'].includes(this.category) && !query && subject === 'all' && level === 'all');
    }
    $('practiceCount').textContent = `${count} of ${practiceDrills.length} practices shown`;
    $('practiceEmpty').hidden = count > 0;
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
