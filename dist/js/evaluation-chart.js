import { formatScore } from './chess-review.js';

export function plotValue(analysis) {
  const score = analysis?.score;
  if (!score || !Number.isFinite(score.value)) return null;
  if (score.type === 'mate') return score.value === 0 ? (score.winner === 'white' ? 300 : -300) : Math.sign(score.value) * 300;
  return score.type === 'cp' ? Math.max(-300, Math.min(300, score.value)) : null;
}
export function evaluationSegments(analyses) {
  const segments = []; let current = [];
  analyses.forEach((analysis, ply) => {
    const value = plotValue(analysis);
    if (value == null) { if (current.length) segments.push(current); current = []; }
    else current.push({ ply, value });
  });
  if (current.length) segments.push(current);
  return segments;
}
export class EvaluationChart {
  constructor(element, onNavigate) {
    this.element = element; this.onNavigate = onNavigate;
    element.tabIndex = 0; element.setAttribute('role', 'img');
    element.onclick = event => {
      if (!this.game?.history.length) return;
      const bounds = element.getBoundingClientRect(), fraction = (event.clientX - bounds.left) / bounds.width;
      const graphX = Math.max(0, Math.min(1, (fraction * 500 - 34) / 452));
      onNavigate(Math.round(graphX * this.game.history.length));
    };
    element.onkeydown = event => {
      if (!this.game || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      onNavigate(event.key === 'Home' ? 0 : event.key === 'End' ? this.game.history.length : this.ply + (event.key === 'ArrowRight' ? 1 : -1));
    };
  }
  render(game, ply) {
    this.game = game; this.ply = ply;
    const analyses = game?.analyses || [], max = Math.max(1, game?.history.length || 1);
    const x = index => 34 + index / max * 452, y = value => 66 - value / 300 * 51;
    const segments = evaluationSegments(analyses);
    const grid = [-300,-150,0,150,300].map(value => `<line x1="34" x2="486" y1="${y(value)}" y2="${y(value)}" stroke="${value === 0 ? '#344653' : '#21313c'}" stroke-width="1"/><text x="2" y="${y(value) + 3}" fill="#92a9bb" font-size="10">${value > 0 ? '+' : ''}${value / 100}</text>`).join('');
    const labels = [...new Set([0, Math.round(max / 4), Math.round(max / 2), Math.round(max * .75), max])].map(index => `<line x1="${x(index)}" x2="${x(index)}" y1="15" y2="117" stroke="#21313c"/><text x="${x(index)}" y="138" text-anchor="middle" fill="#92a9bb" font-size="10">${index}</text>`).join('');
    const lines = segments.map(segment => `<path d="${segment.map((point, i) => `${i ? 'L' : 'M'}${x(point.ply).toFixed(2)},${y(point.value).toFixed(2)}`).join(' ')}" fill="none" stroke="#31d6ab" stroke-width="2"/>${segment.length < 70 ? segment.map(point => `<circle cx="${x(point.ply)}" cy="${y(point.value)}" r="2.4" fill="${point.value >= 0 ? '#36d5ac' : '#e2bb5c'}"/>`).join('') : ''}`).join('');
    const selected = plotValue(analyses[ply]);
    const marker = analyses.length ? `<line x1="${x(ply)}" x2="${x(ply)}" y1="10" y2="119" stroke="#c7ddd7" stroke-dasharray="3 3" opacity=".75"/>${selected == null ? '' : `<circle cx="${x(ply)}" cy="${y(selected)}" r="4" fill="#37dfb1" stroke="#e9f5ed" stroke-width="1.3"/>`}` : '';
    this.element.innerHTML = `<svg viewBox="0 0 500 145" preserveAspectRatio="none" aria-hidden="true">${grid}${labels}${lines}${marker}${segments.length ? '' : '<text x="260" y="68" text-anchor="middle" fill="#7a94a6" font-size="12">No analyzed positions yet</text>'}</svg>`;
    this.element.setAttribute('aria-label', `Evaluation over time, White viewpoint. Position ${ply}: ${analyses[ply] ? formatScore(analyses[ply].score) : 'pending'}. Use arrow keys to browse. Graph capped at three pawns.`);
  }
}
