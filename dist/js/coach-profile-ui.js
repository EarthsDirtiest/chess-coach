import { buildGameReport, buildProfile } from './coach-profile.js';
import { practiceDrills } from './practice-library.js';

const $ = id => document.getElementById(id);
const node = (tag, text, className) => { const item = document.createElement(tag); item.textContent = text; if (className) item.className = className; return item; };
export class CoachProfileUI {
  constructor({ store, onPractice, onEvidence, onUpdate = () => {} }) {
    this.store = store; this.onPractice = onPractice; this.onEvidence = onEvidence;
    this.onUpdate = onUpdate;
    this.profile = buildProfile([]); this.context = {}; this.latest = null; this.saveVersion = 0; this.listVersion = 0; this.signature = null;
    this.renderProfile(); void this.refresh();
    window.addEventListener('focus', () => { void this.refresh(); });
  }
  async refresh() {
    const version = ++this.listVersion;
    try {
      const reports = await this.store.listReports(); if (version !== this.listVersion) return;
      $('coachProfileError').textContent = '';
      const signature = JSON.stringify(reports.map(report => [report.id, report.updatedAt, report.side, report.score]));
      this.profile = buildProfile(reports);
      if (signature !== this.signature) { this.signature = signature; this.renderProfile(); }
      this.renderInline();
    } catch (error) {
      if (version === this.listVersion) $('coachProfileError').textContent = `${error.message} Coaching progress cannot be loaded or remembered in this browser right now.`;
    }
  }
  setContext(context) { this.context = context; this.renderInline(); }
  async record(game, side, quality, savedGame) {
    const version = ++this.saveVersion; let report;
    try { report = buildGameReport(game, side, quality); }
    catch (error) { this.saveError = { game, side, message:error.message }; this.renderInline(); return; }
    const matches = () => version === this.saveVersion && this.context.game === game && this.context.side === side;
    this.saveError = null; this.pending = { game, side }; this.renderInline();
    try {
      await savedGame;
      const result = await this.store.saveReport(report); await this.refresh();
      if (matches()) {
        const previous = buildProfile(this.profile.reports.filter(item => item.id !== report.id));
        this.latest = { game, side, ...result, comparison:previous.score == null ? null : report.score - previous.score };
        this.saveError = null;
      }
    } catch (error) { if (matches()) this.saveError = { game, side, message:error.message }; }
    finally { if (matches()) { this.pending = null; this.renderInline(); } }
  }
  renderInline() {
    const { game, side, phase, track } = this.context;
    let status = 'Finish a game review to get a personal coaching update.', stats = '', advice = '';
    if (game && !track) status = 'Example game: this review will not change your coaching profile.';
    else if (game && phase !== 'complete') status = 'Your profile will update when the whole review finishes. Paused or incomplete reviews do not change your score.';
    else if (game && !side) status = 'Analysis complete. Choose “I played White” or “I played Black” to add your moves to your coaching profile.';
    else if (game) {
      const latest = this.latest?.game === game && this.latest.side === side ? this.latest : null;
      if (this.saveError?.game === game && this.saveError.side === side) status = `${this.saveError.message} This game’s coaching update was not saved.`;
      else if (this.pending?.game === game && this.pending.side === side) status = 'Saving your coaching update…';
      else if (latest) {
        const report = latest.report;
        status = latest.replaced ? 'Coaching updated. This replaces the previous assessment of this match; it still counts once.' : 'Your coaching profile has been updated after this game.';
        stats = `This game: ${report.score}/100 coach score across ${report.ownMoves} of your moves.${!latest.replaced && latest.comparison != null ? ` ${latest.comparison >= 0 ? '+' : ''}${latest.comparison} points versus your previous recent average.` : ''}`;
        advice = report.incidents.length ? `Next focus: ${this.profile.priorities[0]?.habit || 'Review the moves that lost the most evaluation.'}`
          : 'No tracked errors were found in your moves at this search depth. Keep checking the opponent’s replies as you practice.';
      } else status = 'Analysis complete. Your selected side will be used for this coaching update.';
    }
    if ($('gameCoachStatus').textContent !== status) $('gameCoachStatus').textContent = status;
    $('gameCoachStats').textContent = stats; $('gameCoachAdvice').textContent = advice;
  }
  recommendationCards(scope, count = 3) {
    return this.profile.priorities.slice(0, count).map((priority, index) => {
      const card = node('article', '', 'practice-card');
      card.append(node('span', `${index + 1} · ${index === 0 ? 'Highest impact' : 'Next priority'}`, 'pill'), node('h3', priority.title), node('p', priority.habit));
      card.append(node('div', `${priority.count} tracked ${priority.count === 1 ? 'error' : 'errors'} in ${priority.games} of your last ${Math.min(this.profile.count, 10)} reviews. ${priority.games < 3 ? 'Early signal; more games will help.' : 'Repeated across games.'}`, 'hint'));
      if (priority.recentRate != null) card.append(node('p', `Errors per 100 of your moves: ${priority.recentRate.toFixed(1)} recently vs ${priority.previousRate.toFixed(1)} previously.`, 'hint'));
      for (const id of priority.drills.slice(0, 2)) {
        const drill = practiceDrills.find(drill => drill.id === id); if (!drill) continue;
        const button = node('button', `Practice: ${drill.title}`, 'secondary'); button.type = 'button'; button.id = `coach-${scope}-${index}-${id}`;
        button.onclick = () => this.onPractice({ drill, origin:scope === 'profile' ? 'coach' : 'practice', focusId:button.id });
        const recommendation = node('div', '', 'recommended-practice');
        recommendation.append(button, node('p', `Learning goal: ${drill.learningGoal}`, 'hint')); card.append(recommendation);
      }
      const example = priority.examples[0];
      if (scope === 'profile' && example) {
        card.append(node('p', `${example.title} · ${example.move}. ${example.reason}`, 'hint'));
        const button = node('button', 'Review this move', 'secondary'); button.type = 'button'; button.onclick = () => this.onEvidence(example); card.append(button);
      }
      return card;
    });
  }
  renderProfile() {
    const profile = this.profile;
    $('coachScore').textContent = profile.score == null ? '—' : `${profile.score}/100`;
    $('coachGameCount').textContent = String(profile.count); $('coachMoveCount').textContent = String(profile.moves);
    $('coachTrend').textContent = profile.delta == null ? 'Need 2 games' : `${profile.delta >= 0 ? '+' : ''}${profile.delta} points`;
    $('coachEvidence').textContent = !profile.count ? 'Complete a review and confirm your side to start. Your history is remembered in this browser.'
      : profile.provisional ? 'Early estimate: more complete reviews and at least 30 of your moves will make the patterns more useful.' : 'Priorities use your latest 10 reviewed games. Recent errors and larger evaluation losses carry more weight.';
    $('coachTrendDetail').textContent = profile.delta == null ? 'A second unique game gives your first comparison.'
      : `Latest ${profile.windowSize} ${profile.windowSize === 1 ? 'review' : 'reviews'}: ${profile.recentScore}/100. Previous ${profile.windowSize}: ${profile.previousScore}/100. ${profile.delta >= 2 ? 'Your recent reviews look steadier.' : profile.delta <= -2 ? 'Recent reviews show more costly errors; start with the top priority.' : 'Your recent scores are similar.'}`;
    const cards = this.recommendationCards('profile');
    $('coachPriorities').replaceChildren(...(cards.length ? cards : [node('p', profile.count ? 'No tracked errors were found in these reviews. That is useful evidence, but it does not prove every move was perfect.' : 'Your biggest improvement opportunities will appear here after a complete review.')]));
    const practiceCards = this.recommendationCards('practice');
    $('practiceRecommendations').replaceChildren(...(practiceCards.length ? practiceCards : [node('p', profile.count ? 'No specific weakness stands out yet. Keep reviewing games to build evidence.' : 'Analyze a game and confirm your side to get practice suggestions based on your own moves.')]));
    $('coachTimeline').replaceChildren(...profile.reports.slice(-10).reverse().map(report => {
      const row = document.createElement('tr');
      const cell = document.createElement('td'), button = node('button', report.title, 'timeline-game'); button.type = 'button';
      button.onclick = () => this.onEvidence({ gameId:report.id, side:report.side, ply:0 }); cell.append(button);
      row.append(cell, node('td', report.side === 'white' ? 'White' : 'Black'), node('td', String(report.ownMoves)), node('td', `${report.score}/100`)); return row;
    }));
    $('coachTimelineEmpty').hidden = profile.count > 0;
    this.onUpdate();
  }
}
