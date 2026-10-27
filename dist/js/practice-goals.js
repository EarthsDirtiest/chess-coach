import { practiceDrills } from './practice-library.js';

export const subjectLabel = subject => subject.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');

// Subject evidence is optional: older saved reports still match their broad skill.
// Rank only tagged exercises; no unrelated fallback can enter a recommendation.
export function recommendPractices({ skill, side, topics = [], preferredId, limit = 3 }) {
  const matches = practiceDrills.filter(drill => drill.targetSkills.includes(skill));
  const preferredKind = { king:'mate', finish:'mate', pieces:'puzzle', forcing:'puzzle', opening:'opening', conversion:'puzzle', calculation:'puzzle' }[skill];
  const rank = drill => (drill.id === preferredId ? 12 : 0)
    + drill.topics.filter(topic => topics.includes(topic)).length * 8
    + (drill.kind === preferredKind ? 4 : 0)
    + (drill.side === side ? 3 : 0) + (drill.difficulty === 'beginner' ? 1 : 0);
  return matches.map((drill, order) => ({ drill, order, rank:rank(drill) }))
    .sort((a, b) => b.rank - a.rank || a.order - b.order).slice(0, limit).map(item => item.drill.id);
}
