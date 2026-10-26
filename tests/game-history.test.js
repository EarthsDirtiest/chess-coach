import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGame } from '../dist/js/chess-review.js';
import { gameIdentity, GameHistory } from '../dist/js/game-history.js';

test('duplicate identity ignores headers, whitespace, comments, annotations and variations', () => {
  const original = parseGame('[White "Alice"]\n[Black "Bob"]\n\n1. e4 e5 2. Nf3 Nc6');
  const copy = parseGame('[White "Different spelling"]\n\n1. e4! {note} (1. d4 d5) e5\n2. Nf3 $1 Nc6 *');
  assert.equal(gameIdentity(original), gameIdentity(copy));
});

test('different moves, an extended game and different starting positions have different identities', () => {
  assert.notEqual(gameIdentity(parseGame('1. e4 e5')), gameIdentity(parseGame('1. e4 c5')));
  assert.notEqual(gameIdentity(parseGame('1. e4 e5')), gameIdentity(parseGame('1. e4 e5 2. Nf3')));
  const one = parseGame('[SetUp "1"]\n[FEN "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1"]\n\n1. Re8#');
  const two = parseGame('[SetUp "1"]\n[FEN "6k1/5ppp/8/8/8/7P/5PP1/4R1K1 w - - 0 1"]\n\n1. Re8#');
  assert.notEqual(gameIdentity(one), gameIdentity(two));
});

test('unavailable persistent storage is reported and retry remains possible', async () => {
  const history = new GameHistory({ indexedDB:null });
  await assert.rejects(history.list(), /does not provide local game storage/);
  await assert.rejects(history.save(parseGame('1. e4'), '1. e4'), /does not provide local game storage/);
});
