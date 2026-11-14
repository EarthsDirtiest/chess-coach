import assert from 'node:assert/strict';
import test from 'node:test';
import { ChessComApi } from '../dist/js/chess-com-api.js';
import { chessComGames, chessComUsername, filterChessComGames, normalizeChessComGame, timeControlLabel } from '../dist/js/chess-com-games.js';

const pgn = '[Opening "King’s Pawn"]\r\n[Result "0-1"]\r\n\r\n1. f3 e5 2. g4 Qh4# 0-1\r\n';
function raw(overrides = {}) {
  return {
    url:'https://www.chess.com/game/live/123', pgn, end_time:1736942400,
    white:{ username:'WhitePlayer', rating:1500, result:'checkmated' },
    black:{ username:'BlackPlayer', rating:1600, result:'win' },
    time_class:'blitz', time_control:'180+2', rules:'chess', ...overrides,
  };
}
function cache() {
  const entries = new Map();
  return {
    entries,
    readChessComCache:async key => entries.get(key),
    writeChessComCache:async (key, value) => { entries.set(key, value); },
    readChessComArchives:async name => [...entries.values()].filter(entry => entry.key.startsWith('month:' + name + ':')),
  };
}
const response = data => Response.json(data);

test('Chess.com rows keep original PGN and derive outcome from either searched perspective', () => {
  const game = normalizeChessComGame(raw());
  assert.equal(game.pgn, pgn);
  assert.equal(game.opening.name, 'King’s Pawn');
  assert.equal(timeControlLabel(game.timeControl), '3 min + 2 sec');
  assert.equal(timeControlLabel('1/259200'), '3 days per move');
  assert.equal(chessComUsername(' BlackPlayer '), 'blackplayer');
  assert.throws(() => chessComUsername('../other'));
  const archives = new Map([['2025-01', [game]]]);
  assert.equal(chessComGames(archives, 'WHITEPLAYER')[0].outcome, 'loss');
  assert.equal(chessComGames(archives, 'blackplayer')[0].outcome, 'win');
  assert.equal(chessComGames(archives, 'unrelated').length, 0);
});

test('stable deduplication, archive membership, filters and rating sorts handle missing metadata', () => {
  const win = normalizeChessComGame(raw());
  const duplicate = normalizeChessComGame(raw({ url:'https://chess.com/live/game/123/?ref=archive' }));
  const draw = normalizeChessComGame(raw({
    url:'https://www.chess.com/game/daily/678', end_time:1705406400, time_class:'daily',
    white:{ username:'ColdOpponent', result:'timevsinsufficient' }, black:{ username:'BlackPlayer', result:'timevsinsufficient' },
  }));
  const lower = normalizeChessComGame(raw({
    url:'https://www.chess.com/game/live/124', end_time:1710000000,
    white:{ username:'OtherOpponent', rating:900, result:'win' }, black:{ username:'BlackPlayer', result:'resigned' },
  }));
  const games = chessComGames(new Map([['2025-01',[win]],['2024-01',[duplicate, draw, lower]]]), 'BlackPlayer');
  assert.equal(games.length, 3);
  assert.deepEqual(filterChessComGames(games, { month:'2024-01', outcome:'win', type:'blitz', color:'black', opponent:' white ' }).map(g => g.id), [win.id]);
  assert.deepEqual(filterChessComGames(games, { sort:'highest' }).map(g => g.id), [win.id, lower.id, draw.id]);
  assert.deepEqual(filterChessComGames(games, { sort:'lowest' }).map(g => g.id), [lower.id, win.id, draw.id]);
  assert.equal(filterChessComGames(games, { sort:'oldest' })[0].outcome, 'draw');
  assert.match(normalizeChessComGame(raw({ rules:'chess960' })).reviewIssue, /variant/);
  assert.match(normalizeChessComGame(raw({ pgn:null })).reviewIssue, /PGN/);
});

test('archive requests are serial, cached by username and refreshed without fetching older months', async () => {
  const store = cache();
  const requests = [];
  let active = 0;
  const api = new ChessComApi(store, { fetchData:async url => {
    assert.equal(++active, 1);
    requests.push(url);
    await Promise.resolve();
    active--;
    if (url.endsWith('/archives')) return response({ archives:['https://api.chess.com/pub/player/blackplayer/games/2025/01', 'https://api.chess.com/pub/player/blackplayer/games/2025/02'] });
    if (url.endsWith('/stats')) return response({ chess_rapid:{ last:{ rating:1400 } } });
    return response({ games:[raw()] });
  } });
  const [months, stats] = await Promise.all([api.archives('BlackPlayer'), api.stats('BlackPlayer')]);
  assert.deepEqual(months.value, ['2025-02', '2025-01']);
  assert.deepEqual(stats.value, { rapid:1400, blitz:null, bullet:null });
  await api.month('BlackPlayer', '2025-02', { latest:true });
  await api.month('blackplayer', '2025-02', { latest:true });
  assert.equal(requests.length, 3);
  await api.month('blackplayer', '2025-02', { refresh:true });
  assert.equal(requests.length, 4);
  assert.equal((await api.savedMonths('blackplayer')).size, 1);
  assert.equal((await api.savedMonths('whiteplayer')).size, 0);
});

test('cached data survives throttling and HTTP failures while canceled work never starts', async () => {
  const store = cache();
  let now = 0, status = 200, hits = 0;
  const api = new ChessComApi(store, { now:() => now, fetchData:async () => {
    hits++;
    if (status === 200) return response({ username:'player' });
    return new Response(null, { status, headers:{ 'Retry-After':'10' } });
  } });
  assert.equal((await api.profile('player')).value.username, 'player');
  status = 429;
  assert.match((await api.profile('player', { refresh:true })).warning, /rate limiting.*cached data/);
  await assert.rejects(api.profile('another'), /rate limiting/);
  assert.equal(hits, 2);
  now = 11000;
  status = 404;
  await assert.rejects(api.profile('missing'), /could not find a public player/);
  assert.equal(await api.profile('aborted', { current:() => false }), null);
  assert.equal(hits, 3);
  status = 503;
  assert.match((await api.profile('player', { refresh:true })).warning, /unavailable.*cached data/);
});

test('browser fetch failures can use the documented callback transport and timeouts are explained', async () => {
  let fetches = 0;
  const api = new ChessComApi(cache(), {
    fetchData:async () => { fetches++; throw new TypeError('Blocked by CORS'); },
    jsonp:async url => url.endsWith('/stats') ? {} : { username:'player' },
  });
  await api.profile('player');
  await api.stats('player');
  assert.equal(fetches, 1);
  const timedOut = new ChessComApi(cache(), { fetchData:async () => { throw new DOMException('Timeout','TimeoutError'); } });
  await assert.rejects(timedOut.profile('player'), /too long/);
});
