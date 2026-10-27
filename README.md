# Chess Coach

Paste a Chess.com or Lichess PGN to replay the game with browser-local Stockfish
analysis. The static app is served from `dist/` by the existing GitHub Pages workflow.
No server, API key, CDN, or AI account is needed to review a game.

## Run locally

Use Node.js 20 or newer:

```sh
npm ci
npm run build
npm run serve
```

Open http://127.0.0.1:4173. Serve over HTTP(S); opening the HTML as `file://` cannot
load browser modules and WebAssembly reliably. Production needs no build step or
Node installation: deploy the committed `dist/` directory.

## Midnight Grandmaster interface

The UI follows the supplied desktop and mobile mockups with a midnight palette,
emerald accents, desktop sidebar, and mobile bottom navigation. Desktop analysis
uses board / moves-and-coach / engine columns; mobile shows a square board,
evaluation rail, Coach–Moves–Engine panels, chart and game summary. Import a PGN
from **Import game** on desktop or the mobile navigation menu.

The board renderer shares one locally bundled SVG piece set across analysis and
all practices. CSS explicitly defines eight equal rows and columns; board and
cell geometry are tested at 320, 390, 589, 768, 1024, 1280, 1440 and 1920 pixels.
Rank/file coordinates and the last-move arrow follow board orientation. **Flip
board** changes the view without changing which player is tracked by the coach.
Playback, chart keyboard/click navigation, move pairs and line disclosure are
presentation components over the existing review state.

Evaluations, search depths, principal variation, move grades, insight cards and
summary metrics come from actual game, engine and profile data. The engine
supplies a single principal variation; the UI displays that actual continuation.
The summary labels the existing heuristic as **Coach score**, without inventing
a chess-site accuracy percentage. Pending positions remain pending and create
gaps in the chart. The chart clips its display to ±3 pawns and marks mate using
the real score; it does not change stored evaluations. Forced-mate solutions
stay hidden until explicitly revealed.

Reusable presentation modules live in `dist/js/analysis-workspace.js`,
`move-list.js`, `evaluation-chart.js`, `icons.js` and `chess-board.js`, with shared
styles in `dist/css/app.css`. The Stockfish worker, game parser, coaching rules,
training models, history identity and IndexedDB schema are preserved. `npm run
build` validates the static distribution, UI integration IDs, JavaScript syntax,
styles, SVG assets and the existing WASM header. CI runs that check before tests.
There is no new runtime framework or engine build/download step.

The Cburnett SVG pieces are by Colin M. L. Burnett (GPLv2+, distributed using the
GPLv3 option). Their editable SVG source and attribution are bundled in
[`dist/vendor/pieces/NOTICE.md`](dist/vendor/pieces/NOTICE.md).

## Analysis and coaching

The top navigation separates **Game review**, **Practice**, **Game history**, and
**My coach**.
The Practice library contains three playable exercises in each category:

- **Openings:** Italian Game as White, Queen’s Gambit Declined as White, and a
  Sicilian/Najdorf line as Black. Prepared replies and move explanations teach a
  specific line; other legal opening moves are not called chess mistakes.
- **Checkmates:** mate in one as White, mate in one as Black, and mate in two.
  Stockfish defends, and legal alternative mating moves are accepted.
- **Puzzles:** fork the king and queen, win a pinned knight, and capture a loose
  queen. Legal prepared lines teach the tactic; both safe captures of the pinned
  knight are accepted. Solutions remain hidden until requested.

Mating positions from the current game remain available as additional practice.
All exercises support undo, restart, reveal, and return. Personal practice
recommendations appear above the category library after completed game reviews.

Standalone exercises use the existing Stockfish trainer without replacing the
loaded PGN or its analyses. Return to practices keeps the category selection;
switching back to Game review restores the original review position. The tab
buttons also support Left/Right, Home and End keys.

## Personal coach and progress

**My coach** remembers completed game assessments in IndexedDB alongside the game
history. The database upgrades from version 1 without removing existing PGNs.
After a full analysis, confirm **I played White** or **I played Black**; automatic
recognition is used only when an EarthsDirtiest header actually matches. If the
side is unknown, the game is not added to the profile until selected. Reopening
a scored history entry restores its tracked side. Changing that selection after
analysis corrects the existing report rather than adding the opponent as a
second game. Examples, practice completions, partial/paused reviews and engine
failures do not change game progress. Earlier saved games contribute after a
complete reanalysis.

Each match has one report keyed by the same canonical identity as game history.
Reanalysis replaces its report while preserving its first-analysis order. Updates
are transactional across the game and report stores, so concurrent tabs cannot
inflate the game count or create reports without a saved PGN. Every completed
analysis shows an **After this game** update and a link to progress and practice.
Storage errors leave game review available and clearly report that the coaching
update was not saved.

Tracked themes are mating threats, lost mating attacks, material safety, forcing
moves, opening development, drawn advantages and calculation. Labels use legal
board facts and the engine line; unexplained evaluation losses stay general.
No prose is parsed to infer a weakness. A move matching the previous engine
choice is protected from follow-up search fluctuations. Priorities sum error
severity across the latest ten reports, with each earlier report weighted by
0.85 relative to the next, normalized over the player's own moves. Available
practice buttons and actual moves to revisit accompany each priority. A single
incident is labeled an early signal, not a proven recurring weakness.

The coach score is a transparent heuristic, not Elo or a chess-site accuracy
formula: start at 100, subtract the average move penalty across the player's
moves. Centipawn losses below 50 are ignored; otherwise penalty is loss/5 capped
at 60. Allowing or losing a found forced mate costs 70 separately, not fabricated
centipawns. The recent score aggregates the latest five distinct reviews by
own-move count. Trend compares equal adjacent groups of up to five reports in
first-analysis order and also shows theme errors per 100 own moves. Fewer than
three games or 30 own moves is explicitly provisional. Opponents, positions,
sample size and search settings can all change the estimate. Practice completion
alone does not claim real-game improvement.

Profiles, scores and PGNs stay in this browser/device; clearing site data removes
them. There is no external model, account sync or server storage.

## Game history

Paste a PGN and analyze it, or use **Upload a PGN file** to import a single game.
Successfully parsed games are saved in IndexedDB before analysis completes. The
example button and standalone exercises do not add games to history. Saved PGNs
can be reopened for a fresh Stockfish review, and survive page reloads in the
same browser. Earlier uploads made before this feature must be imported once.

The exact canonical starting FEN and main-line UCI move sequence form a unique
key. Comments, whitespace, annotations, variations, and changed headers cannot
create another copy; identical move sequences from the same initial FEN share
one entry, even if player names or dates differ. The original saved PGN and its
headers are retained. The read and insert use one IndexedDB write transaction,
preventing simultaneous tabs from adding duplicates. Different move sequences
are separate entries. No hash collisions are possible because the canonical
content itself is the key.

History is local to this site, browser and device. Clearing site data removes it;
there is no account sync. Storage failures are reported without interrupting
review. Uploaded PGNs remain local. Saved PGNs are parsed again when reopened,
and metadata is rendered as text. File uploads and pasted PGNs share the existing
200 KB / 1,000 half-move validation.

Opening references: [Italian Game](https://lichess.org/opening/Italian_Game/e4_e5_Nf3_Nc6_Bc4),
[Queen’s Gambit Declined](https://lichess.org/opening/Queens_Gambit_Declined/d4_d5_c4_e6),
and [Sicilian Najdorf](https://lichess.org/opening/Sicilian_Defense_Najdorf_Variation/e4_c5_Nf3_d6_d4_cxd4_Nxd4_Nf6_Nc3_a6).

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
- When the displayed, nonterminal position has a forced-mate evaluation,
  **Try the checkmate** opens a separate practice board. Play the attacking side
  against Stockfish's best defense, including when the defender moves first.
  Legal moves and promotion choices are enforced; alternative mating moves are
  accepted after a fresh search. Undo your turn or start again at any time.
  The solution stays hidden until **Show solution** is selected. Its legal line
  is extended towards mate when the engine's original variation is incomplete;
  any unresolved continuation is labeled honestly. The original coaching note
  also hides the mating line until explicitly revealed.
- **Return to review** restores the same position, perspective, move-list scroll,
  and engine-details state. Any running review pauses during practice and resumes
  on return. Practice never changes the PGN, review positions or cached analyses.
  A finite search that no longer confirms mate offers a takeback; only an actual
  checkmate completes the challenge. Stalemates and draw claims are handled
  separately from winning the attack.
- Estimated losses of 0.50 / 1.00 / 2.00 pawns are labeled inaccuracy / mistake /
  blunder. Losing a found forced mate or allowing a new one is a blunder. Mate
  transitions are excluded from average centipawn loss. These are teaching
  thresholds, not a Chess.com accuracy score. Finite searches, especially the
  fast preset, can miss tactics or change their evaluation with more time.
- Checkmate, stalemate and insufficient material are recognized without
  searching terminal positions. Claimable repetition and fifty-move draws are
  identified separately so a continuing game can still be reviewed.

## Verify

The practice library contains **90 exercises: 30 openings, 30 checkmates and
30 puzzles**. Each card and session shows a specific learning goal. Search,
subject and level filters help find an exercise. Coach recommendations use
the exercises' skill and subject tags, ranked beneath the existing highest
impact weaknesses from analyzed games. Existing reports remain compatible.
Practice completion does not inflate the game-based score. See
[practice sources and metadata](dist/data/PRACTICE-SOURCES.md) for attribution
and the exercise schema.

```sh
npm test
npx playwright install chromium
npm run test:browser
```

The unit tests cover chess rules, score perspective, mate handling and UCI worker
lifecycle. The browser test uses the real WASM engine and a static server under
a project subdirectory to check GitHub Pages asset paths, tactical calculations,
review progress, cancellation, PGN replacement and engine load failures. Mate
practice tests cover real defensive play, alternative mating moves, hidden
solutions, promotion, takebacks, restoration, mobile layout and cancellation.

## Vendored dependencies

`dist/vendor/` is committed so deployment needs no dependency downloads.
`npm run vendor:chess` refreshes chess.js from the locked dependency.
`npm run vendor:stockfish` downloads the pinned official release assets and
verifies their SHA-256 hashes. Do not mix engine JS and WASM versions.

Stockfish is GPLv3; its license, attribution, checksums and links to complete
corresponding source and build instructions are in
[dist/vendor/stockfish/NOTICE.md](dist/vendor/stockfish/NOTICE.md). chess.js is BSD-2-Clause;
its license is in [dist/vendor/chess.js/LICENSE](dist/vendor/chess.js/LICENSE).
