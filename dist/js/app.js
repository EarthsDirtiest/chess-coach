import { parseGame, coachMove, summarizeGame, formatScore, terminalAnalysis } from './chess-review.js';
import { StockfishEngine } from './stockfish-engine.js';
import { sample } from './example-game.js';
import { renderBoard } from './chess-board.js';
import { getMateOpportunity } from './mate-practice.js';
import { MatePracticeUI } from './mate-practice-ui.js';
import { PracticeHub } from './practice-hub.js';
import { GameHistoryUI } from './game-history-ui.js';
import { CoachProfileUI } from './coach-profile-ui.js';
import { AnalysisWorkspace } from './analysis-workspace.js';
import { renderMoves } from './move-list.js';

const $ = id => document.getElementById(id);
const start = () => ['rnbqkbnr','pppppppp','........','........','........','........','PPPPPPPP','RNBQKBNR'].map(row => row.split(''));
const qualities = { quick: { depth:16, moveTimeMs:350 }, balanced: { depth:18, moveTimeMs:700 }, deep: { depth:22, moveTimeMs:1500 } };
let game = null, ply = 0, side = 'white', engine = null, runVersion = 0, phase = 'idle';
let reviewSnapshot = null;
let activeTab = 'review';
let importVersion = 0;
let boardFlipped = false;
const tabScroll = { review:0, practice:0, history:0, coach:0 };
const tabs = ['review', 'practice', 'history', 'coach'];
let trackGame = true, currentGameSaved = Promise.resolve(), reportSignature = '', lastReviewQuality = 'balanced';
const revealedPositions = new Set();
const workspace = new AnalysisWorkspace({ onNavigate:jump, onFlip:() => { boardFlipped = !boardFlipped; render(); }, getProfile:() => coachProfile.profile });
const practice = new MatePracticeUI({ onReturn:returnToReview });
const hub = new PracticeHub({ onStart:options => enterPractice({ ...options, origin:'practice' }), onReview:() => changeTab('review') });
const historyUI = new GameHistoryUI({ onOpen:record => {
  try { if (record.report) $('player').value = record.report.side; load(record.pgn, { save:false }); changeTab('review'); $('saveStatus').textContent = 'Opened from game history. Stockfish is reviewing the saved PGN.'; }
  catch (error) { $('historyError').textContent = `This saved game could not be opened: ${error.message}`; }
} });
const coachProfile = new CoachProfileUI({ store:historyUI.store, onUpdate:() => workspace.renderSummary(), onPractice:enterPractice, onEvidence:async example => {
  try {
    const record = await historyUI.store.get(example.gameId);
    if (!record) throw new Error('The original PGN is unavailable. Import the game again to revisit this move.');
    $('player').value = example.side; load(record.pgn, { save:false }); changeTab('review'); jump(example.ply);
  } catch (error) { $('coachProfileError').textContent = error.message; }
} });

function confirmedSide() {
  if (!game) return null;
  if (['white','black'].includes($('player').value)) return $('player').value;
  if (game.headers.White?.toLowerCase() === 'earthsdirtiest') return 'white';
  if (game.headers.Black?.toLowerCase() === 'earthsdirtiest') return 'black';
  return null;
}
function recordCompletedReview() {
  const owner = confirmedSide();
  if (!game || phase !== 'complete' || !trackGame || !owner) return;
  const signature = `${runVersion}:${owner}`; if (signature === reportSignature) return;
  reportSignature = signature;
  void coachProfile.record(game, owner, lastReviewQuality, currentGameSaved).then(() => historyUI.refresh());
}

function activateTab(tab) {
  activeTab = tab;
  for (const name of tabs) {
    const selected = name === tab;
    $(name + 'Tab').setAttribute('aria-selected', String(selected)); $(name + 'Tab').tabIndex = selected ? 0 : -1;
    $(name + 'View').hidden = !selected;
  }
  workspace.setView(tab);
}
function changeTab(tab) {
  if (practice.active) { returnToReview({ destination:tab }); return; }
  if (activeTab === tab) return;
  tabScroll[activeTab] = window.scrollY; activateTab(tab); window.scrollTo(0, tabScroll[tab]);
  if (tab === 'history') void historyUI.refresh();
  if (tab === 'coach') void coachProfile.refresh();
}
function enterPractice({ drill = null, positionPly = ply, origin = 'review', focusId = 'tryMate' } = {}) {
  if (practice.active) return;
  workspace.stopPlayback();
  const state = game?.states[positionPly], analysis = drill?.analysis || game?.analyses[positionPly];
  if (!drill && (!state || !getMateOpportunity(state, analysis))) return;
  reviewSnapshot = { ply, side, phase, resume:['loading', 'running'].includes(phase), scrollTop:$('moves').scrollTop,
    details:$('engineDetails').open, pageY:window.scrollY, origin, focusId };
  tabScroll[origin] = window.scrollY;
  cancelReview('paused');
  $('practiceHubError').textContent = '';
  if (origin !== 'review') {
    $('practiceSession').appendChild($('reviewBoard')); $('practiceSession').hidden = false; $('practiceHub').hidden = true;
    activateTab('practice');
  }
  try {
    practice.start({ drill, initialFen:drill ? drill.fen : game.initialFen, moves:drill ? [] : state.uciMoves, analysis,
      title:drill?.title || 'Find the checkmate', returnLabel:origin === 'coach' ? 'Return to my coach' : origin === 'practice' ? 'Return to practices' : 'Return to review' });
    workspace.setPractice(true);
    window.scrollTo(0, 0);
  }
  catch (error) { returnToReview(); $(origin === 'coach' ? 'coachProfileError' : origin === 'practice' ? 'practiceHubError' : 'error').textContent = error.message; }
}
function returnToReview({ resume = true, destination = null } = {}) {
  practice.close();
  workspace.setPractice(false);
  const saved = reviewSnapshot; reviewSnapshot = null;
  if (!saved) { render(); return; }
  $('reviewView').insertBefore($('reviewBoard'), $('reviewRight'));
  $('practiceSession').hidden = true; $('practiceHub').hidden = false;
  activateTab(destination || saved.origin);
  ply = saved.ply; side = saved.side; phase = saved.resume ? 'paused' : saved.phase;
  $('engineDetails').open = saved.details; render(); $('moves').scrollTop = saved.scrollTop;
  const sameTab = activeTab === saved.origin;
  $(sameTab ? saved.focusId : activeTab + 'Tab')?.focus({ preventScroll:true });
  window.scrollTo(0, sameTab ? saved.pageY : tabScroll[activeTab]);
  if (saved.resume && resume) void startReview();
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}
function moveLabel(state) { return state.move ? `${state.moveNumber}${state.black ? '...' : '.'} ${state.san}` : 'Starting position'; }
function selectedSide(headers) {
  const choice = $('player').value;
  if (choice !== 'auto') return choice;
  return headers.White?.toLowerCase() === 'earthsdirtiest' ? 'white' : 'black';
}
function isOwn(state) { return Boolean(state.move) && state.black === (side === 'black'); }
function recommendationLabel(state) {
  if (!state.move) return 'A line to explore';
  const sameBest = state.move.uci === game.analyses[state.ply - 1]?.bestMove;
  return isOwn(state) ? (sameBest ? 'A line to explore' : 'Try this instead') : (sameBest ? 'Their continuation' : 'Their better option');
}
function disposeEngine(value) { if (value) value.dispose(); }
function cancelReview(nextPhase = 'paused') {
  runVersion++;
  const previous = engine;
  engine = null; phase = nextPhase;
  disposeEngine(previous);
}
function load(input, { save = true, track = true } = {}) {
  if (practice.active) return;
  const nextGame = parseGame(input);
  importVersion++;
  cancelReview('idle');
  game = nextGame; ply = 0; side = selectedSide(game.headers);
  boardFlipped = false;
  trackGame = track; reportSignature = '';
  $('pgn').value = input;
  revealedPositions.clear();
  $('error').textContent = '';
  render();
  $('saveStatus').textContent = save ? 'Saving to local game history…' : '';
  currentGameSaved = save ? historyUI.save(nextGame, input) : Promise.resolve();
  if (save) void currentGameSaved.then(result => {
    if (game === nextGame) $('saveStatus').textContent = result.duplicate ? 'This match is already in your history. No duplicate was added.' : 'Saved to game history in this browser.';
  }).catch(error => { if (game === nextGame) $('saveStatus').textContent = `${error.message} This review is available, but the game was not saved.`; });
  void startReview();
}
async function startReview() {
  if (!game || practice.active) return;
  cancelReview('loading');
  const version = runVersion, target = game, quality = qualities[$('quality').value] || qualities.balanced;
  lastReviewQuality = $('quality').value;
  const isCurrent = () => version === runVersion && game === target;
  let activeEngine = null;
  $('error').textContent = '';
  for (let i = 0; i < target.states.length; i++) {
    if (!target.analyses[i]) target.analyses[i] = terminalAnalysis(target.states[i]);
  }
  render();
  try {
    if (target.analyses.some(value => !value)) {
      activeEngine = new StockfishEngine(); engine = activeEngine;
      await activeEngine.init();
      if (!isCurrent()) return;
      phase = 'running'; render();
      for (let i = 0; i < target.states.length; i++) {
        if (target.analyses[i]) continue;
        const state = target.states[i];
        const analysis = await activeEngine.analyze({ fen:state.fen, initialFen:target.initialFen, moves:state.uciMoves, ...quality });
        if (!isCurrent()) return;
        target.analyses[i] = analysis;
        render();
      }
    }
    if (isCurrent()) { phase = 'complete'; render(); recordCompletedReview(); }
  } catch (error) {
    if (isCurrent()) {
      phase = 'error';
      $('error').textContent = `Stockfish could not complete this review. ${error.message || String(error)} Completed positions are preserved; remaining moves are pending. You can retry.`;
      render();
    }
  } finally {
    disposeEngine(activeEngine);
    if (isCurrent()) engine = null;
  }
}
function renderEngine() {
  const total = game?.states.length || 0, done = game?.analyses.filter(Boolean).length || 0;
  const busy = phase === 'loading' || phase === 'running';
  $('engineStatus').dataset.state = phase;
  const progress = total ? `${done} / ${total} positions reviewed` : 'Load a game to start Stockfish.';
  const prefixes = { loading:'Loading local Stockfish… ', running:'Stockfish analyzing… ', paused:'Review paused. ', complete:'Review complete. ', error:'Engine unavailable. ' };
  $('engineStatus').textContent = (prefixes[phase] || '') + progress;
  $('engineProgress').max = total || 1; $('engineProgress').value = done;
  $('reviewAction').disabled = !game;
  $('reviewAction').textContent = busy ? 'Stop review' : phase === 'complete' ? 'Reanalyze game' : phase === 'error' ? 'Retry remaining positions' : 'Resume review';
}
function render() {
  if (practice.active) { practice.render(); return; }
  const state = game?.states[ply] || { board:start(), ply:0, move:null };
  const coaching = game ? coachMove(game, ply, side) : null;
  const opportunity = getMateOpportunity(state, game?.analyses[ply]), hiddenMate = opportunity && !revealedPositions.has(ply);
  const perspective = boardFlipped ? (side === 'white' ? 'black' : 'white') : side;
  renderBoard({ element:$('board'), coords:$('coords'), ranks:$('ranks'), arrow:$('moveArrow'), board:state.board, perspective, lastMove:state.move,
    critical:hiddenMate ? [] : coaching?.critical });
  const total = game?.history.length || 0;
  $('step').textContent = `${ply} / ${total}`; $('seek').max = total; $('seek').value = ply;
  for (const id of ['first','prev']) $(id).disabled = ply === 0;
  for (const id of ['last','next']) $(id).disabled = ply === total;
  $('positionTitle').textContent = moveLabel(state);
  $('sideLabel').textContent = (perspective === 'black' ? 'Black' : 'White') + ' perspective';
  $('gameTitle').textContent = game ? (game.headers.Event || 'GAME REVIEW') : 'YOUR BOARD';
  const analysis = game?.analyses[ply];
  $('evaluation').textContent = analysis ? formatScore(analysis.score) : 'Pending';
  $('searchDepth').textContent = analysis ? (analysis.terminal ? 'Terminal position' : `Depth ${analysis.depth}`) : 'Awaiting Stockfish';
  $('coach').innerHTML = coaching ? `<div class="row between"><div class="eyebrow">COACHING</div><span class="pill">${escapeHTML(coaching.level)}</span></div><h3>${escapeHTML(coaching.title)}</h3><p>${escapeHTML(coaching.body)}</p>${coaching.bestMoveSan ? `<div class="note"><strong>${recommendationLabel(state)}: ${escapeHTML(coaching.bestMoveSan)}</strong>${coaching.pvSan.length ? `<div class="continuation">${escapeHTML(coaching.pvSan.join(' '))}</div>` : ''}</div>` : ''}${isOwn(state) ? '<div class="review-note">Your move</div>' : ''}` : '<h3>Your next game, understood.</h3><p>Import a PGN to explore every move, see what mattered, and build a focused practice plan.</p><button class="primary full" data-open-import>Import a game</button>';
  $('tryMate').hidden = !opportunity;
  if (hiddenMate) {
    $('coach').innerHTML = `<div class="mate-teaser"><div class="eyebrow">A CHECKMATE TO FIND</div><h3>Can you finish the attack?</h3><p>There is a forced mate for ${opportunity.attacker === 'white' ? 'White' : 'Black'} in this position. Try it on the board, or reveal the coaching when you need it.</p><button class="secondary" id="revealMateAnalysis">Show analysis and solution</button></div>`;
    $('revealMateAnalysis').onclick = () => { revealedPositions.add(ply); render(); };
  }
  $('count').textContent = `${total} half-moves`;
  if (game) {
    renderMoves({ element:$('moves'), game, ply, coachingFor:state => coachMove(game, state.ply, side), isOwn, onNavigate:jump });
    $('result').textContent = game.headers.Result || '*';
    $('players').textContent = `${game.headers.White || 'White'} vs ${game.headers.Black || 'Black'}`;
    const summary = summarizeGame(game, side), pending = summary.total - summary.reviewed;
    $('reviewed').textContent = `${summary.reviewed} / ${summary.total} of your moves reviewed`;
    $('lossSummary').textContent = summary.averageLossCp == null ? 'Average evaluation loss: awaiting reviewed moves.' : `Average evaluation loss: ${(summary.averageLossCp / 100).toFixed(2)} pawns (mate transitions excluded). Estimates depend on search depth.`;
    const hasMistakes = summary.mistakes + summary.blunders > 0;
    $('priorities').innerHTML = `<div class="analysis-row"><strong>Moves to revisit</strong><span>${summary.mistakes} mistakes · ${summary.blunders} blunders among ${summary.reviewed} reviewed moves.</span></div><div class="analysis-row"><strong>${pending ? 'More moves to review' : hasMistakes ? 'Turn a mistake into a lesson' : 'Build on what worked'}</strong><span>${pending ? `${pending} of your moves are still waiting for review. You can explore the board at any time.` : hasMistakes ? 'Choose a mistake, notice the danger, then compare your move with the suggested alternative.' : 'Pick a good move and explain how it helped. Repeat that habit in your next game.'}</span></div>`;
  } else $('moves').innerHTML = '<div class="empty">Your move list will appear here.</div>';
  $('copy').disabled = !game;
  renderEngine();
  hub.updateGame(game, phase);
  coachProfile.setContext({ game, side:confirmedSide(), phase, track:trackGame });
  workspace.render({ game, ply, side, owner:confirmedSide(), phase, hiddenMate, coaching });
}
function jump(nextPly) { if (practice.active) return; ply = Math.max(0, Math.min(game?.history.length || 0, nextPly)); render(); }
$('tryMate').onclick = () => enterPractice();
$('viewMyCoach').onclick = () => changeTab('coach');
for (const name of tabs) {
  $(name + 'Tab').onclick = () => changeTab(name);
  $(name + 'Tab').onkeydown = event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const order = window.matchMedia('(max-width: 800px)').matches ? tabs : ['review','history','practice','coach'];
    const next = event.key === 'Home' ? order[0] : event.key === 'End' ? order.at(-1)
      : order[(order.indexOf(activeTab) + (['ArrowRight','ArrowDown'].includes(event.key) ? 1 : order.length - 1)) % order.length];
    changeTab(next); $(next + 'Tab').focus();
  };
}
$('analyze').onclick = () => { try { load($('pgn').value); } catch (error) { $('error').textContent = error.message; } };
$('uploadPgn').onclick = () => $('pgnFile').click();
$('pgnFile').onchange = async event => {
  const file = event.target.files?.[0]; if (!file) return;
  const version = ++importVersion;
  try {
    if (file.size > 200000) throw new Error('This PGN is too large. Upload one game under 200 KB.');
    const input = await file.text(); if (version !== importVersion) return; load(input);
  } catch (error) { if (version === importVersion) $('error').textContent = error.message; }
  finally { event.target.value = ''; }
};
$('demo').onclick = () => { $('pgn').value = sample; $('player').value = 'auto'; try { load(sample, { save:false, track:false }); } catch (error) { $('error').textContent = error.message; } };
$('reviewAction').onclick = () => {
  if (!game || practice.active) return;
  if (phase === 'loading' || phase === 'running') { cancelReview(); render(); return; }
  if (phase === 'complete') game.analyses.fill(null);
  void startReview();
};
$('player').onchange = () => { if (practice.active) return; if (game) side = selectedSide(game.headers); else if ($('player').value !== 'auto') side = $('player').value; render(); recordCompletedReview(); };
$('first').onclick = () => jump(0); $('prev').onclick = () => jump(ply - 1); $('next').onclick = () => jump(ply + 1); $('last').onclick = () => jump(game?.history.length || 0);
$('seek').oninput = event => jump(Number(event.target.value));
$('copy').onclick = async () => {
  if (!game) return;
  const summary = summarizeGame(game, side), completed = game.analyses.filter(Boolean);
  const report = `Chess Coach / Stockfish review: ${game.headers.White || 'White'} vs ${game.headers.Black || 'Black'}\nReviewed side: ${side}\nPositions reviewed: ${completed.length} / ${game.states.length}; engine evaluations: ${completed.filter(analysis => !analysis.terminal).length}\nYour moves reviewed: ${summary.reviewed} / ${summary.total}; pending: ${summary.total - summary.reviewed}\nMistakes: ${summary.mistakes}; blunders: ${summary.blunders}\nEvaluations are from White's viewpoint and use finite search depth. Pending moves are excluded from statistics.\n\n` + game.states.filter(isOwn).map(state => {
    const c = coachMove(game, state.ply, side), analysis = game.analyses[state.ply];
    return `${moveLabel(state)} — ${c.level}: ${c.body}\nPosition evaluation: ${analysis ? formatScore(analysis.score) + '; depth ' + analysis.depth : 'Pending'}${c.bestMoveSan ? '\n' + recommendationLabel(state) + ': ' + c.bestMoveSan : ''}${c.pvSan.length ? '\nContinuation: ' + c.pvSan.join(' ') : ''}`;
  }).join('\n\n');
  try { await navigator.clipboard.writeText(report); $('copy').textContent = 'Copied!'; setTimeout(() => $('copy').textContent = 'Copy coaching report', 1800); }
  catch { $('error').textContent = 'Clipboard not available in this browser.'; }
};
document.addEventListener('keydown', event => {
  if (practice.active || activeTab !== 'review') return;
  if (['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement.tagName) || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); jump(ply + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); jump(ply - 1); }
});
window.addEventListener('pagehide', () => {
  if (practice.active) returnToReview({ resume:false });
  if (phase === 'loading' || phase === 'running') cancelReview();
});
window.addEventListener('pageshow', () => render());
render();
