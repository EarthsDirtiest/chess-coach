# Practice library

The library contains 30 opening lines, 30 checkmates and 30 tactical puzzles.
The original nine exercises retain their IDs and solutions. Teaching goals,
skill mappings and explanatory notes are authored for Chess Coach.

## Sources

- The 27 additional opening lines use standard opening names and move sequences,
  checked against the [Lichess opening database](https://github.com/lichess-org/chess-openings).
  This database is CC0; its legal text is included in `CC0-1.0.txt`.
- The 27 additional checkmates and 27 additional puzzles are selected from the
  [Lichess puzzle database](https://database.lichess.org/#puzzles), released CC0.
  Each record retains the puzzle ID, source URL, source themes and rating snapshot.
  Ratings are source metadata, not estimates of a Chess Coach player's strength.

The Lichess source FEN precedes the opponent's setup move. The selected records
apply that move before saving the training FEN; their solution starts with the
player's move. No external service is contacted during practice.

## Adding and recommending exercises

Every exercise has a unique `id`, `kind`, `side`, `learningGoal`, `subject`,
`topics`, `targetSkills` and `difficulty`. Skill tags refer to the coach's existing
seven evidence-based categories: king safety, finishing mates, piece safety,
forcing moves, opening play, conversion and calculation. Subject tags refine a
recommendation when a saved report contains matching evidence. Existing reports
without subject evidence continue to use their broad skill. Recommendations
rank matching subjects, opening context and the player's side; the impact of
the underlying game errors still decides which weakness comes first.

Opening and puzzle lines use prepared replies and teach the stated goal. They
do not claim to cover every good legal alternative. Checkmates accept legal
alternative mating moves and use the existing Stockfish defender. Solutions
remain hidden until requested. Practice completion does not change the
game-based coaching score.

Tests replay every prepared line, check distinct positions and goal metadata,
confirm all mate continuations actually end in checkmate, and verify subject
matching. The browser suite completes all 60 prepared exercises, checks all 30
mate positions with the real Stockfish worker, exercises filters and checks
responsive layouts.
