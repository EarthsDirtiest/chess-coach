const FILES = 'abcdefgh';
const PIECES = new URL('../vendor/pieces/', import.meta.url);
const NAMES = { k:'king', q:'queen', r:'rook', b:'bishop', n:'knight', p:'pawn' };
const squareName = value => Array.isArray(value) ? FILES[value[0]] + (8 - value[1]) : value;

export function renderBoard({ element, coords, ranks, arrow, board, perspective, lastMove, critical = [], onSquare, selected, legalMoves = [], disabled = false }) {
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
      const span = document.createElement('span'), graphic = document.createElement('img');
      span.className = 'piece ' + color;
      graphic.src = new URL((color === 'white' ? 'w' : 'b') + piece.toUpperCase() + '.svg', PIECES).href;
      graphic.alt = ''; graphic.draggable = false; graphic.width = 45; graphic.height = 45;
      span.appendChild(graphic); square.appendChild(span);
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
  ranks?.replaceChildren(...[...(flip ? '12345678' : '87654321')].map(rank => { const span = document.createElement('span'); span.textContent = rank; return span; }));
  if (arrow) {
    const position = value => {
      const name = squareName(value), x = FILES.indexOf(name[0]), y = 8 - Number(name[1]);
      return [(flip ? 7 - x : x) * 12.5 + 6.25, (flip ? 7 - y : y) * 12.5 + 6.25];
    };
    arrow.replaceChildren();
    if (lastMove) {
      const [x1, y1] = position(lastMove.from), [x2, y2] = position(lastMove.to);
      arrow.innerHTML = `<defs><marker id="lastMoveArrowHead" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0L4 2L0 4Z" fill="#24d5a2"/></marker></defs><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#24d5a2" stroke-width="2" opacity=".65" marker-end="url(#lastMoveArrowHead)"/>`;
    }
  }
  if (focused && !disabled) element.querySelector(`[data-square="${focused}"]`)?.focus({ preventScroll:true });
}
