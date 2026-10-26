# Chess Coach

Paste a Chess.com or Lichess PGN to replay the game with browser-local Stockfish
analysis. The static app is served from `dist/` by the existing GitHub Pages workflow.
No server, API key, CDN, or AI account is needed to review a game.

## Run locally

Use Node.js 20 or newer:

```sh
npm ci
npm run serve
```

Open http://127.0.0.1:4173. Serve over HTTP(S); opening the HTML as `file://` cannot
load browser modules and WebAssembly reliably. Production needs no build step or
Node installation: deploy the committed `dist/` directory.

## Analysis and coaching

- [Stockfish.js 19.0.1](https://github.com/nmrugg/stockfish.js/tree/v19.0.1), Lite
  single-threaded WASM, runs in a dedicated Web Worker. It works on GitHub Pages
  without cross-origin isolation headers. The engine and its neural network are
  bundled; PGNs stay in the browser.
- [chess.js 1.4.0](https://jhlywa.github.io/chess.js/) validates PGNs and replays
  legal moves, including FEN starts, promotions, castling and en passant. The
  full starting position and move history are passed to Stockfish for repetition.
- Every position receives a bounded search. The quality selector trades review
  time for deeper searches; the last completed exact search depth is shown.
  Recommendations and scores stay paired with that completed line even if a
  time limit interrupts the next iteration. Stop and resume a review at
  any point, or choose a different quality and reanalyze.
- Scores are always from **White's perspective**: positive favors White,
  negative favors Black. `+M3` means White can force mate in three moves;
  `−M3` means Black can. A move is compared with the evaluations before and
  after it, from the mover's perspective. Best-move matches are not penalized
  for search fluctuations. Coaching includes the engine's alternative and
  legal SAN continuation. No move is graded until both positions are evaluated.
- Coaching uses plain language: what the move allowed, a concrete reason to
  consider another move, and a practical habit to remember. Reasons come from
  legal moves and board facts, including captures, checks, development, center
  control and open files. The coach does not invent a tactical explanation for
  an unexplained score change. Recaptures, equal exchanges, pinned pieces and
  sound sacrifices are checked before describing a problem. Selecting your side
  changes the wording so your opponent's moves are not attributed to you.
- Scores, search depth and average evaluation loss sit in a collapsed
  **Show engine details** panel; the main note focuses on the chess lesson.
- Estimated losses of 0.50 / 1.00 / 2.00 pawns are labeled inaccuracy / mistake /
  blunder. Losing a found forced mate or allowing a new one is a blunder. Mate
  transitions are excluded from average centipawn loss. These are teaching
  thresholds, not a Chess.com accuracy score. Finite searches, especially the
  fast preset, can miss tactics or change their evaluation with more time.
- Checkmate, stalemate and insufficient material are recognized without
  searching terminal positions. Claimable repetition and fifty-move draws are
  identified separately so a continuing game can still be reviewed.

## Verify

```sh
npm test
npx playwright install chromium
npm run test:browser
```

The unit tests cover chess rules, score perspective, mate handling and UCI worker
lifecycle. The browser test uses the real WASM engine and a static server under
a project subdirectory to check GitHub Pages asset paths, tactical calculations,
review progress, cancellation, PGN replacement and engine load failures.

## Vendored dependencies

`dist/vendor/` is committed so deployment needs no dependency downloads.
`npm run vendor:chess` refreshes chess.js from the locked dependency.
`npm run vendor:stockfish` downloads the pinned official release assets and
verifies their SHA-256 hashes. Do not mix engine JS and WASM versions.

Stockfish is GPLv3; its license, attribution, checksums and links to complete
corresponding source and build instructions are in
[dist/vendor/stockfish/NOTICE.md](dist/vendor/stockfish/NOTICE.md). chess.js is BSD-2-Clause;
its license is in [dist/vendor/chess.js/LICENSE](dist/vendor/chess.js/LICENSE).
