import { chessComUsername, normalizeChessComGame } from './chess-com-games.js';

const base = 'https://api.chess.com/pub/player/';
const day = 24 * 60 * 60 * 1000;
const monthPattern = /^\d{4}-(?:0[1-9]|1[0-2])$/;

class ApiError extends Error {
  constructor(message, { status, retryAfter } = {}) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

// PubAPI documents callback wrapping for browser clients. Only the fixed API
// origin is executable in this sandbox, which has no access to our page or storage.
function requestJsonp(url) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.referrerPolicy = 'no-referrer';
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    const timeout = setTimeout(() => finish(new ApiError('Chess.com took too long to respond. Try again.')), 12000);
    const receive = event => {
      if (event.source !== frame.contentWindow || event.origin !== 'null' || event.data?.nonce !== nonce) return;
      if (event.data.error) finish(new ApiError('Chess.com did not return public data. The profile may be unavailable, or Chess.com may be limiting requests. Try again later.'));
      else finish(null, event.data.value);
    };
    function finish(error, value) {
      clearTimeout(timeout);
      window.removeEventListener('message', receive);
      frame.remove();
      if (error) reject(error);
      else resolve(value);
    }
    window.addEventListener('message', receive);
    const source = JSON.stringify(url + '?callback=chessCoachReceive');
    frame.srcdoc = `<!doctype html><meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' https://api.chess.com; base-uri 'none'">
      <script nonce="${nonce}">
      function send(value, error) { parent.postMessage({ nonce: '${nonce}', value, error }, '*'); }
      function chessCoachReceive(value) { send(value, false); }
      const script = document.createElement('script');
      script.src = ${source};
      script.onerror = () => send(null, true);
      script.onload = () => send(null, true);
      document.head.append(script);
      </script>`;
    document.body.append(frame);
  });
}

export class ChessComApi {
  constructor(store, { fetchData = globalThis.fetch.bind(globalThis), jsonp = requestJsonp, now = Date.now } = {}) {
    this.store = store;
    this.fetchData = fetchData;
    this.jsonp = jsonp;
    this.now = now;
    this.pending = Promise.resolve();
    this.memory = new Map();
    this.useJsonp = false;
    this.retryUntil = 0;
  }
  async request(path, refresh) {
    if (this.now() < this.retryUntil) throw new ApiError('Chess.com is rate limiting requests. Wait and try again.');
    const url = base + path;
    if (!this.useJsonp || refresh) {
      try {
        const response = await this.fetchData(url, {
          credentials:'omit', cache:refresh ? 'reload' : 'default', signal:AbortSignal.timeout(8000),
        });
        if (response.status === 429) throw new ApiError('Chess.com is rate limiting requests. Wait and try again.', {
          status:429, retryAfter:response.headers.get('Retry-After'),
        });
        if ([404,410].includes(response.status)) {
          const resource = path.includes('/') ? 'data for this player' : 'a public player with that username';
          throw new ApiError(`Chess.com could not find ${resource}.`, { status:response.status });
        }
        if (!response.ok) throw new ApiError('Chess.com is temporarily unavailable. Try again later.', { status:response.status });
        const value = await response.json();
        this.useJsonp = false;
        return value;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new ApiError('Chess.com took too long to respond. Try again.');
        if (!(error instanceof TypeError)) throw new ApiError('Chess.com returned an unreadable response.');
        if (globalThis.navigator?.onLine === false) throw new ApiError('You are offline. Connect to refresh Chess.com history.');
        // Browsers report blocked cross-origin responses as a TypeError.
      }
    }
    if (globalThis.navigator?.onLine === false) throw new ApiError('You are offline. Connect to refresh Chess.com history.');
    const result = await this.jsonp(url);
    this.useJsonp = true;
    return result;
  }
  read(key) {
    return this.memory.get(key) ?? this.store.readChessComCache(key).catch(() => undefined);
  }
  cached(key, path, transform, { maxAge = day, refresh = false, current = () => true } = {}) {
    // Serial across searches, including when the user switches accounts mid-request.
    const task = this.pending.then(async () => {
      const previous = await this.read(key);
      if (!current()) return null;
      if (!refresh && previous && this.now() - previous.at < maxAge) return { value:previous.value, warning:'' };
      try {
        const value = transform(await this.request(path, refresh));
        const entry = { key, at:this.now(), value };
        try { await this.store.writeChessComCache(key, entry); this.memory.delete(key); }
        catch { this.memory.set(key, entry); return { value, warning:'Browser storage is unavailable. Downloads are cached for this session.' }; }
        return { value, warning:'' };
      } catch (error) {
        if (error.status === 429) {
          const retry = error.retryAfter && (/^\d+$/.test(error.retryAfter) ? Number(error.retryAfter) * 1000 : Date.parse(error.retryAfter) - this.now());
          this.retryUntil = this.now() + (retry > 0 ? retry : 60000);
        }
        if (previous) return { value:previous.value, warning:error.message + ' Showing cached data.' };
        throw error;
      }
    });
    this.pending = task.catch(() => {});
    return task;
  }
  profile(username, options) {
    username = chessComUsername(username);
    return this.cached('profile:' + username, username, data => {
      if (typeof data?.username !== 'string') throw new ApiError('Chess.com did not find this public profile.');
      return { username:data.username, avatar:typeof data.avatar === 'string' ? data.avatar : '' };
    }, options);
  }
  stats(username, options) {
    username = chessComUsername(username);
    return this.cached('stats:' + username, username + '/stats', data => {
      if (!data || typeof data !== 'object' || data.error) throw new ApiError('Chess.com ratings are unavailable.');
      return Object.fromEntries(['rapid', 'blitz', 'bullet'].map(type => {
        const value = data['chess_' + type]?.last?.rating;
        return [type, Number.isFinite(value) ? value : null];
      }));
    }, options);
  }
  archives(username, options) {
    username = chessComUsername(username);
    return this.cached('archives:' + username, username + '/games/archives', data => {
      if (!Array.isArray(data?.archives)) throw new ApiError('Chess.com archives are unavailable.');
      const months = data.archives.flatMap(url => {
        const month = typeof url === 'string' && url.match(/\/(\d{4})\/(\d{2})\/?$/);
        const key = month && month[1] + '-' + month[2];
        return key && monthPattern.test(key) ? [key] : [];
      });
      return [...new Set(months)].sort().reverse();
    }, options);
  }
  month(username, month, { latest = false, ...options } = {}) {
    username = chessComUsername(username);
    if (!monthPattern.test(month)) throw new Error('Choose a valid archive month.');
    return this.cached(`month:${username}:${month}`, `${username}/games/${month.replace('-', '/')}`, data => {
      if (!Array.isArray(data?.games)) throw new ApiError('This Chess.com archive is unavailable.');
      return data.games.map(normalizeChessComGame).filter(Boolean);
    }, { maxAge:latest ? day : Infinity, ...options });
  }
  async savedMonths(username) {
    const prefix = 'month:' + username + ':';
    const entries = await this.store.readChessComArchives(username).catch(() => []);
    for (const entry of this.memory.values()) if (entry.key.startsWith(prefix)) entries.push(entry);
    return new Map(entries.map(entry => [entry.key.slice(prefix.length), entry.value]));
  }
}
