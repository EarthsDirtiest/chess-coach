import extraOpenings from '../data/openings.js';
import extraMates from '../data/checkmates.js';
import extraPuzzles from '../data/puzzles.js';

const starterMates = [
  { id:'mate-one-white', title:'Mate in one · White', fen:'6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    analysis:{ score:{ type:'mate', value:1 }, bestMove:'e1e8', pv:['e1e8'], depth:0 } },
  { id:'mate-one-black', title:'Mate in one · Black', fen:'4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',
    analysis:{ score:{ type:'mate', value:-1 }, bestMove:'e8e1', pv:['e8e1'], depth:0 } },
  { id:'mate-two', title:'Mate in two', fen:'8/8/8/8/8/3K4/4Q3/k7 w - - 0 1',
    analysis:{ score:{ type:'mate', value:2 }, bestMove:'d3c2', pv:['d3c2', 'a1a2', 'e2a6'], depth:0 } },
];

const starterOpenings = [
  { id:'italian', kind:'opening', title:'Italian Game', side:'white',
    description:'Build your center and develop your kingside pieces in a classic open game.',
    intro:'Play the White side of this practice line. The trainer plays prepared replies. Other good opening moves exist.',
    line:['e2e4','e7e5','g1f3','b8c6','f1c4','f8c5','c2c3','g8f6','d2d3'],
    notes:['Take space in the center and open a diagonal for your bishop.', '', 'Develop with a threat to the e5 pawn.', '', 'Bring the bishop to an active diagonal toward f7.', '', 'Support a future d4 push with your c-pawn.', '', 'Support e4 and open the way for your other bishop.'],
    finish:'You built a center, developed your knight and bishop, and prepared to castle. Keep developing before starting an attack.',
    source:'https://lichess.org/opening/Italian_Game/e4_e5_Nf3_Nc6_Bc4' },
  { id:'queens-gambit', kind:'opening', title:'Queen’s Gambit Declined', side:'white',
    description:'Challenge Black’s center and develop into a familiar queen’s pawn setup.',
    intro:'Play White in one Queen’s Gambit Declined line. The trainer follows a prepared response, not every possible defense.',
    line:['d2d4','d7d5','c2c4','e7e6','b1c3','g8f6','c1g5','f8e7','e2e3'],
    notes:['Claim space and control e5 with your d-pawn.', '', 'Challenge the pawn on d5 with your c-pawn.', '', 'Develop and add pressure to d5.', '', 'Pin the f6 knight to the queen while developing your bishop.', '', 'Support d4 and free the f1 bishop.'],
    finish:'Your pieces are developing around the center. Bring out the kingside pieces and make your king safe.',
    source:'https://lichess.org/opening/Queens_Gambit_Declined/d4_d5_c4_e6' },
  { id:'sicilian', kind:'opening', title:'Sicilian Defense', side:'black',
    description:'Play Black and build the first moves of a Najdorf Sicilian setup.',
    intro:'Play Black in this prepared Sicilian line. White moves first. This is one opening route, not a test of every good move.',
    line:['e2e4','c7c5','g1f3','d7d6','d2d4','c5d4','f3d4','g8f6','b1c3','a7a6'],
    notes:['', 'Contest d4 from the flank instead of copying White’s e-pawn move.', '', 'Control e5 and open a diagonal for the c8 bishop.', '', 'Exchange your c-pawn for a central pawn.', '', 'Develop the knight and attack e4.', '', 'Control b5 and keep your queenside structure flexible.'],
    finish:'You reached a Najdorf setup. Continue development and choose a central plan before launching a pawn attack.',
    source:'https://lichess.org/opening/Sicilian_Defense_Najdorf_Variation/e4_c5_Nf3_d6_d4_cxd4_Nxd4_Nf6_Nc3_a6' },
];

const starterPuzzles = [
  { id:'knight-fork', kind:'puzzle', title:'Fork the king and queen', side:'white',
    description:'Use a forcing move to attack two targets, then collect the prize.',
    intro:'Find a knight check that attacks the queen too. The trainer will play one legal king reply.',
    fen:'4k3/7q/8/3N4/8/8/6P1/6K1 w - - 0 1', line:['d5f6','e8e7','f6h7'],
    notes:['Your knight checks the king and attacks h7. Black must answer the check.', '', 'Now take the queen that the king could not save.'],
    finish:'The check gained a tempo, so the queen could not escape the fork.' },
  { id:'pinned-knight', kind:'puzzle', title:'Win a pinned piece', side:'white',
    description:'Use a pin and coordinated pieces to win material safely.',
    intro:'The knight is pinned along the bishop’s diagonal. Find a capture that wins it without losing your piece.',
    fen:'4k3/3n4/8/1B6/8/8/8/3R2K1 w - - 0 1', line:['d1d7'], alternatives:[['b5d7']],
    notes:['Your pieces protect one another, so Black’s king cannot recapture on d7.'],
    finish:'You won the knight while keeping the capturing piece protected.' },
  { id:'loose-queen', kind:'puzzle', title:'Spot the loose queen', side:'white',
    description:'Check the open file and capture an undefended target.',
    intro:'Look along the rook’s file. Which valuable piece has no defender?',
    fen:'6k1/8/8/3q4/8/8/8/3R2K1 w - - 0 1', line:['d1d5'],
    notes:['The rook has a clear path to the undefended queen.'],
    finish:'Before calculating a long combination, check for a simple, safe capture.' },
];

const goals = {
  'mate-one-white':{ side:'white', subject:'back-rank', learningGoal:'Recognize a back-rank mate when pawns block the king’s escape.', targetSkills:['king','finish'], topics:['back-rank','checking-moves'] },
  'mate-one-black':{ side:'black', subject:'back-rank', learningGoal:'Recognize the same back-rank mating pattern from Black’s perspective.', targetSkills:['king','finish'], topics:['back-rank','checking-moves'] },
  'mate-two':{ side:'white', subject:'queen-mate', learningGoal:'Use your king to cover escape squares before finishing with the queen.', targetSkills:['finish','conversion','calculation'], topics:['queen-mate','checking-moves'] },
  italian:{ subject:'development', learningGoal:'Develop the knight and bishop, support e4, and prepare a safe central expansion.', targetSkills:['opening'], topics:['development','central-control'] },
  'queens-gambit':{ subject:'central-control', learningGoal:'Challenge d5 with c4 and develop pieces that increase pressure on the center.', targetSkills:['opening'], topics:['central-control','development','pin'] },
  sicilian:{ subject:'central-control', learningGoal:'Exchange a flank pawn for a central pawn and develop toward the center as Black.', targetSkills:['opening'], topics:['central-control','development'] },
  'knight-fork':{ subject:'fork', learningGoal:'Use a knight check to attack two targets and win the queen on the next move.', targetSkills:['forcing','calculation'], topics:['fork','checking-moves'] },
  'pinned-knight':{ subject:'pin', learningGoal:'Exploit a pin while keeping the capturing piece protected.', targetSkills:['pieces','forcing','conversion'], topics:['pin','piece-safety','capture'] },
  'loose-queen':{ subject:'loose-piece', learningGoal:'Scan open lines for undefended pieces and verify a safe capture.', targetSkills:['pieces'], topics:['loose-piece','piece-safety','capture'] },
};
const enrich = (drill, kind) => ({ ...drill, kind, difficulty:'beginner', ...goals[drill.id] });
export const mateDrills = [...starterMates.map(drill => enrich(drill, 'mate')), ...extraMates];
export const openingDrills = [...starterOpenings.map(drill => enrich(drill, 'opening')), ...extraOpenings];
export const puzzleDrills = [...starterPuzzles.map(drill => enrich(drill, 'puzzle')), ...extraPuzzles];
export const practiceDrills = [...openingDrills, ...mateDrills, ...puzzleDrills];
