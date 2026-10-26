import { formatScore } from './chess-review.js';

export function renderMoves({ element, game, ply, coachingFor, isOwn, onNavigate }) {
  const scrollTop = element.scrollTop, fragment = document.createDocumentFragment(), rows = new Map();
  for (const state of game.states.slice(1)) {
    if (!rows.has(state.moveNumber)) rows.set(state.moveNumber, {});
    rows.get(state.moveNumber)[state.black ? 'black' : 'white'] = state;
  }
  for (const [number, turns] of rows) {
    const row = document.createElement('div'); row.className = 'move-row';
    const label = document.createElement('span'); label.className = 'move-number'; label.textContent = number; row.append(label);
    for (const color of ['white','black']) {
      const state = turns[color]; if (!state) { row.append(document.createElement('span')); continue; }
      const coaching = coachingFor(state), pending = !game.analyses[state.ply - 1] || !game.analyses[state.ply];
      const button = document.createElement('button');
      button.type = 'button'; button.className = `move${ply === state.ply ? ' selected' : ''}${isOwn(state) ? ' own' : ''}${pending ? ' pending' : ''}${['Mistake','Blunder'].includes(coaching.level) ? ' flagged' : ''}`;
      button.dataset.ply = state.ply; button.textContent = state.san;
      button.setAttribute('aria-current', ply === state.ply ? 'step' : 'false');
      button.setAttribute('aria-label', `${number}${state.black ? '...' : '.'} ${state.san}, ${color}, ${coaching.level}`);
      button.title = `${color === 'white' ? 'White' : 'Black'}: ${coaching.level}`;
      button.onclick = () => onNavigate(state.ply); row.append(button);
    }
    const evaluation = document.createElement('span'), last = turns.black || turns.white;
    const analysis = game.analyses[last.ply];
    evaluation.className = 'move-evaluation'; evaluation.textContent = analysis?.terminal && analysis.score.type === 'mate' ? 'M0' : analysis ? formatScore(analysis.score) : '—';
    evaluation.title = analysis ? formatScore(analysis.score) : 'Pending'; row.append(evaluation);
    fragment.append(row);
  }
  element.replaceChildren(fragment); element.scrollTop = scrollTop;
}
