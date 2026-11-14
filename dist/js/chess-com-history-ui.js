import { ChessComApi } from './chess-com-api.js';
import { chessComGames, filterChessComGames, chessComUsername, httpsUrl, timeControlLabel } from './chess-com-games.js';

const $ = id => document.getElementById(id);
const pageSize = 20;
const freshFor = 5 * 60 * 1000;
const lastUsernameKey = 'chess-coach.chess-com-username';
const capital = value => value ? value[0].toUpperCase() + value.slice(1) : '—';
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle:'medium', timeZone:'UTC' });
const monthFormat = new Intl.DateTimeFormat(undefined, { month:'long', year:'numeric', timeZone:'UTC' });

function node(tag, value, className) {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  return element;
}

export class ChessComHistoryUI {
  constructor({ store, onReview }) {
    this.api = new ChessComApi(store);
    this.onReview = onReview;
    this.generation = 0;
    this.page = 0;
    this.months = [];
    this.loaded = new Map();
    this.profile = null;
    this.ratings = {};
    this.checkedAt = 0;
    try { $('chessComUsername').value = localStorage.getItem(lastUsernameKey) || ''; } catch { /* Storage is optional. */ }
    $('chessComSearch').onsubmit = event => { event.preventDefault(); void this.search($('chessComUsername').value); };
    $('chessComRefresh').onclick = () => void this.search(this.searchedUsername, { refresh:true, preserve:true });
    $('chessComOlder').onclick = () => void this.loadOlder(false);
    $('chessComAll').onclick = () => void this.loadOlder(true);
    $('chessComStop').onclick = () => { this.stopping = true; $('chessComStatus').textContent = 'Stopping after the current archive…'; };
    $('chessComPrevious').onclick = () => this.changePage(-1);
    $('chessComNext').onclick = () => this.changePage(1);
    $('chessComFilters').oninput = event => {
      this.page = 0;
      this.renderGames();
      if (event.target.id === 'chessComMonth' && event.target.value && !this.loaded.has(event.target.value)) {
        void this.download([event.target.value]);
      }
    };
    $('chessComAvatar').onerror = () => { $('chessComAvatar').hidden = true; };
  }
  visit() {
    if (this.busy) return;
    if (this.profile) {
      if (Date.now() - this.checkedAt >= freshFor) void this.search(this.searchedUsername, { preserve:true });
    } else if ($('chessComUsername').value.trim()) {
      void this.search($('chessComUsername').value);
    }
  }
  returnFromReview(id) {
    [...$('chessComGames').querySelectorAll('button')].find(button => button.dataset.gameId === id)?.focus({ preventScroll:true });
  }
  async search(input, { refresh = false, preserve = false } = {}) {
    let username;
    try { username = chessComUsername(input); }
    catch (error) { $('chessComError').textContent = error.message; return; }
    this.searchedUsername = username;
    $('chessComUsername').value = username;
    try { localStorage.setItem(lastUsernameKey, username); } catch { /* Continue browsing. */ }
    const generation = ++this.generation;
    const current = () => this.generation === generation;
    if (!preserve) {
      this.profile = null;
      this.ratings = {};
      this.months = [];
      this.archivesKnown = false;
      this.loaded.clear();
      this.page = 0;
      for (const field of $('chessComFilters').querySelectorAll('input, select')) field.value = '';
    }
    this.setBusy('Finding ' + username + ' on Chess.com…');
    $('chessComError').textContent = '';
    this.render();
    const options = { refresh, current };
    const warnings = new Set();
    const warn = response => { if (response.warning) warnings.add(response.warning); };
    try {
      const profile = await this.api.profile(username, options);
      if (!current()) return;
      warn(profile);
      const account = chessComUsername(profile.value.username);
      const stored = await this.api.savedMonths(account);
      if (!current()) return;
      const previousLatest = [...stored.keys()].sort().at(-1);
      if (this.account !== account) {
        this.months = [];
        this.archivesKnown = false;
        this.ratings = {};
      }
      this.profile = profile.value;
      this.account = account;
      this.loaded = stored;
      $('chessComStatus').textContent = 'Checking available game archives…';
      this.render();
      try {
        const archives = await this.api.archives(account, { maxAge:freshFor, ...options });
        if (!current()) return;
        warn(archives);
        this.months = archives.value;
        this.archivesKnown = true;
        if (this.months.length) {
          $('chessComStatus').textContent = 'Loading the latest available archive…';
          const latest = this.months[0];
          const archive = await this.api.month(account, latest, { maxAge:freshFor, ...options });
          if (!current()) return;
          warn(archive);
          this.loaded.set(latest, archive.value);
          // The last active archive can gain games between its final fetch
          // and the appearance of a newer month.
          if (previousLatest && previousLatest < latest && this.months.includes(previousLatest)) {
            const previous = await this.api.month(account, previousLatest, { current, maxAge:freshFor });
            if (!current()) return;
            warn(previous);
            this.loaded.set(previousLatest, previous.value);
          }
        }
      } catch (error) { warnings.add(error.message); }
      if (!current()) return;
      this.render();
      try {
        const stats = await this.api.stats(account, options);
        if (!current()) return;
        warn(stats);
        this.ratings = stats.value;
      } catch (error) { warnings.add(error.message); }
      if (!current()) return;
      this.checkedAt = Date.now();
      $('chessComError').textContent = [...warnings].join(' ');
    } catch (error) {
      if (current()) $('chessComError').textContent = error.message;
    } finally {
      if (current()) { this.setBusy(''); this.render(); }
    }
  }
  loadOlder(all) {
    const remaining = this.months.filter(month => !this.loaded.has(month));
    return this.download(all ? remaining : remaining.slice(0, 1), all);
  }
  async download(months, all = false) {
    if (!months.length || this.busy) return;
    const generation = this.generation;
    const current = () => this.generation === generation;
    const warnings = new Set();
    this.stopping = false;
    this.setBusy('Loading game history…', all);
    $('chessComError').textContent = '';
    try {
      for (const [index, month] of months.entries()) {
        if (!current() || this.stopping) break;
        $('chessComStatus').textContent = `Loading archive ${index + 1} of ${months.length} · ${month}`;
        const response = await this.api.month(this.account, month, { current });
        if (!current()) return;
        if (response.warning) warnings.add(response.warning);
        this.loaded.set(month, response.value);
      }
    } catch (error) { warnings.add(error.message); }
    finally {
      if (current()) {
        this.setBusy('');
        if (this.stopping) $('chessComStatus').textContent = 'Download stopped. Retrieved archives are available.';
        $('chessComError').textContent = [...warnings].join(' ');
        this.render();
      }
    }
  }
  setBusy(message, canStop = false) {
    this.busy = Boolean(message);
    $('chessComStatus').textContent = message;
    $('chessComRefresh').disabled = this.busy;
    $('chessComMonth').disabled = this.busy;
    $('chessComStop').hidden = !canStop;
    this.renderActions();
  }
  renderActions() {
    const remaining = this.months.some(month => !this.loaded.has(month));
    for (const id of ['chessComOlder', 'chessComAll']) {
      $(id).hidden = !remaining;
      $(id).disabled = this.busy;
    }
  }
  render() {
    const hasProfile = Boolean(this.profile);
    for (const id of ['chessComProfile', 'chessComHistory', 'chessComRefresh']) $(id).hidden = !hasProfile;
    if (!hasProfile) return;
    $('chessComName').textContent = this.profile.username;
    const avatar = httpsUrl(this.profile.avatar);
    const allowedAvatar = avatar && /(^|\.)(chesscomfiles|chess)\.com$/.test(avatar.hostname);
    if (allowedAvatar && $('chessComAvatar').getAttribute('src') !== avatar.href) {
      $('chessComAvatar').hidden = false;
      $('chessComAvatar').src = avatar.href;
    } else if (!allowedAvatar) {
      $('chessComAvatar').hidden = true;
      $('chessComAvatar').removeAttribute('src');
    }
    $('chessComRatings').textContent = ['rapid','blitz','bullet'].map(type => `${capital(type)} ${this.ratings[type] ?? '—'}`).join(' · ');
    const monthPicker = $('chessComMonth');
    const selection = monthPicker.value;
    const months = [...new Set([...this.months, ...this.loaded.keys()])].sort().reverse();
    monthPicker.replaceChildren(new Option('All retrieved months', ''), ...months.map(month => new Option(
      monthFormat.format(new Date(month + '-01T00:00:00Z')), month)));
    monthPicker.value = months.includes(selection) ? selection : '';
    this.renderActions();
    this.renderGames();
  }
  changePage(offset) {
    this.page += offset;
    this.renderGames();
    $('chessComFilters').scrollIntoView({ block:'nearest' });
  }
  renderGames() {
    if (!this.profile) return;
    const options = {
      outcome:$('chessComOutcome').value, type:$('chessComType').value, color:$('chessComColor').value,
      month:$('chessComMonth').value, opponent:$('chessComOpponent').value, sort:$('chessComSort').value,
    };
    const games = chessComGames(this.loaded, this.account);
    const total = games.length;
    const filtered = filterChessComGames(games, options);
    const pages = Math.ceil(filtered.length / pageSize);
    this.page = Math.max(0, Math.min(this.page, pages - 1));
    const first = this.page * pageSize;
    $('chessComCount').textContent = `${total.toLocaleString()} retrieved ${total === 1 ? 'game' : 'games'} · ${this.loaded.size} ${this.loaded.size === 1 ? 'archive' : 'archives'} loaded`;
    $('chessComEmpty').hidden = filtered.length > 0 || this.busy;
    let empty = 'No completed games are available.';
    if (total || options.month) empty = 'No games match the selected filters in retrieved archives.';
    else if (!this.archivesKnown || this.months.length) empty = 'No games have been retrieved. Refresh or choose an archive to try again.';
    $('chessComEmpty').textContent = empty;
    $('chessComGames').replaceChildren(...filtered.slice(first, first + pageSize).map(game => this.gameRow(game)));
    $('chessComPages').hidden = pages <= 1;
    $('chessComPage').textContent = `Page ${this.page + 1} of ${pages}`;
    $('chessComPrevious').disabled = this.page <= 0;
    $('chessComNext').disabled = this.page + 1 >= pages;
  }
  gameRow(game) {
    const row = node('li', '', 'chesscom-game');
    const details = node('div', '');
    const name = `${game.opponent.name}${game.opponent.rating == null ? '' : ` (${game.opponent.rating})`}`;
    const opponent = node('strong', name);
    const result = node('span', game.outcome === 'unknown' ? 'Result unavailable' : capital(game.outcome), 'pill chesscom-result');
    result.dataset.result = game.outcome;
    details.append(opponent, result, node('p', [
      dateFormat.format(game.timestamp), `Played as ${capital(game.color)}${game.player.rating == null ? '' : ` (${game.player.rating})`}`,
      capital(game.type), timeControlLabel(game.timeControl), game.opening.name || game.opening.code,
    ].filter(Boolean).join(' · ')));
    const button = node('button', 'Review game', 'secondary');
    button.type = 'button';
    button.dataset.gameId = game.id;
    button.setAttribute('aria-label', 'Review game against ' + game.opponent.name + ' on ' + dateFormat.format(game.timestamp));
    if (game.reviewIssue) {
      button.disabled = true;
      details.append(node('p', game.reviewIssue, 'hint'));
    }
    const issue = node('p', '', 'error');
    issue.setAttribute('role', 'alert');
    details.append(issue);
    button.onclick = () => {
      issue.textContent = '';
      try { this.onReview(game); }
      catch (error) { issue.textContent = error.message; }
    };
    row.append(details, button);
    return row;
  }
}
