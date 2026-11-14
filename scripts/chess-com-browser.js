import assert from 'node:assert/strict';

export async function checkChessComHistory(browser, url) {
  const context = await browser.newContext({ viewport:{ width:390, height:900 } });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let workers = 0;
    page.on('worker', () => { workers++; });
    const origin = new URL(url).origin;
    const prefix = '/pub/player/';
    const requests = [];
    const pgn = '[White "Opponent"]\n[Black "TestPlayer"]\n[Result "0-1"]\n[Opening "Barnes Opening"]\n\n1. f3 e5 2. g4 Qh4# 0-1';
    const game = {
      url:'https://www.chess.com/game/live/100', pgn, end_time:1740873600,
      white:{ username:'Opponent', rating:1430, result:'checkmated' },
      black:{ username:'TestPlayer', rating:1520, result:'win' },
      time_class:'blitz', time_control:'180+2', rules:'chess',
    };
    const older = {
      ...game, url:'https://www.chess.com/game/live/101', end_time:1738368000,
      white:{ username:'Another', rating:1810, result:'agreed' }, black:{ ...game.black, result:'agreed' },
      time_class:'rapid', pgn:'broken PGN',
    };
    let freshGames = [
      game,
      ...Array.from({ length:20 }, (_, index) => ({
        ...game, url:`https://www.chess.com/game/live/${200 + index}`, end_time:game.end_time - index - 10,
        rules:index === 0 ? 'chess960' : 'chess', pgn:index === 1 ? null : pgn,
      })),
    ];
    let unavailable = false;
    await context.route('https://api.chess.com/pub/**', async route => {
      const endpoint = new URL(route.request().url());
      const path = endpoint.pathname.slice(prefix.length);
      const callback = endpoint.searchParams.get('callback');
      requests.push({ path, callback });
      const headers = { 'Access-Control-Allow-Origin':origin };
      if (unavailable) return route.fulfill({ status:503, headers });
      if (path === 'missing') return route.fulfill({ status:404, headers });
      if (path === 'empty') return route.fulfill({ json:{ username:'empty' }, headers });
      if (path === 'empty/games/archives') return route.fulfill({ json:{ archives:[] }, headers });
      let data;
      if (path === 'testplayer') data = { username:'TestPlayer' };
      else if (path.endsWith('/stats')) data = { chess_rapid:{ last:{ rating:1690 } }, chess_blitz:{ last:{ rating:1520 } } };
      else if (path.endsWith('/archives')) data = {
        archives:['2025/01','2025/02','2025/03'].map(month => 'https://api.chess.com/pub/player/testplayer/games/' + month),
      };
      else if (path.endsWith('/2025/03')) data = { games:freshGames };
      else if (path.endsWith('/2025/02')) data = { games:[older, game] };
      else if (path.endsWith('/2025/01')) data = { games:[] };
      else throw new Error('Unexpected API path ' + path);
      // Chromium reports an unreadable cross-origin fetch as a network
      // failure. Exercise the sandboxed callback with the real browser.
      if (callback) return route.fulfill({ contentType:'application/javascript', body:`${callback}(${JSON.stringify(data)});` });
      if (path === 'testplayer') return route.abort('failed');
      return route.fulfill({ json:data, headers });
    });
    const settled = () => page.waitForFunction(() => !document.querySelector('#chessComStatus').textContent);
    const search = async username => {
      await page.fill('#chessComUsername', username);
      await page.press('#chessComUsername', 'Enter');
      await settled();
    };
    const row = id => page.locator(`button[data-game-id$="/${id}"]`);
    await page.goto(url);
    await page.click('#historyTab');
    await search('missing');
    assert.match(await page.textContent('#chessComError'), /could not find.*username/);
    await search('empty');
    assert.match(await page.textContent('#chessComEmpty'), /No completed games/);
    await search('TestPlayer');
    assert.equal(await page.textContent('#chessComName'), 'TestPlayer');
    assert.match(await page.textContent('#chessComRatings'), /Rapid 1690.*Blitz 1520.*Bullet —/);
    assert.match(await page.textContent('#chessComCount'), /21 retrieved games/);
    assert.ok(requests.some(({ path, callback }) => path === 'testplayer' && callback));
    assert.ok(!requests.some(({ path }) => path.endsWith('/2025/02')));
    assert.equal(await page.locator('.chesscom-game').count(), 20);
    await page.click('#chessComNext');
    assert.equal(await page.locator('.chesscom-game').count(), 1);
    await page.click('#chessComPrevious');
    assert.equal(await row(200).isDisabled(), true);
    assert.equal(await row(201).isDisabled(), true);
    await page.selectOption('#chessComMonth', '2025-02');
    await settled();
    await page.selectOption('#chessComType','rapid');
    await page.selectOption('#chessComOutcome','draw');
    await page.selectOption('#chessComColor','black');
    await page.fill('#chessComOpponent','another');
    assert.equal(await page.locator('.chesscom-game').count(), 1);
    await row(101).click();
    assert.match(await page.locator('.chesscom-game .error').textContent(), /Could not read this PGN|No moves found/);
    await page.fill('#chessComOpponent','nobody');
    assert.match(await page.textContent('#chessComEmpty'), /No games match/);
    for (const id of ['chessComMonth','chessComType','chessComOutcome','chessComColor']) await page.selectOption('#' + id, '');
    await page.fill('#chessComOpponent','');
    await page.selectOption('#chessComSort','highest');
    assert.match(await page.locator('.chesscom-game').first().textContent(), /Another/);
    await page.click('#chessComAll');
    await settled();
    assert.match(await page.textContent('#chessComCount'), /22 retrieved games · 3 archives/);
    assert.equal(await page.locator('#chessComAll').isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

    await row(100).click();
    assert.equal(await page.getAttribute('#reviewTab','aria-selected'), 'true');
    assert.equal(await page.textContent('#step'), '0 / 4');
    assert.equal(await page.getAttribute('#engineStatus','data-state'), 'ready');
    assert.equal(workers, 0);
    assert.equal((await page.textContent('#coords')).replace(/\s/g,''), 'hgfedcba');
    assert.match(await page.textContent('#chessComReviewPlayers'), /Opponent \(1430\) vs TestPlayer \(1520\)/);
    assert.match(await page.textContent('#chessComReviewDetails'), /0-1.*Barnes Opening/);
    await page.click('#last');
    assert.equal(await page.textContent('#step'), '4 / 4');
    await page.click('#prev');
    await page.click('#first');
    await page.click('#next');
    assert.equal(await page.textContent('#step'), '1 / 4');
    await page.click('#movesPanelTab');
    await page.click('[data-ply="2"]');
    await page.locator('#positionTitle').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.textContent('#step'), '3 / 4');
    await page.selectOption('#quality','quick');
    await page.click('#chessComAnalyze');
    await page.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'complete');
    assert.ok(workers > 0);
    assert.match(await page.textContent('#evaluation'), /[M0-9]/);
    assert.match(await page.textContent('#gameCoachStatus'), /separate from your personal coaching profile/);
    await page.click('#chessComBack');
    assert.equal(await page.inputValue('#chessComSort'),'highest');
    await row(100).click();
    await page.waitForFunction(() => document.querySelector('#engineStatus').dataset.state === 'complete');
    assert.equal(await page.textContent('#step'),'0 / 4');
    await page.click('#chessComBack');

    freshGames = [...freshGames, { ...game, url:'https://www.chess.com/game/live/999', end_time:game.end_time + 100 }];
    const beforeRefresh = requests.length;
    await page.click('#chessComRefresh');
    await settled();
    assert.match(await page.textContent('#chessComCount'), /23 retrieved games/);
    assert.ok(!requests.slice(beforeRefresh).some(({ path }) => /\/2025\/0[12]$/.test(path)));
    unavailable = true;
    await page.click('#chessComRefresh');
    await settled();
    assert.match(await page.textContent('#chessComError'), /cached data/);
    assert.match(await page.textContent('#chessComCount'), /23 retrieved games/);
    await page.reload();
    await page.click('#historyTab');
    await settled();
    assert.equal(await page.inputValue('#chessComUsername'),'testplayer');
    assert.match(await page.textContent('#chessComCount'), /23 retrieved games/);
    assert.equal(await page.locator('.history-card').count(), 1);
    await context.unroute('https://api.chess.com/pub/**');
    await context.route('https://api.chess.com/pub/**', route => route.abort('internetdisconnected'));
    await context.setOffline(true);
    await page.click('#chessComRefresh');
    await settled();
    assert.match(await page.textContent('#chessComError'), /offline.*cached data/);
    assert.match(await page.textContent('#chessComCount'), /23 retrieved games/);
    await page.setViewportSize({ width:320, height:800 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}
