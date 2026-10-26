// Small starter set. More training types can be added without changing the review.
export const mateDrills = [
  { id:'mate-one-white', title:'Mate in one · White', fen:'6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    analysis:{ score:{ type:'mate', value:1 }, bestMove:'e1e8', pv:['e1e8'], depth:0 } },
  { id:'mate-one-black', title:'Mate in one · Black', fen:'4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',
    analysis:{ score:{ type:'mate', value:-1 }, bestMove:'e8e1', pv:['e8e1'], depth:0 } },
  { id:'mate-two', title:'Mate in two', fen:'8/8/8/8/8/3K4/4Q3/k7 w - - 0 1',
    analysis:{ score:{ type:'mate', value:2 }, bestMove:'d3c2', pv:['d3c2', 'a1a2', 'e2a6'], depth:0 } },
];
