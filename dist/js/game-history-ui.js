import { GameHistory } from './game-history.js';

const $ = id => document.getElementById(id);
export class GameHistoryUI {
  constructor({ onOpen }) {
    this.store = new GameHistory(); this.onOpen = onOpen; this.generation = 0;
    window.addEventListener('focus', () => { void this.refresh(); });
    void this.refresh();
  }
  async refresh() {
    const generation = ++this.generation;
    try {
      const records = await this.store.list(); if (generation !== this.generation) return;
      $('historyError').textContent = ''; $('historyCount').textContent = `${records.length} saved ${records.length === 1 ? 'game' : 'games'}`;
      $('historyEmpty').hidden = records.length > 0;
      $('historyList').replaceChildren(...records.map(record => {
        const card = document.createElement('article'); card.className = 'history-card';
        const heading = document.createElement('h2'); heading.textContent = `${record.headers.White || 'White'} vs ${record.headers.Black || 'Black'}`;
        const date = record.headers.Date?.includes('?') ? null : record.headers.Date;
        const result = record.headers.Result && record.headers.Result !== '*' ? record.headers.Result : 'Result not provided';
        const details = document.createElement('p'); details.textContent = [record.headers.Event, date, result, `${record.halfMoves} half-moves`].filter(Boolean).join(' · ');
        const saved = document.createElement('span'); saved.className = 'hint'; saved.textContent = `Uploaded ${new Date(record.uploadedAt).toLocaleString()}`;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary'; button.textContent = 'Open review';
        button.onclick = () => this.onOpen(record);
        card.append(heading, details, saved, button); return card;
      }));
    } catch (error) {
      if (generation !== this.generation) return;
      $('historyError').textContent = `${error.message} Your game can still be reviewed, but history is unavailable.`;
      $('historyCount').textContent = 'Storage unavailable'; $('historyEmpty').hidden = true;
    }
  }
  async save(game, pgn) {
    const result = await this.store.save(game, pgn); await this.refresh(); return result;
  }
}
