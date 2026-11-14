const draws = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']);

export function chessComUsername(input) {
  const username = input.trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,50}$/.test(username)) {
    throw new Error('Enter a Chess.com username using letters, numbers, hyphens or underscores.');
  }
  return username;
}

export function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch { return null; }
}

const pgnTag = (pgn, tag) => pgn.match(new RegExp('^\\[' + tag + ' "([^"\\r\\n]*)"\\]', 'mi'))?.[1];
const rating = (value, fallback) => Number.isFinite(value) ? value : /^\d+$/.test(fallback || '') ? Number(fallback) : null;

export function normalizeChessComGame(raw) {
  if (typeof raw?.white?.username !== 'string' || typeof raw.black?.username !== 'string'
    || !raw.white.username || !raw.black.username || !Number.isFinite(raw.end_time)
    || raw.end_time <= 0 || raw.end_time > 8640000000000) return null;
  const link = httpsUrl(raw.url);
  const recognized = link && ['www.chess.com', 'chess.com'].includes(link.hostname)
    && /^\/(?:game\/(?:live|daily)|live\/game|daily\/game)\/\d+\/?$/.test(link.pathname);
  const path = recognized && link.pathname.replace(/^\/(live|daily)\/game\//, '/game/$1/').replace(/\/$/, '');
  const url = path ? 'https://www.chess.com' + path : null;
  const id = url || (typeof raw.uuid === 'string' && raw.uuid ? 'chess.com:' + raw.uuid : null);
  if (!id) return null;

  const pgn = typeof raw.pgn === 'string' ? raw.pgn : '';
  const pgnResult = pgnTag(pgn, 'Result');
  let result = '*';
  if (['1-0', '0-1', '1/2-1/2'].includes(pgnResult)) result = pgnResult;
  if (raw.white.result === 'win') result = '1-0';
  else if (raw.black.result === 'win') result = '0-1';
  else if (draws.has(raw.white.result) || draws.has(raw.black.result)) result = '1/2-1/2';
  const openingUrl = httpsUrl(raw.eco || pgnTag(pgn, 'ECOUrl'));
  const slug = openingUrl?.hostname === 'www.chess.com' && openingUrl.pathname.match(/^\/openings\/(.+)/)?.[1];
  let openingName = pgnTag(pgn, 'Opening') || '';
  if (!openingName && slug) {
    try { openingName = decodeURIComponent(slug).split(/-+\d+\./)[0].replaceAll('-', ' '); } catch { /* Keep unknown metadata blank. */ }
  }
  const variant = pgnTag(pgn, 'Variant');
  const unsupported = (raw.rules && raw.rules !== 'chess') || (variant && !/^(standard|chess|normal)$/i.test(variant));
  const reviewIssue = unsupported ? 'This chess variant is unsupported.' : !pgn.trim() ? 'Chess.com did not provide a PGN.' : '';
  return {
    id, url, pgn, result, reviewIssue,
    timestamp: raw.end_time * 1000,
    date: new Date(raw.end_time * 1000).toISOString().split('T')[0],
    white: { name: raw.white.username, rating: rating(raw.white.rating, pgnTag(pgn, 'WhiteElo')) },
    black: { name: raw.black.username, rating: rating(raw.black.rating, pgnTag(pgn, 'BlackElo')) },
    type: typeof raw.time_class === 'string' ? raw.time_class : '',
    timeControl: typeof raw.time_control === 'string' ? raw.time_control : pgnTag(pgn, 'TimeControl') || '',
    opening: { name: openingName, code: pgnTag(pgn, 'ECO') || '' },
  };
}

export function playerGame(game, username) {
  const color = ['white', 'black'].find(side => game[side].name.toLowerCase() === username.toLowerCase());
  if (!color) return null;
  const opponent = game[color === 'white' ? 'black' : 'white'];
  let outcome = 'unknown';
  if (game.result === '1/2-1/2') outcome = 'draw';
  if (game.result === '1-0' || game.result === '0-1') outcome = (game.result === '1-0') === (color === 'white') ? 'win' : 'loss';
  return { ...game, color, outcome, opponent, player: game[color] };
}

export function chessComGames(archives, username) {
  const unique = new Map();
  for (const [archive, games] of [...archives].sort(([a], [b]) => b.localeCompare(a))) {
    for (const game of games) {
      let row = unique.get(game.id);
      if (!row) {
        row = playerGame(game, username);
        if (!row) continue;
        row.months = [];
        unique.set(game.id, row);
      }
      if (!row.months.includes(archive)) row.months.push(archive);
    }
  }
  return [...unique.values()];
}

export function filterChessComGames(games, { outcome, type, color, month, opponent = '', sort } = {}) {
  const query = opponent.trim().toLowerCase();
  return games.filter(row => (!month || row.months.includes(month)) && (!outcome || row.outcome === outcome)
    && (!type || row.type === type) && (!color || row.color === color)
    && row.opponent.name.toLowerCase().includes(query)).sort((a, b) => {
    if (sort === 'oldest') return a.timestamp - b.timestamp;
    if (sort === 'highest') return (b.opponent.rating ?? -Infinity) - (a.opponent.rating ?? -Infinity) || b.timestamp - a.timestamp;
    if (sort === 'lowest') return (a.opponent.rating ?? Infinity) - (b.opponent.rating ?? Infinity) || b.timestamp - a.timestamp;
    return b.timestamp - a.timestamp;
  });
}

export function timeControlLabel(control) {
  const daily = control.match(/^1\/(\d+)$/);
  if (daily) {
    const days = Number(daily[1]) / 86400;
    return `${days} ${days === 1 ? 'day' : 'days'} per move`;
  }
  const live = control.match(/^(\d+)(?:\+(\d+))?$/);
  if (!live) return ['', '-', '?'].includes(control) ? '—' : control;
  const seconds = Number(live[1]);
  const base = seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} sec`;
  return live[2] ? `${base} + ${live[2]} sec` : base;
}
