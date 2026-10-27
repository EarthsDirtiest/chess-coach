import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../dist/vendor/chess.js/chess.js';
import { practiceDrills, openingDrills, mateDrills, puzzleDrills } from '../dist/js/practice-library.js';
import { recommendPractices } from '../dist/js/practice-goals.js';
import { skills, buildProfile } from '../dist/js/coach-profile.js';

test('every practice has an actionable learning goal, subject and valid coach skill tags', () => {
  for (const drill of practiceDrills) {
    assert.ok(drill.learningGoal.length >= 40, drill.id);
    assert.ok(drill.subject && drill.topics.includes(drill.subject), drill.id);
    assert.ok(drill.targetSkills.length && drill.targetSkills.every(skill => skills[skill]), drill.id);
    assert.ok(['beginner','intermediate'].includes(drill.difficulty), drill.id);
    assert.ok(['white','black'].includes(drill.side), drill.id);
  }
  for (const key of Object.keys(skills)) assert.ok(practiceDrills.filter(drill => drill.targetSkills.includes(key)).length >= 3, key);
});

test('exercises are distinct positions or opening lines, with traceable real-game sources', () => {
  const positions = [...mateDrills,...puzzleDrills].map(drill => new Chess(drill.fen).fen().split(' ').slice(0,4).join(' '));
  assert.equal(new Set(positions).size, 60);
  assert.equal(new Set(openingDrills.map(drill => drill.line.join(' '))).size, 30);
  const sourced = practiceDrills.filter(drill => drill.sourceId);
  assert.equal(sourced.length, 54);
  assert.equal(new Set(sourced.map(drill => drill.sourceId)).size, 54);
  for (const drill of sourced) {
    assert.equal(drill.source, `https://lichess.org/training/${drill.sourceId}`);
    assert.ok(drill.sourceThemes.length && drill.sourceRating > 0, drill.id);
  }
});

test('recommendations match the diagnosed skill and favor the subject and player side', () => {
  for (const skill of Object.keys(skills)) for (const side of ['white','black']) {
    const ids = recommendPractices({ skill, side });
    assert.equal(ids.length,3);
    for (const id of ids) assert.ok(practiceDrills.find(drill => drill.id === id).targetSkills.includes(skill));
  }
  const fork = recommendPractices({ skill:'forcing', side:'black', topics:['fork'] });
  assert.equal(fork[0], 'puzzle-knight-targets');
  const ending = recommendPractices({ skill:'conversion', side:'black', topics:['rook-endgame'] });
  assert.equal(ending[0], 'puzzle-rook-ending');
  const castle = recommendPractices({ skill:'opening', side:'white', topics:['castle'] });
  assert.equal(castle[0], 'ruy-lopez');
  assert.deepEqual(recommendPractices({ skill:'unknown' }), []);
});

test('saved subject evidence reaches recommendations while older reports remain supported', () => {
  const report = { id:'game',version:1,completed:true,side:'black',ownMoves:20,penalty:20,score:99,firstReviewedAt:1,
    incidents:[{skill:'conversion',topics:['rook-endgame'],cost:20,ply:1}] };
  assert.equal(buildProfile([report]).priorities[0].drills[0], 'puzzle-rook-ending');
  delete report.incidents[0].topics;
  assert.equal(buildProfile([report]).priorities[0].drills.length,3);
});
