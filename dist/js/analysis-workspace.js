import { formatScore, lineToSan, summarizeGame, coachMove } from './chess-review.js';
import { gameIdentity } from './game-history.js';
import { skills } from './coach-profile.js';
import { icon, hydrateIcons } from './icons.js';
import { EvaluationChart, plotValue } from './evaluation-chart.js';

const $ = id => document.getElementById(id);
const text = (id, value) => { $(id).textContent = value; };
export class AnalysisWorkspace {
  constructor({ onNavigate, onFlip, getProfile }) {
    this.onNavigate = onNavigate; this.getProfile = getProfile; this.context = null; this.playTimer = null;
    hydrateIcons(); this.chart = new EvaluationChart($('evaluationChart'), onNavigate);
    $('flipBoard').onclick = onFlip;
    $('playMoves').onclick = () => this.togglePlayback();
    $('openImport').onclick = $('mobileImport').onclick = $('importNextGame').onclick = () => this.openImport();
    $('closeImport').onclick = () => $('importDialog').close();
    $('coach').addEventListener('click', event => { if (event.target.closest('[data-open-import]')) this.openImport(); });
    this.errorObserver = new MutationObserver(() => text('importError', $('error').textContent));
    this.errorObserver.observe($('error'), { childList:true, characterData:true, subtree:true });
    $('importDialog').addEventListener('click', event => { if (event.target === $('importDialog')) { const box = event.target.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.target.close(); } });
    for (const button of document.querySelectorAll('[data-go]')) button.onclick = () => { $(button.dataset.go + 'Tab').click(); this.closeMenu(); };
    $('menuToggle').onclick = () => { const expanded = $('mobileMenu').hidden; $('mobileMenu').hidden = !expanded; $('menuToggle').setAttribute('aria-expanded', String(expanded)); };
    document.addEventListener('keydown', event => { if (event.key === 'Escape') this.closeMenu(); });
    for (const button of document.querySelectorAll('#analysisTabs [data-analysis-panel]')) {
      button.onclick = () => this.setPanel(button.dataset.analysisPanel);
      button.onkeydown = event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation(); const panels = ['coach','moves','engine'];
        const current = panels.indexOf(document.body.dataset.analysisPanel);
        const panel = panels[event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (current + (event.key === 'ArrowRight' ? 1 : 2)) % 3];
        this.setPanel(panel); $(panel + 'PanelTab').focus();
      };
    }
    $('engineBadge').onclick = $('focusEngine').onclick = () => { $('reviewTab').click(); this.setPanel('engine'); $('engineTop').scrollIntoView({ block:'nearest' }); };
    $('openingLessons').onclick = $('exploreOpenings').onclick = () => { $('practiceTab').click(); document.querySelector('[data-category="openings"]').click(); };
    $('analysisSettings').onclick = () => { $('reviewTab').click(); $('quality').focus(); };
    $('showLine').onclick = () => {
      if ($('revealMateAnalysis')) { $('revealMateAnalysis').click(); return; }
      this.lineVisible = !this.lineVisible; this.showLineVisibility();
    };
    $('practicePosition').onclick = () => $('tryMate').click();
    $('showBlunders').onclick = () => this.visitGrade('Blunder'); $('showMistakes').onclick = () => this.visitGrade('Mistake');
    window.addEventListener('pagehide', () => this.stopPlayback());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stopPlayback(); });
    const media = window.matchMedia('(max-width: 800px)');
    const resize = () => { document.querySelector('.app-tabs').setAttribute('aria-orientation', media.matches ? 'horizontal' : 'vertical'); };
    media.addEventListener('change', resize); resize();
  }
  closeMenu() { $('mobileMenu').hidden = true; $('menuToggle').setAttribute('aria-expanded', 'false'); }
  openImport() { if (document.body.classList.contains('practice-mode')) return; this.stopPlayback(); this.closeMenu(); if (!$('importDialog').open) $('importDialog').showModal(); $('pgn').focus(); }
  setPractice(active) { this.stopPlayback(); for (const id of ['openImport','mobileImport','importNextGame']) $(id).disabled = active; }
  setPanel(panel) {
    document.body.dataset.analysisPanel = panel;
    for (const button of document.querySelectorAll('#analysisTabs [data-analysis-panel]')) {
      const selected = button.dataset.analysisPanel === panel; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    }
  }
  setView(tab) {
    this.stopPlayback(); this.closeMenu();
    const labels = { review:['Game Analysis','Deep analysis. Clear feedback. Stronger chess.'], practice:['Practice','A focused session for your next better move.'], history:['My Games','Your games, your lessons, all in one place.'], coach:['My Coach','Work on what will make the biggest difference.'] };
    text('pageTitle', labels[tab][0]); text('pageSubtitle', labels[tab][1]);
  }
  stopPlayback() {
    clearInterval(this.playTimer); this.playTimer = null;
    $('playMoves').innerHTML = icon('play'); $('playMoves').setAttribute('aria-label','Play through game');
  }
  togglePlayback() {
    if (this.playTimer) { this.stopPlayback(); return; }
    if (!this.context?.game || document.body.classList.contains('practice-mode')) return;
    if (this.context.ply >= this.context.game.history.length) this.onNavigate(0);
    $('playMoves').innerHTML = icon('pause'); $('playMoves').setAttribute('aria-label','Pause playback');
    this.playTimer = setInterval(() => {
      if (!this.context?.game || document.body.classList.contains('practice-mode') || this.context.ply >= this.context.game.history.length) { this.stopPlayback(); return; }
      this.onNavigate(this.context.ply + 1);
    }, 850);
  }
  visitGrade(grade) {
    const game = this.context?.game; if (!game) return;
    const targets = game.states.slice(1).filter(state => (state.black ? 'black' : 'white') === this.context.side && coachMove(game, state.ply, this.context.side).level === grade);
    const next = targets.find(state => state.ply > this.context.ply) || targets[0];
    if (next) { this.onNavigate(next.ply); this.setPanel('coach'); $('coachPane').scrollIntoView({ block:'nearest' }); }
  }
  showLineVisibility() {
    const hidden = Boolean(this.context?.hiddenMate);
    for (const line of $('coach').querySelectorAll('.continuation')) line.hidden = !this.lineVisible;
    $('showLine').setAttribute('aria-expanded', String(this.lineVisible && !hidden));
    $('showLine').innerHTML = icon('link') + (hidden ? 'Reveal analysis' : this.lineVisible ? 'Hide line' : 'Show line');
  }
  render(context) {
    const previous = this.context; this.context = context;
    if (previous?.game !== context.game) { this.stopPlayback(); if ($('importDialog').open) $('importDialog').close(); }
    if (previous?.game !== context.game || previous?.ply !== context.ply) this.lineVisible = false;
    const { game, ply, side, phase, hiddenMate, coaching } = context, analysis = game?.analyses[ply];
    const terminalMate = analysis?.terminal && analysis.score.type === 'mate' && analysis.score.value === 0;
    const score = terminalMate ? 'M0' : analysis?.score ? formatScore(analysis.score) : '—', value = plotValue(analysis);
    const advantage = value == null ? 'Awaiting analysis' : terminalMate ? `${analysis.score.winner === 'white' ? 'White' : 'Black'} wins by mate` : analysis.score.type === 'mate' ? `${value > 0 ? 'White' : 'Black'} has mate` : Math.abs(value) < 30 ? 'Roughly balanced' : `${value > 0 ? 'White' : 'Black'} is better`;
    text('liveEvaluation', score); text('mobileEvaluation', score); text('advantageText', advantage); text('mobileAdvantage', advantage);
    const share = value == null ? 50 : analysis.score.type === 'mate' ? (value > 0 ? 100 : 0) : Math.max(4, Math.min(96, 50 + analysis.score.value / 12));
    for (const id of ['verticalGauge','mobileGauge']) $(id).style.setProperty('--white-share', `${share}%`);
    $('mobileGauge').setAttribute('aria-valuenow', String(Math.round(share))); $('mobileGauge').setAttribute('aria-valuetext', `${score}, ${advantage}`);
    text('liveDepth', analysis ? analysis.terminal ? 'Terminal position' : `Depth ${analysis.depth}` : 'Awaiting Stockfish');
    const status = { idle:'Ready to analyze', loading:'Loading Stockfish', running:'Analyzing game', paused:'Review paused', complete:'Analysis complete', error:'Engine unavailable' };
    text('headerStatus', status[phase]);
    $('importNextGame').hidden = !game || phase !== 'complete';
    text('headerDepth', analysis && !analysis.terminal ? `Stockfish · Depth ${analysis.depth}` : 'Stockfish · local engine');
    $('engineBadge').dataset.state = phase;
    text('profileName', game?.headers[side === 'white' ? 'White' : 'Black'] || 'Your profile');
    this.chart.render(game, ply);
    text('chartCaption', game ? `Position ${ply} / ${game.history.length} · ${analysis ? score : 'Pending'} · ±3 pawn chart range` : 'Import a game to see its evaluation over time.');
    text('engineContinuation', hiddenMate ? 'Mating line hidden. Choose “Reveal analysis” when you need it.' : analysis?.terminal ? 'The game has ended in this position.' : analysis?.pv?.length ? lineToSan(game.states[ply].fen, analysis.pv, 10).join('  ') : 'Waiting for a reviewed position.');
    text('moveGrade', coaching?.level || 'Ready');
    $('moveGrade').dataset.grade = coaching?.level || '';
    $('playMoves').disabled = !game; $('flipBoard').disabled = !game;
    $('showLine').disabled = !game || (!hiddenMate && !coaching?.pvSan?.length);
    $('practicePosition').disabled = $('tryMate').hidden;
    text('positionPracticeHint', !$('tryMate').hidden ? 'Play the attacking side against Stockfish. Your review is kept.' : 'When a forced mate is found, you can try it on the board.');
    this.showLineVisibility(); this.renderSummary();
  }
  renderSummary() {
    if (!this.context) return;
    const { game, side, owner, phase } = this.context;
    const profile = this.getProfile(), report = game && owner && phase === 'complete' ? profile.reports.find(report => report.id === gameIdentity(game) && report.side === owner) : null;
    text('summaryScore', report ? `${report.score}%` : '—');
    text('summaryScoreNote', report ? 'Your personal coach score' : 'Complete review & confirm your side');
    const summary = game ? summarizeGame(game, side) : null;
    text('summaryBlunders', summary ? String(summary.blunders) : '—'); text('summaryMistakes', summary ? String(summary.mistakes) : '—');
    $('showBlunders').disabled = !summary?.blunders; $('showMistakes').disabled = !summary?.mistakes;
    text('summaryFocus', profile.priorities[0]?.title || 'Build your game plan');
    const fragment = document.createDocumentFragment();
    const incidents = report?.incidents.slice().sort((a, b) => b.cost - a.cost).slice(0, 3) || [];
    for (const incident of incidents) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'insight';
      const symbol = document.createElement('span'); symbol.className = 'insight-symbol'; symbol.innerHTML = icon(incident.skill === 'king' ? 'shield' : incident.skill === 'opening' ? 'book' : 'target');
      const description = document.createElement('span'), title = document.createElement('strong'), body = document.createElement('p');
      title.textContent = skills[incident.skill].title; body.textContent = `${incident.move} · ${incident.reason}`; description.append(title, body); button.append(symbol, description);
      button.insertAdjacentHTML('beforeend', icon('next')); button.onclick = () => { this.onNavigate(incident.ply); this.setPanel('coach'); }; fragment.append(button);
    }
    if (!incidents.length) {
      const p = document.createElement('p'); p.className = 'hint'; p.textContent = report ? 'No tracked errors were found in your moves at this depth.' : 'Complete the review and confirm your side to see the key moments from your game.'; fragment.append(p);
    }
    $('liveInsights').replaceChildren(fragment);
  }
}
