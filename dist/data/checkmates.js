// Curated teaching data. Sources and license: PRACTICE-SOURCES.md.
export default [
  {
    "id": "mate-back-rank-one",
    "kind": "mate",
    "title": "Back Rank · Mate in 1",
    "side": "black",
    "fen": "8/R6p/8/2pB4/3b4/2k5/PR1r2PP/7K b - - 0 34",
    "subject": "back-rank",
    "learningGoal": "Use a rook or queen along the back rank while the king’s escape squares are blocked.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "back-rank",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Use a rook or queen along the back rank while the king’s escape squares are blocked.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Use a rook or queen along the back rank while the king’s escape squares are blocked.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -1
      },
      "bestMove": "d2d1",
      "pv": [
        "d2d1"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/06TaJ",
    "sourceThemes": [
      "backRankMate",
      "endgame",
      "mate",
      "mateIn1",
      "oneMove"
    ],
    "sourceRating": 760,
    "sourceId": "06TaJ"
  },
  {
    "id": "mate-back-rank-two",
    "kind": "mate",
    "title": "Back Rank · Mate in 2",
    "side": "black",
    "fen": "3N1rk1/3R1p2/p2n2pq/3p3p/P7/5Q2/1P3PPP/2R3K1 b - - 0 29",
    "subject": "back-rank",
    "learningGoal": "Calculate the back-rank finish through the defender’s reply.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "back-rank",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Calculate the back-rank finish through the defender’s reply.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Calculate the back-rank finish through the defender’s reply.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -2
      },
      "bestMove": "h6c1",
      "pv": [
        "h6c1",
        "f3d1",
        "c1d1"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0DTOh",
    "sourceThemes": [
      "backRankMate",
      "hangingPiece",
      "mate",
      "mateIn2",
      "middlegame",
      "short"
    ],
    "sourceRating": 605,
    "sourceId": "0DTOh"
  },
  {
    "id": "mate-smothered-one",
    "kind": "mate",
    "title": "Smothered Mate · Mate in 1",
    "side": "white",
    "fen": "r5nk/p1p3pp/1p1q4/n3r1N1/8/8/PPPP1PPP/R1B2RK1 w - - 0 19",
    "subject": "smothered-mate",
    "learningGoal": "Spot a knight mate when the king is boxed in by its own pieces.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "smothered-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Spot a knight mate when the king is boxed in by its own pieces.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Spot a knight mate when the king is boxed in by its own pieces.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 1
      },
      "bestMove": "g5f7",
      "pv": [
        "g5f7"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0DhAU",
    "sourceThemes": [
      "mate",
      "mateIn1",
      "middlegame",
      "oneMove",
      "smotheredMate"
    ],
    "sourceRating": 640,
    "sourceId": "0DhAU"
  },
  {
    "id": "mate-smothered-two",
    "kind": "mate",
    "title": "Smothered Mate · Mate in 2",
    "side": "black",
    "fen": "6k1/6pp/p2B4/1p6/4R3/2P4n/P4qPP/R6K b - - 1 28",
    "subject": "smothered-mate",
    "learningGoal": "Prepare the final knight check without giving the trapped king an escape.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "smothered-mate",
      "checking-moves"
    ],
    "difficulty": "intermediate",
    "description": "Prepare the final knight check without giving the trapped king an escape.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Prepare the final knight check without giving the trapped king an escape.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -2
      },
      "bestMove": "f2g1",
      "pv": [
        "f2g1",
        "a1g1",
        "h3f2"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0GpyZ",
    "sourceThemes": [
      "endgame",
      "mate",
      "mateIn2",
      "sacrifice",
      "short",
      "smotheredMate"
    ],
    "sourceRating": 1177,
    "sourceId": "0GpyZ"
  },
  {
    "id": "mate-arabian",
    "kind": "mate",
    "title": "Arabian Mate · Mate in 1",
    "side": "white",
    "fen": "3r1r1k/pp3pbb/2n2N2/2P5/q2P4/P1B2P2/4P3/R3KBNR w KQ - 0 20",
    "subject": "arabian-mate",
    "learningGoal": "Coordinate a rook and knight so the rook’s check and knight’s controls leave no escape.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "arabian-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Coordinate a rook and knight so the rook’s check and knight’s controls leave no escape.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Coordinate a rook and knight so the rook’s check and knight’s controls leave no escape.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 1
      },
      "bestMove": "h1h7",
      "pv": [
        "h1h7"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0FxNY",
    "sourceThemes": [
      "arabianMate",
      "kingsideAttack",
      "mate",
      "mateIn1",
      "middlegame",
      "oneMove"
    ],
    "sourceRating": 711,
    "sourceId": "0FxNY"
  },
  {
    "id": "mate-anastasia",
    "kind": "mate",
    "title": "Anastasia Mate · Mate in 2",
    "side": "black",
    "fen": "4nk1r/p4pp1/2Q1b2p/3r4/P2P4/8/4nBPK/R4R2 b - - 0 26",
    "subject": "anastasia-mate",
    "learningGoal": "Use a knight to cover escape squares while a major piece attacks the king’s file.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "anastasia-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Use a knight to cover escape squares while a major piece attacks the king’s file.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Use a knight to cover escape squares while a major piece attacks the king’s file.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -2
      },
      "bestMove": "d5h5",
      "pv": [
        "d5h5",
        "f2h4",
        "h5h4"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0Db7K",
    "sourceThemes": [
      "anastasiaMate",
      "mate",
      "mateIn2",
      "middlegame",
      "short"
    ],
    "sourceRating": 603,
    "sourceId": "0Db7K"
  },
  {
    "id": "mate-hook",
    "kind": "mate",
    "title": "Hook Mate · Mate in 2",
    "side": "black",
    "fen": "7r/3R4/2p2Pp1/4pkPp/2N1N3/2PK1P2/r5nP/7R b - - 5 34",
    "subject": "hook-mate",
    "learningGoal": "Coordinate rook, knight and nearby support around an exposed king.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "hook-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Coordinate rook, knight and nearby support around an exposed king.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Coordinate rook, knight and nearby support around an exposed king.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -2
      },
      "bestMove": "g2f4",
      "pv": [
        "g2f4",
        "d3e3",
        "a2e2"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/08vK0",
    "sourceThemes": [
      "hookMate",
      "mate",
      "mateIn2",
      "middlegame",
      "short"
    ],
    "sourceRating": 976,
    "sourceId": "08vK0"
  },
  {
    "id": "mate-dovetail",
    "kind": "mate",
    "title": "Dovetail Mate · Mate in 1",
    "side": "white",
    "fen": "rn1q1b1r/5kp1/p2pb2p/8/3Nn3/1Q6/PP3PPP/R1B1K2R w KQ - 0 13",
    "subject": "dovetail-mate",
    "learningGoal": "Find a protected queen check next to a king whose retreat squares are occupied.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "dovetail-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Find a protected queen check next to a king whose retreat squares are occupied.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Find a protected queen check next to a king whose retreat squares are occupied.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 1
      },
      "bestMove": "b3e6",
      "pv": [
        "b3e6"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/06IFD",
    "sourceThemes": [
      "dovetailMate",
      "mate",
      "mateIn1",
      "oneMove",
      "opening"
    ],
    "sourceRating": 723,
    "sourceId": "06IFD"
  },
  {
    "id": "mate-boden",
    "kind": "mate",
    "title": "Bishop Mate · Mate in 1",
    "side": "white",
    "fen": "r2qkb1r/pppbp3/2np1np1/8/8/2NB4/PPPP1PPP/R1BQK2R w KQkq - 0 9",
    "subject": "bishop-mate",
    "learningGoal": "Use the bishops’ crossing diagonals to close the king’s escape routes.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "bishop-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Use the bishops’ crossing diagonals to close the king’s escape routes.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Use the bishops’ crossing diagonals to close the king’s escape routes.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 1
      },
      "bestMove": "d3g6",
      "pv": [
        "d3g6"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0GSpF",
    "sourceThemes": [
      "bodenMate",
      "mate",
      "mateIn1",
      "oneMove",
      "opening"
    ],
    "sourceRating": 721,
    "sourceId": "0GSpF"
  },
  {
    "id": "mate-two-bishops",
    "kind": "mate",
    "title": "Bishop Mate · Mate in 2",
    "side": "black",
    "fen": "2B3k1/2B2ppp/4bn2/1p6/8/6P1/PP2Pb1P/R6K b - - 0 21",
    "subject": "bishop-mate",
    "learningGoal": "Coordinate two bishops so their diagonals cover the king’s flight squares.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "bishop-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Coordinate two bishops so their diagonals cover the king’s flight squares.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Coordinate two bishops so their diagonals cover the king’s flight squares.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -2
      },
      "bestMove": "e6d5",
      "pv": [
        "e6d5",
        "e2e4",
        "d5e4"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0FSCf",
    "sourceThemes": [
      "doubleBishopMate",
      "endgame",
      "mate",
      "mateIn2",
      "short"
    ],
    "sourceRating": 823,
    "sourceId": "0FSCf"
  },
  {
    "id": "mate-opera",
    "kind": "mate",
    "title": "Rook Bishop Mate · Mate in 1",
    "side": "white",
    "fen": "1r6/r4Rp1/k3p2q/2Bp4/P6p/7P/2P3P1/6K1 w - - 0 28",
    "subject": "rook-bishop-mate",
    "learningGoal": "Combine rook and bishop pressure around a confined king.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "rook-bishop-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Combine rook and bishop pressure around a confined king.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Combine rook and bishop pressure around a confined king.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 1
      },
      "bestMove": "f7a7",
      "pv": [
        "f7a7"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/02LWp",
    "sourceThemes": [
      "endgame",
      "mate",
      "mateIn1",
      "oneMove",
      "operaMate"
    ],
    "sourceRating": 625,
    "sourceId": "02LWp"
  },
  {
    "id": "mate-epaulette",
    "kind": "mate",
    "title": "Queen Mate · Mate in 1",
    "side": "white",
    "fen": "rnbkr3/ppp2ppp/8/8/2n1B3/2N5/PPPBK1PP/3R3R w - - 4 14",
    "subject": "queen-mate",
    "learningGoal": "Recognize how the king’s own pieces can block its sideways escape.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "queen-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Recognize how the king’s own pieces can block its sideways escape.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Recognize how the king’s own pieces can block its sideways escape.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 1
      },
      "bestMove": "d2g5",
      "pv": [
        "d2g5"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0GuTp",
    "sourceThemes": [
      "discoveredCheck",
      "doubleCheck",
      "epauletteMate",
      "mate",
      "mateIn1",
      "middlegame",
      "oneMove",
      "pillsburysMate"
    ],
    "sourceRating": 640,
    "sourceId": "0GuTp"
  },
  {
    "id": "mate-pillsbury",
    "kind": "mate",
    "title": "Rook Bishop Mate · Mate in 2",
    "side": "black",
    "fen": "4r1k1/4qp1p/p5p1/1pNQ4/1P3b2/P6P/5PP1/3R2K1 b - - 0 28",
    "subject": "rook-bishop-mate",
    "learningGoal": "Use a rook’s file and bishop support to trap a king behind its pawns.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "rook-bishop-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Use a rook’s file and bishop support to trap a king behind its pawns.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Use a rook’s file and bishop support to trap a king behind its pawns.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -2
      },
      "bestMove": "e7e1",
      "pv": [
        "e7e1",
        "d1e1",
        "e8e1"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0AzjW",
    "sourceThemes": [
      "endgame",
      "mate",
      "mateIn2",
      "pillsburysMate",
      "sacrifice",
      "short"
    ],
    "sourceRating": 600,
    "sourceId": "0AzjW"
  },
  {
    "id": "mate-morphy",
    "kind": "mate",
    "title": "Rook Bishop Mate · Mate in 1",
    "side": "white",
    "fen": "3rr2k/5p1p/p4p2/1p1P3b/3BP3/1B3P2/P3K3/6R1 w - - 0 26",
    "subject": "rook-bishop-mate",
    "learningGoal": "Coordinate rook and bishop lines against a king with limited flight squares.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "rook-bishop-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Coordinate rook and bishop lines against a king with limited flight squares.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Coordinate rook and bishop lines against a king with limited flight squares.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 1
      },
      "bestMove": "d4f6",
      "pv": [
        "d4f6"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/02gEE",
    "sourceThemes": [
      "endgame",
      "mate",
      "mateIn1",
      "morphysMate",
      "oneMove"
    ],
    "sourceRating": 783,
    "sourceId": "02gEE"
  },
  {
    "id": "mate-corner",
    "kind": "mate",
    "title": "Corner Mate · Mate in 1",
    "side": "black",
    "fen": "3kr3/6p1/1np2p2/2P2P1p/1P2pK1P/6P1/1B2R1P1/8 b - - 0 30",
    "subject": "corner-mate",
    "learningGoal": "Use the edge of the board and piece coordination to finish a cornered king.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "corner-mate",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Use the edge of the board and piece coordination to finish a cornered king.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Use the edge of the board and piece coordination to finish a cornered king.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -1
      },
      "bestMove": "b6d5",
      "pv": [
        "b6d5"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0G9Uz",
    "sourceThemes": [
      "cornerMate",
      "endgame",
      "mate",
      "mateIn1",
      "oneMove"
    ],
    "sourceRating": 843,
    "sourceId": "0G9Uz"
  },
  {
    "id": "mate-two-rooks",
    "kind": "mate",
    "title": "Rook Coordination · Mate in 2",
    "side": "black",
    "fen": "6rk/1p4r1/7p/2PbRp2/1P1p4/P2B1P1P/1R1N4/5K2 b - - 0 41",
    "subject": "rook-coordination",
    "learningGoal": "Coordinate two rooks on the opponent’s second rank to close the net.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "rook-coordination",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Coordinate two rooks on the opponent’s second rank to close the net.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Coordinate two rooks on the opponent’s second rank to close the net.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -2
      },
      "bestMove": "g7g1",
      "pv": [
        "g7g1",
        "f1f2",
        "g8g2"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/08kv0",
    "sourceThemes": [
      "blindSwineMate",
      "mate",
      "mateIn2",
      "middlegame",
      "short"
    ],
    "sourceRating": 784,
    "sourceId": "08kv0"
  },
  {
    "id": "mate-double-check",
    "kind": "mate",
    "title": "Double Check · Mate in 1",
    "side": "white",
    "fen": "r2qkb1r/2p1pppp/p4nb1/1N2n3/B2P2P1/7P/PPP5/R1BQK2R w KQkq - 0 12",
    "subject": "double-check",
    "learningGoal": "Use double check so the defender must move the king.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "double-check",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Use double check so the defender must move the king.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Use double check so the defender must move the king.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 1
      },
      "bestMove": "b5c7",
      "pv": [
        "b5c7"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/020iD",
    "sourceThemes": [
      "doubleCheck",
      "mate",
      "mateIn1",
      "middlegame",
      "oneMove"
    ],
    "sourceRating": 691,
    "sourceId": "020iD"
  },
  {
    "id": "mate-discovered-check",
    "kind": "mate",
    "title": "Discovered Check · Mate in 2",
    "side": "black",
    "fen": "5Q2/p5pk/1p2p2p/1R6/2RPp3/2P1q3/5nPP/5BK1 b - - 8 32",
    "subject": "discovered-check",
    "learningGoal": "Move one piece to reveal a checking line and calculate the finish.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "discovered-check",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Move one piece to reveal a checking line and calculate the finish.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Move one piece to reveal a checking line and calculate the finish.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -2
      },
      "bestMove": "f2h3",
      "pv": [
        "f2h3",
        "g1h1",
        "e3g1"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/07OHG",
    "sourceThemes": [
      "discoveredCheck",
      "doubleCheck",
      "endgame",
      "mate",
      "mateIn2",
      "short"
    ],
    "sourceRating": 864,
    "sourceId": "07OHG"
  },
  {
    "id": "mate-sacrifice",
    "kind": "mate",
    "title": "Sacrifice · Mate in 2",
    "side": "black",
    "fen": "4r1k1/5ppp/B1R2b2/5P2/2Q2p1P/pP2qP2/P1P5/1K5R b - - 0 28",
    "subject": "sacrifice",
    "learningGoal": "Calculate a forcing sacrifice all the way through the mating finish.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "sacrifice",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Calculate a forcing sacrifice all the way through the mating finish.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Calculate a forcing sacrifice all the way through the mating finish.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -2
      },
      "bestMove": "e3e1",
      "pv": [
        "e3e1",
        "h1e1",
        "e8e1"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/01244",
    "sourceThemes": [
      "mate",
      "mateIn2",
      "middlegame",
      "queensideAttack",
      "sacrifice",
      "short"
    ],
    "sourceRating": 611,
    "sourceId": "01244"
  },
  {
    "id": "mate-deflect",
    "kind": "mate",
    "title": "Deflection · Mate in 2",
    "side": "white",
    "fen": "4Rbk1/p7/5PK1/1ppr4/8/8/P1P5/8 w - - 0 45",
    "subject": "deflection",
    "learningGoal": "Distract a defender from a critical square before giving mate.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "deflection",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Distract a defender from a critical square before giving mate.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Distract a defender from a critical square before giving mate.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 2
      },
      "bestMove": "f6f7",
      "pv": [
        "f6f7",
        "g8h8",
        "e8f8"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0BqNv",
    "sourceThemes": [
      "advancedPawn",
      "deflection",
      "endgame",
      "mate",
      "mateIn2",
      "short"
    ],
    "sourceRating": 821,
    "sourceId": "0BqNv"
  },
  {
    "id": "mate-attract",
    "kind": "mate",
    "title": "Attraction · Mate in 2",
    "side": "white",
    "fen": "r2q1r1k/1ppb2pp/1n3b2/p6R/P7/1B1P3P/1PP2PP1/R1BQ2K1 w - - 5 21",
    "subject": "attraction",
    "learningGoal": "Draw the king or a defender to a square that enables the mating sequence.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "attraction",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Draw the king or a defender to a square that enables the mating sequence.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Draw the king or a defender to a square that enables the mating sequence.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 2
      },
      "bestMove": "h5h7",
      "pv": [
        "h5h7",
        "h8h7",
        "d1h5"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0CYwL",
    "sourceThemes": [
      "attraction",
      "kingsideAttack",
      "mate",
      "mateIn2",
      "opening",
      "sacrifice",
      "short"
    ],
    "sourceRating": 799,
    "sourceId": "0CYwL"
  },
  {
    "id": "mate-clear-line",
    "kind": "mate",
    "title": "Clearance · Mate in 2",
    "side": "white",
    "fen": "4rrk1/ppp1qpp1/7p/6N1/4N1P1/b2Q3P/P4P2/1R4K1 w - - 0 25",
    "subject": "clearance",
    "learningGoal": "Clear a line or square needed by the mating piece.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "clearance",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Clear a line or square needed by the mating piece.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Clear a line or square needed by the mating piece.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 2
      },
      "bestMove": "e4f6",
      "pv": [
        "e4f6",
        "g7f6",
        "d3h7"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/01LlS",
    "sourceThemes": [
      "clearance",
      "kingsideAttack",
      "mate",
      "mateIn2",
      "middlegame",
      "sacrifice",
      "short"
    ],
    "sourceRating": 870,
    "sourceId": "01LlS"
  },
  {
    "id": "mate-promote",
    "kind": "mate",
    "title": "Promotion · Mate in 2",
    "side": "black",
    "fen": "6k1/p5r1/1p6/2p4p/3b1N2/3P4/PPP2p1P/5R1K b - - 1 35",
    "subject": "promotion",
    "learningGoal": "Include promotion in the mating calculation and choose the finishing piece.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "promotion",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Include promotion in the mating calculation and choose the finishing piece.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Include promotion in the mating calculation and choose the finishing piece.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -2
      },
      "bestMove": "g7g1",
      "pv": [
        "g7g1",
        "f1g1",
        "f2g1q"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0DDeN",
    "sourceThemes": [
      "advancedPawn",
      "endgame",
      "mate",
      "mateIn2",
      "promotion",
      "short"
    ],
    "sourceRating": 802,
    "sourceId": "0DDeN"
  },
  {
    "id": "mate-kingside-three",
    "kind": "mate",
    "title": "Kingside Attack · Mate in 3",
    "side": "black",
    "fen": "r4k1r/2p2p2/pp1p1q1p/3P2pQ/2P1RBB1/5R2/P4PPP/6K1 b - - 0 30",
    "subject": "kingside-attack",
    "learningGoal": "Calculate three attacking moves while covering the king’s escapes.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "kingside-attack",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Calculate three attacking moves while covering the king’s escapes.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Calculate three attacking moves while covering the king’s escapes.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -3
      },
      "bestMove": "f6a1",
      "pv": [
        "f6a1",
        "f4c1",
        "a1c1",
        "e4e1",
        "c1e1"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/058QD",
    "sourceThemes": [
      "kingsideAttack",
      "long",
      "mate",
      "mateIn3",
      "middlegame"
    ],
    "sourceRating": 763,
    "sourceId": "058QD"
  },
  {
    "id": "mate-queenside",
    "kind": "mate",
    "title": "Queenside Attack · Mate in 2",
    "side": "black",
    "fen": "r5k1/3q2p1/Bp2p1Np/2p1P2P/p2r2P1/Q7/PP6/1K3R2 b - - 0 29",
    "subject": "queenside-attack",
    "learningGoal": "Find a forcing finish against a king sheltered on the queenside.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "queenside-attack",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Find a forcing finish against a king sheltered on the queenside.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Find a forcing finish against a king sheltered on the queenside.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -2
      },
      "bestMove": "d4d1",
      "pv": [
        "d4d1",
        "f1d1",
        "d7d1"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/07M8L",
    "sourceThemes": [
      "mate",
      "mateIn2",
      "middlegame",
      "queensideAttack",
      "short"
    ],
    "sourceRating": 659,
    "sourceId": "07M8L"
  },
  {
    "id": "mate-exposed-king",
    "kind": "mate",
    "title": "Exposed King · Mate in 3",
    "side": "white",
    "fen": "3r3k/1pp1b1r1/5N1p/p3P3/1nP2P1q/P7/1P1Q2BP/3R3K w - - 1 25",
    "subject": "exposed-king",
    "learningGoal": "Use checks to restrict an exposed king before delivering the final blow.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "exposed-king",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Use checks to restrict an exposed king before delivering the final blow.",
    "intro": "Play white. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Use checks to restrict an exposed king before delivering the final blow.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": 3
      },
      "bestMove": "d2d8",
      "pv": [
        "d2d8",
        "e7d8",
        "d1d8",
        "g7g8",
        "d8g8"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/0CFuR",
    "sourceThemes": [
      "arabianMate",
      "exposedKing",
      "kingsideAttack",
      "long",
      "mate",
      "mateIn3",
      "middlegame"
    ],
    "sourceRating": 887,
    "sourceId": "0CFuR"
  },
  {
    "id": "mate-queen-rook",
    "kind": "mate",
    "title": "Queen Rook Coordination · Mate in 1",
    "side": "black",
    "fen": "6Q1/2R5/5k1K/8/1r6/8/8/8 b - - 0 55",
    "subject": "queen-rook-coordination",
    "learningGoal": "Coordinate queen and rook checks while covering the king’s remaining escape squares.",
    "targetSkills": [
      "finish",
      "king",
      "calculation"
    ],
    "topics": [
      "queen-rook-coordination",
      "checking-moves"
    ],
    "difficulty": "beginner",
    "description": "Coordinate queen and rook checks while covering the king’s remaining escape squares.",
    "intro": "Play black. Find the mating attack; Stockfish will defend.",
    "finish": "Goal practiced: Coordinate queen and rook checks while covering the king’s remaining escape squares.",
    "analysis": {
      "score": {
        "type": "mate",
        "value": -1
      },
      "bestMove": "b4h4",
      "pv": [
        "b4h4"
      ],
      "depth": 0
    },
    "source": "https://lichess.org/training/02Qrx",
    "sourceThemes": [
      "endgame",
      "mate",
      "mateIn1",
      "oneMove",
      "queenRookEndgame"
    ],
    "sourceRating": 689,
    "sourceId": "02Qrx"
  }
];
