// Full canonical content is the key: no hash collisions, PGN formatting or headers.
export function gameIdentity(game) {
  return JSON.stringify([game.initialFen, game.states.at(-1).uciMoves]);
}

function browserDatabase() { try { return globalThis.indexedDB; } catch { return null; } }

export class GameHistory {
  constructor({ indexedDB = browserDatabase(), name = 'chess-coach-history' } = {}) {
    this.indexedDB = indexedDB; this.name = name; this.database = null;
  }
  open() {
    if (this.database) return this.database;
    this.database = new Promise((resolve, reject) => {
      if (!this.indexedDB) { reject(new Error('This browser does not provide local game storage.')); return; }
      const request = this.indexedDB.open(this.name, 1);
      let abandoned = false;
      request.onupgradeneeded = () => request.result.createObjectStore('games', { keyPath:'id' });
      request.onerror = () => { abandoned = true; reject(new Error('Local game history could not be opened.')); };
      request.onblocked = () => { abandoned = true; reject(new Error('Close other Chess Coach tabs to finish opening local history.')); };
      request.onsuccess = () => {
        const db = request.result;
        if (abandoned) { db.close(); return; }
        db.onversionchange = () => { db.close(); this.database = null; };
        resolve(db);
      };
    }).catch(error => { this.database = null; throw error; });
    return this.database;
  }
  async save(game, pgn) {
    const db = await this.open(), id = gameIdentity(game);
    return new Promise((resolve, reject) => {
      // Read and insert in the same write transaction, so concurrent tabs cannot add copies.
      const transaction = db.transaction('games', 'readwrite'), store = transaction.objectStore('games');
      let result;
      const request = store.get(id);
      request.onsuccess = () => {
        if (request.result) { result = { duplicate:true, record:request.result }; return; }
        const record = { id, pgn, headers:{ ...game.headers }, halfMoves:game.history.length, uploadedAt:Date.now() };
        result = { duplicate:false, record };
        try { store.add(record); } catch { transaction.abort(); }
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = transaction.onabort = () => reject(new Error('This game could not be saved. Browser storage may be full or disabled.'));
    });
  }
  async list() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction('games', 'readonly').objectStore('games').getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => b.uploadedAt - a.uploadedAt));
      request.onerror = () => reject(new Error('Saved games could not be read.'));
    });
  }
}
