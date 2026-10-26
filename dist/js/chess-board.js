const FILES = 'abcdefgh';
// Text presentation avoids mismatched emoji chess pieces on mobile.
const ICON = { K:'♔︎', Q:'♕︎', R:'♖︎', B:'♗︎', N:'♘︎', P:'♙︎', k:'♚︎', q:'♛︎', r:'♜︎', b:'♝︎', n:'♞︎', p:'♟︎' };
const NAMES = { k:'king', q:'queen', r:'rook', b:'bishop', n:'knight', p:'pawn' };
const squareName = value => Array.isArray(value) ? FILES[value[0]] + (8 - value[1]) : value;

export function renderBoard({ element, coords, board, perspective, lastMove, critical = [], onSquare, selected, legalMoves = [], disabled = false }) {
  const flip = perspective === 'black', fragment = document.createDocumentFragment();
  const focused = element.contains(document.activeElement) ? document.activeElement.dataset.square : null;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const xx = flip ? 7 - x : x, yy = flip ? 7 - y : y, piece = board[yy][xx], name = FILES[xx] + (8 - yy);
    const square = document.createElement(onSquare ? 'button' : 'div');
    square.className = 'sq ' + ((x + y) % 2 ? 'dark' : 'light');
    if (lastMove && [lastMove.from, lastMove.to].map(squareName).includes(name)) square.classList.add('last');
    if (critical.includes(name)) square.classList.add('critical');
    const target = legalMoves.some(move => move.from === selected && move.to === name);
    if (selected === name) square.classList.add('practice-selected');
    if (target) square.classList.add(piece === '.' ? 'practice-target' : 'practice-capture');
    const color = piece === piece.toUpperCase() ? 'white' : 'black';
    if (piece !== '.') {
      const span = document.createElement('span'); span.className = 'piece ' + color; span.textContent = ICON[piece]; square.appendChild(span);
    }
    square.title = name;
    if (onSquare) {
      square.type = 'button'; square.dataset.square = name; square.disabled = disabled;
      square.setAttribute('aria-label', `${piece === '.' ? 'Empty square' : color + ' ' + NAMES[piece.toLowerCase()]} on ${name}${target ? ', legal destination' : ''}`);
      square.setAttribute('aria-pressed', String(selected === name)); square.onclick = () => onSquare(name);
    }
    fragment.appendChild(square);
  }
  element.replaceChildren(fragment);
  element.setAttribute('aria-busy', String(Boolean(onSquare && disabled)));
  coords.replaceChildren(...[...(flip ? 'hgfedcba' : FILES)].map(file => { const span = document.createElement('span'); span.textContent = file; return span; }));
  if (focused && !disabled) element.querySelector(`[data-square="${focused}"]`)?.focus({ preventScroll:true });
}
