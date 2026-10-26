import test from 'node:test';
import assert from 'node:assert/strict';
import { plotValue, evaluationSegments } from '../dist/js/evaluation-chart.js';

const cp = value => ({ score:{ type:'cp', value } });
test('chart uses real White-normalized evaluations and clips only its plotting range', () => {
  const source = cp(-420); assert.equal(plotValue(source), -300); assert.equal(source.score.value, -420);
  assert.equal(plotValue(cp(160)), 160); assert.equal(plotValue(cp(0)), 0);
  assert.equal(plotValue(null), null); assert.equal(plotValue(cp(NaN)), null);
});
test('mate markers preserve the winner, including terminal mate zero', () => {
  assert.equal(plotValue({ score:{ type:'mate', value:-3 } }), -300);
  assert.equal(plotValue({ score:{ type:'mate', value:0, winner:'white' } }), 300);
  assert.equal(plotValue({ score:{ type:'mate', value:-0, winner:'black' } }), -300);
});
test('pending positions create chart gaps instead of invented interpolated analysis', () => {
  assert.deepEqual(evaluationSegments([cp(30), null, cp(-70), cp(120), null]), [
    [{ ply:0, value:30 }], [{ ply:2, value:-70 }, { ply:3, value:120 }],
  ]);
  assert.deepEqual(evaluationSegments([]), []);
});
