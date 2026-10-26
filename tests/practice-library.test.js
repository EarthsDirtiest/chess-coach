import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../dist/vendor/chess.js/chess.js';
import { mateDrills } from '../dist/js/practice-library.js';

test('starter exercises have legal solutions ending in checkmate for the advertised side', () => {
  assert.equal(new Set(mateDrills.map(drill => drill.id)).size, mateDrills.length);
  for (const drill of mateDrills) {
    const chess = new Chess(drill.fen), attacker = drill.analysis.score.value > 0 ? 'w' : 'b';
    assert.equal(chess.isCheckmate(), false);
    assert.equal(chess.isStalemate(), false);
    assert.equal(chess.turn(), attacker);
    assert.equal(drill.analysis.bestMove, drill.analysis.pv[0]);
    for (const uci of drill.analysis.pv) chess.move({ from:uci.slice(0, 2), to:uci.slice(2, 4), promotion:uci[4] });
    assert.equal(chess.isCheckmate(), true, drill.id);
    assert.notEqual(chess.turn(), attacker);
  }
});

test('mate-in-two exercise really forces mate in two against every legal defense', () => {
  const drill = mateDrills.find(drill => drill.id === 'mate-two'), chess = new Chess(drill.fen);
  assert.equal(chess.moves().some(move => { chess.move(move); const mate = chess.isCheckmate(); chess.undo(); return mate; }), false);
  chess.move({ from:drill.analysis.bestMove.slice(0, 2), to:drill.analysis.bestMove.slice(2, 4) });
  const defenses = chess.moves(); assert.ok(defenses.length);
  for (const defense of defenses) {
    chess.move(defense);
    assert.ok(chess.moves().some(move => { chess.move(move); const mate = chess.isCheckmate(); chess.undo(); return mate; }), defense);
    chess.undo();
  }
});
